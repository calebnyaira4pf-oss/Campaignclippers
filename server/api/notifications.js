import supabase from './db-client.js';
import { requireAuth, requireOwnProfile } from './_auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    if (req.method === 'GET') {
      const { profile_id } = req.query;
      if (!profile_id) return res.status(400).json({ error: 'profile_id is required' });
      if (!requireOwnProfile(auth, res, profile_id)) return;
      const { data, error } = await supabase.from('notifications').select('*')
        .eq('profile_id', profile_id).order('created_at', { ascending: false }).limit(30);
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      return res.status(405).json({ error: 'Notifications can only be created by trusted application events' });
    }

    if (req.method === 'PUT') {
      const { id, profile_id, all } = req.body;
      if (!requireOwnProfile(auth, res, profile_id)) return;
      if (all && profile_id) {
        const { error } = await supabase.from('notifications').update({ read: true }).eq('profile_id', profile_id);
        if (error) throw error;
        return res.status(200).json({ ok: true });
      }
      if (id) {
        const { data, error } = await supabase.from('notifications').update({ read: true }).eq('id', id).eq('profile_id', auth.profile.id).select().single();
        if (error) throw error;
        return res.status(200).json(data);
      }
      return res.status(400).json({ error: 'id or (profile_id + all) required' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
