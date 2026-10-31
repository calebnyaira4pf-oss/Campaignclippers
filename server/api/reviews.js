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
      const { clipper_id } = req.query;
      if (!clipper_id) return res.status(400).json({ error: 'clipper_id is required' });
      let query = supabase.from('reviews').select('*').order('created_at', { ascending: false });
      if (clipper_id) query = query.eq('clipper_id', clipper_id);
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { clipper_id, campaign_id, rating, comment } = req.body;
      if (!auth.profile || auth.profile.role !== 'owner') return res.status(403).json({ error: 'Brand account required' });
      const { data: campaign } = await supabase.from('campaigns').select('owner_id').eq('id', campaign_id).maybeSingle();
      if (!campaign || String(campaign.owner_id) !== String(auth.profile.id)) return res.status(404).json({ error: 'Campaign not found' });
      const { data: completed } = await supabase.from('submissions').select('id').eq('campaign_id', campaign_id).eq('clipper_id', clipper_id).eq('status', 'approved').limit(1);
      if (!completed?.length) return res.status(400).json({ error: 'A review requires an approved submission from this campaign' });
      const stars = Number(rating);
      if (!Number.isFinite(stars) || stars < 1 || stars > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      const { data, error } = await supabase.from('reviews').insert({
        clipper_id, campaign_id, reviewer_name: auth.profile.name || 'Brand',
        rating: stars, comment: String(comment || '').slice(0, 2000),
      }).select().single();
      if (error) throw error;

      // Recompute average rating
      const { data: all } = await supabase.from('reviews').select('rating').eq('clipper_id', clipper_id);
      if (all && all.length) {
        const avg = all.reduce((a, r) => a + Number(r.rating), 0) / all.length;
        await supabase.from('profiles').update({
          rating: Math.round(avg * 10) / 10,
          rating_count: all.length,
        }).eq('id', clipper_id);
      }
      return res.status(201).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
