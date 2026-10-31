import supabase from './db-client.js';
import { requireAuth } from './_auth.js';

const PRICES = { starter: 0, professional: 49, enterprise: 199 };
const PLAN_LABEL = { starter: 'Starter', professional: 'Professional', enterprise: 'Enterprise' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { profile_id, plan, method, crypto_currency, mpesa_phone } = req.body || {};
    const MPESA = /^(?:\+?254|0)((?:7|1)\d{8})$/;

    if (!auth.profile || String(profile_id) !== String(auth.profile.id) || auth.profile.role !== 'owner') return res.status(403).json({ error: 'Brand account required' });
    if (!(plan in PRICES)) return res.status(400).json({ error: 'Valid plan is required' });
    if (PRICES[plan] > 0) return res.status(503).json({ error: 'Paid subscriptions are disabled until verified recurring billing is configured.' });

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', profile_id).maybeSingle();
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    if (profile.plan === plan) return res.status(400).json({ error: `You\u2019re already on the ${PLAN_LABEL[plan]} plan.` });

    const price = PRICES[plan];
    let methodLabel = 'free plan';
    if (price > 0) {
      if (!['stripe', 'paypal', 'crypto', 'mpesa'].includes(method)) {
        return res.status(400).json({ error: 'Pick a payment method: Stripe, PayPal, crypto or M-Pesa.' });
      }
      if (method === 'mpesa') {
        const m = String(mpesa_phone || '').replace(/[\s-]/g, '').match(MPESA);
        if (!m) return res.status(400).json({ error: 'Enter a valid Kenyan M-Pesa number \u2014 e.g. 0712 345 678.' });
        methodLabel = `M-Pesa (+254${m[1].slice(0, 3)}\u2022\u2022\u2022\u2022${m[1].slice(-2)})`;
      } else {
        methodLabel = method === 'crypto'
          ? `${String(crypto_currency || 'USDC').toUpperCase()} (crypto)`
          : method === 'stripe' ? 'Stripe' : 'PayPal';
      }

      await supabase.from('transactions').insert({
        profile_id,
        type: 'subscription',
        amount: -price,
        description: `${PLAN_LABEL[plan]} plan \u2014 monthly subscription via ${methodLabel}`,
        status: 'completed',
      });
    }

    const { data, error } = await supabase.from('profiles').update({ plan }).eq('id', profile_id).select().single();
    if (error) throw error;

    await supabase.from('notifications').insert({
      profile_id,
      title: price > 0 ? `Welcome to ${PLAN_LABEL[plan]} \ud83d\ude80` : `Switched to ${PLAN_LABEL[plan]}`,
      message: price > 0
        ? `Payment of $${price} received via ${methodLabel}. New limits are live \u2014 renews monthly, cancel anytime.`
        : 'Your plan was updated. Paid features are disabled at the end of the cycle.',
      type: 'payment', read: false,
    });

    return res.status(200).json({ profile: data, charged: price, method: methodLabel });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
