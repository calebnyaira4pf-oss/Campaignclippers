// Live USD -> KES exchange rate for M-Pesa flows (real market data).
// Sources are tried in order; result is cached in-memory per lambda instance.

let cache = { rate: null, at: 0 };
const TTL = 30 * 60 * 1000; // 30 min

async function fetchRate() {
  const sources = [
    { url: 'https://open.er-api.com/v6/latest/USD', pick: (d) => d?.rates?.KES },
    { url: 'https://api.frankfurter.app/latest?from=USD&to=KES', pick: (d) => d?.rates?.KES },
  ];
  for (const s of sources) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch(s.url, { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) continue;
      const data = await res.json();
      const rate = Number(s.pick(data));
      if (rate > 0) return rate;
    } catch { /* try next source */ }
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (Date.now() - cache.at > TTL || !cache.rate) {
      const rate = await fetchRate();
      if (rate) cache = { rate, at: Date.now() };
    }
    if (!cache.rate) return res.status(200).json({ ok: false });
    return res.status(200).json({ ok: true, pair: 'USDKES', rate: cache.rate, updated_at: new Date(cache.at).toISOString() });
  } catch (err) {
    console.error('API error:', err);
    return res.status(200).json({ ok: false });
  }
}
