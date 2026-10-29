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
      const { id, owner_id, status } = req.query;
      if (owner_id && String(owner_id) !== String(auth.profile?.id)) return res.status(403).json({ error: 'You can only access your own campaigns' });
      if (!id && !owner_id && status && status !== 'active') return res.status(403).json({ error: 'Only active campaigns are public' });
      if (id) {
        const { data, error } = await supabase.from('campaigns').select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Campaign not found' });
        if (data.status !== 'active' && String(data.owner_id) !== String(auth.profile?.id)) return res.status(404).json({ error: 'Campaign not found' });
        const { data: reqs } = await supabase.from('campaign_requirements').select('*').eq('campaign_id', id).maybeSingle();
        return res.status(200).json({ ...data, requirements: reqs || null });
      }
      let query = supabase.from('campaigns').select('*').order('created_at', { ascending: false });
      if (owner_id) query = query.eq('owner_id', owner_id);
      if (owner_id && status) query = query.eq('status', status);
      if (!owner_id) query = query.eq('status', 'active');
      const { data, error } = await query.limit(200);
      if (error) throw error;

      const ids = (data || []).map((c) => c.id);
      let reqRows = [];
      if (ids.length) {
        const { data: r } = await supabase.from('campaign_requirements').select('*').in('campaign_id', ids);
        reqRows = r || [];
      }
      const reqBy = {};
      for (const r of reqRows) reqBy[r.campaign_id] = r;
      return res.status(200).json((data || []).map((c) => ({ ...c, requirements: reqBy[c.id] || null })));
    }

    if (req.method === 'POST') {
      if (auth.profile?.role !== 'owner') return res.status(403).json({ error: 'Brand account required' });
      return res.status(503).json({ error: 'Campaign launch is paused until verified campaign escrow payments are available.' });
    }

    if (req.method === 'PUT') {
      const { id, ...fields } = req.body;
      if (!id) return res.status(400).json({ error: 'id is required' });
      const { data: existing } = await supabase.from('campaigns').select('owner_id,status').eq('id', id).maybeSingle();
      if (!existing || String(existing.owner_id) !== String(auth.profile?.id)) return res.status(404).json({ error: 'Campaign not found' });
      const allowed = ['status', 'title', 'description', 'category', 'deadline', 'max_clippers', 'rules'];
      const updates = Object.fromEntries(Object.entries(fields).filter(([key]) => allowed.includes(key)));
      if (updates.status && !['active', 'paused', 'completed'].includes(updates.status)) return res.status(400).json({ error: 'Invalid campaign status' });
      if (updates.status === 'active' && existing.status !== 'active') return res.status(503).json({ error: 'Campaign activation is paused until verified escrow funding is available.' });
      const { data, error } = await supabase.from('campaigns').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'id is required' });
      const { data: existing } = await supabase.from('campaigns').select('owner_id').eq('id', id).maybeSingle();
      if (!existing || String(existing.owner_id) !== String(auth.profile?.id)) return res.status(404).json({ error: 'Campaign not found' });
      await supabase.from('applications').delete().eq('campaign_id', id);
      await supabase.from('submissions').delete().eq('campaign_id', id);
      await supabase.from('campaign_requirements').delete().eq('campaign_id', id);
      const { error } = await supabase.from('campaigns').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
