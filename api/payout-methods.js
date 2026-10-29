import supabase from './db-client.js';
import { requireAuth, requireOwnProfile } from './_auth.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MPESA = /^(?:\+?254|0)((?:7|1)\d{8})$/;
const CRYPTO_PATTERNS = {
  BTC: /^(bc1[a-z0-9]{25,60}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/,
  ETH: /^0x[a-fA-F0-9]{40}$/,
  USDC: /^0x[a-fA-F0-9]{40}$/,
  SOL: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
};

const mask = (s) => {
  const str = String(s || '');
  if (str.includes('@')) {
    const [u, d] = str.split('@');
    return `${u.slice(0, 2)}\u2026@${d}`;
  }
  return str.length > 12 ? `${str.slice(0, 6)}\u2026${str.slice(-4)}` : str;
};

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
      const { data, error } = await supabase.from('payout_methods').select('*')
        .eq('profile_id', profile_id).order('is_default', { ascending: false }).order('id');
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { profile_id, type, email, address, currency } = req.body || {};
      if (!profile_id || !type) return res.status(400).json({ error: 'profile_id and type are required' });
      if (!requireOwnProfile(auth, res, profile_id)) return;

      let label = '';
      let details = {};
      if (type === 'stripe' || type === 'paypal') {
        const em = String(email || '').trim().toLowerCase();
        if (!EMAIL.test(em)) return res.status(400).json({ error: `Enter the email linked to your ${type === 'stripe' ? 'Stripe' : 'PayPal'} account.` });
        details = { email: em };
        label = `${type === 'stripe' ? 'Stripe' : 'PayPal'} \u00b7 ${mask(em)}`;
      } else if (type === 'crypto') {
        const cur = String(currency || '').toUpperCase();
        const addr = String(address || '').trim();
        if (!CRYPTO_PATTERNS[cur]) return res.status(400).json({ error: 'Pick a supported currency: BTC, ETH, USDC or SOL.' });
        if (!CRYPTO_PATTERNS[cur].test(addr)) {
          return res.status(400).json({ error: `That doesn\u2019t look like a valid ${cur} address \u2014 double-check and paste it again.` });
        }
        details = { currency: cur, address: addr };
        label = `${cur} \u00b7 ${mask(addr)}`;
      } else if (type === 'mpesa') {
        const m = String(req.body.phone || '').replace(/[\s-]/g, '').match(MPESA);
        if (!m) return res.status(400).json({ error: 'Enter a valid Kenyan M-Pesa number \u2014 e.g. 0712 345 678 or +254 712 345 678.' });
        const normalized = `+254${m[1]}`;
        details = { phone: normalized };
        label = `M-Pesa \u00b7 ${normalized.slice(0, 7)}\u2022\u2022\u2022\u2022${normalized.slice(-2)}`;
      } else {
        return res.status(400).json({ error: 'type must be stripe, paypal, crypto or mpesa' });
      }

      const { data: existing } = await supabase.from('payout_methods').select('id').eq('profile_id', profile_id);
      const isDefault = !existing || existing.length === 0;

      const { data, error } = await supabase.from('payout_methods').insert({
        profile_id, type, label, details, is_default: isDefault,
      }).select().single();
      if (error) throw error;

      await supabase.from('notifications').insert({
        profile_id,
        title: 'Payout method added \ud83d\udcb3',
        message: `${label} is ready to receive payouts${isDefault ? ' and set as your default' : ''}.`,
        type: 'payment', read: false,
      });
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, profile_id, action } = req.body || {};
      if (action === 'set_default') {
        if (!id || !profile_id) return res.status(400).json({ error: 'id and profile_id required' });
        if (!requireOwnProfile(auth, res, profile_id)) return;
        const { data: method } = await supabase.from('payout_methods').select('profile_id').eq('id', id).maybeSingle();
        if (!method || String(method.profile_id) !== String(auth.profile.id)) return res.status(404).json({ error: 'Payout method not found' });
        await supabase.from('payout_methods').update({ is_default: false }).eq('profile_id', auth.profile.id);
        const { data, error } = await supabase.from('payout_methods').update({ is_default: true }).eq('id', id).eq('profile_id', auth.profile.id).select().single();
        if (error) throw error;
        return res.status(200).json(data);
      }
      return res.status(400).json({ error: 'Unknown action' });
    }

    if (req.method === 'DELETE') {
      const { id, profile_id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id is required' });
      if (!requireOwnProfile(auth, res, profile_id)) return;
      const { data: victim } = await supabase.from('payout_methods').select('*').eq('id', id).maybeSingle();
      if (!victim || String(victim.profile_id) !== String(auth.profile.id)) return res.status(404).json({ error: 'Payout method not found' });
      const { error } = await supabase.from('payout_methods').delete().eq('id', id).eq('profile_id', auth.profile.id);
      if (error) throw error;
      // Promote another method to default if we removed the default
      if (victim.is_default) {
        const { data: rest } = await supabase.from('payout_methods').select('id').eq('profile_id', auth.profile.id).order('id').limit(1);
        if (rest && rest.length) await supabase.from('payout_methods').update({ is_default: true }).eq('id', rest[0].id);
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
