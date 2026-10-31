import supabase from './db-client.js';
import { requireAuth } from './_auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    if (req.method === 'GET') {
      const { id, user_id, email, role } = req.query;

      if (!auth.profile) {
        if (String(user_id || '') !== auth.user.id || String(email || '').toLowerCase() !== String(auth.user.email || '').toLowerCase()) {
          return res.status(403).json({ error: 'Profile lookup must match the signed-in account' });
        }
      } else if (id && String(id) !== String(auth.profile.id)) {
        return res.status(403).json({ error: 'You can only access your own profile' });
      } else if (user_id && String(user_id) !== auth.user.id) {
        return res.status(403).json({ error: 'You can only access your own profile' });
      } else if (!id && !user_id) {
        return res.status(400).json({ error: 'A profile identifier is required' });
      }

      if (id) {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Profile not found' });
        return res.status(200).json(data);
      }

      if (user_id) {
        let { data, error } = await supabase.from('profiles').select('*').eq('user_id', user_id).maybeSingle();
        if (error) throw error;
        if (!data && email) {
          const { data: byEmail, error: e2 } = await supabase.from('profiles').select('*').eq('email', email).maybeSingle();
          if (e2) throw e2;
          if (byEmail) {
            if (byEmail.user_id && byEmail.user_id !== auth.user.id) return res.status(409).json({ error: 'Email is already linked to another account' });
            const { data: claimed, error: e3 } = await supabase
              .from('profiles').update({ user_id }).eq('id', byEmail.id).select().single();
            if (e3) throw e3;
            data = claimed;
          }
        }
        if (!data) return res.status(404).json({ error: 'Profile not found' });
        return res.status(200).json(data);
      }

      let query = supabase.from('profiles').select('*').order('total_earnings', { ascending: false });
      if (role) query = query.eq('role', role);
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { user_id, email, name, role, avatar_url } = req.body;
      if (!email) return res.status(400).json({ error: 'Email is required' });
      if (String(user_id) !== auth.user.id || String(email).toLowerCase() !== String(auth.user.email || '').toLowerCase()) {
        return res.status(403).json({ error: 'Profile details must match the signed-in account' });
      }
      if (auth.profile) return res.status(409).json({ error: 'A profile already exists for this account' });

      // If a profile already exists for this email, claim it
      const { data: existing } = await supabase.from('profiles').select('*').eq('email', email).maybeSingle();
      if (existing) {
        if (existing.user_id && existing.user_id !== auth.user.id) return res.status(409).json({ error: 'Email is already linked to another account' });
        const { data: claimed, error } = await supabase
          .from('profiles').update({ user_id }).eq('id', existing.id).select().single();
        if (error) throw error;
        return res.status(200).json(claimed);
      }

      const handle = '@' + (name || email.split('@')[0]).toLowerCase().replace(/[^a-z0-9]/g, '');
      const { data, error } = await supabase.from('profiles').insert({
        user_id,
        email,
        name: name || email.split('@')[0],
        handle,
        role: role === 'owner' ? 'owner' : 'clipper',
        avatar_url: avatar_url || '',
        bio: '',
        verified: false,
        rating: 0,
        rating_count: 0,
        total_earnings: 0,
        balance: 0,
        total_views: 0,
        socials: {},
        portfolio: [],
        plan: role === 'owner' ? 'starter' : null,
      }).select().single();
      if (error) throw error;

      await supabase.from('notifications').insert({
        profile_id: data.id,
        title: 'Welcome to Campaign Clippers! \ud83c\udf89',
        message: data.role === 'owner'
          ? 'Your brand workspace is ready. Launch your first campaign to start receiving clips.'
          : 'Your creator profile is live. Browse active campaigns and start earning.',
        type: 'system',
        read: false,
      });

      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, ...fields } = req.body;
      if (!id) return res.status(400).json({ error: 'id is required' });
      if (!auth.profile || String(id) !== String(auth.profile.id)) return res.status(403).json({ error: 'You can only update your own profile' });
      const allowed = ['name', 'handle', 'avatar_url', 'bio', 'socials', 'portfolio'];
      const updates = Object.fromEntries(Object.entries(fields).filter(([key]) => allowed.includes(key)));
      if (!Object.keys(updates).length) return res.status(400).json({ error: 'No editable profile fields provided' });
      const { data, error } = await supabase.from('profiles').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
