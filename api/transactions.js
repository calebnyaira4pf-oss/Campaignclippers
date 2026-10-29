import supabase from './db-client.js';
import { requireAuth } from './_auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    if (req.method === 'GET') {
      if (!auth.profile) return res.status(403).json({ error: 'Profile required' });
      const { profile_id } = req.query;
      if (String(profile_id || '') !== String(auth.profile.id)) {
        return res.status(403).json({ error: 'You can only view your own transactions' });
      }
      const { data, error } = await supabase.from('transactions').select('*')
        .eq('profile_id', auth.profile.id).order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      return res.status(503).json({ error: 'Wallet transactions are unavailable until verified payment and payout providers are configured.' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: 'Unable to load transactions' });
  }
}
