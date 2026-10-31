import { requireAuth } from './_auth.js';

const MPESA = /^(?:\+?254|0)((?:7|1)\d{8})$/;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const { action, method, phone } = req.body || {};
  // This check is only for formatting; it does not start an STK push or charge.
  if (action === 'validate' && method === 'mpesa') {
    const match = String(phone || '').replace(/[\s-]/g, '').match(MPESA);
    if (!match) return res.status(400).json({ error: 'Enter a valid Kenyan M-Pesa number.' });
    const normalized = `+254${match[1]}`;
    return res.status(200).json({ ok: true, normalized, masked: `${normalized.slice(0, 7)}••••${normalized.slice(-2)}` });
  }

  return res.status(503).json({ error: 'Funding is disabled until a payment provider can confirm settlement. No funds were charged.' });
}
