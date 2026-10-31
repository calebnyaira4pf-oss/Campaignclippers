import supabase from './db-client.js';
import { requireAuth, requireOwnProfile } from './_auth.js';

export const TIERS = [
  { key: 'rising', label: 'Rising', min: 0 },
  { key: 'bronze', label: 'Bronze', min: 25 },
  { key: 'silver', label: 'Silver', min: 45 },
  { key: 'gold', label: 'Gold', min: 65 },
  { key: 'elite', label: 'Elite', min: 85 },
];

const tierFor = (score) => [...TIERS].reverse().find((t) => score >= t.min) || TIERS[0];
const compact = (n) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(n) || 0);

function computeBreakdown(profile, subs, connectionsCount) {
  const views = Number(profile.total_views || 0);
  const earnings = Number(profile.total_earnings || 0);
  const rating = Number(profile.rating || 0);
  const approved = subs.filter((s) => s.status === 'approved').length;
  const decided = subs.filter((s) => s.status === 'approved' || s.status === 'rejected').length;
  const approvalRate = decided > 0 ? Math.round((approved / decided) * 100) : 0;
  const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
  const recent = subs.filter((s) => new Date(s.created_at).getTime() >= cutoff).length;

  const items = [];

  // Views — 25 pts
  let vPts = 0;
  if (views >= 5_000_000) vPts = 25; else if (views >= 1_000_000) vPts = 20; else if (views >= 250_000) vPts = 15; else if (views >= 50_000) vPts = 10; else if (views >= 10_000) vPts = 5; else vPts = Math.round((views / 10_000) * 5);
  items.push({ key: 'views', label: 'Verified views', pts: vPts, max: 25, value: compact(views), hint: views >= 5_000_000 ? null : `Reach ${compact(views >= 1_000_000 ? 5_000_000 : views >= 250_000 ? 1_000_000 : views >= 50_000 ? 250_000 : 50_000)} total views for the next bracket.` });

  // Earnings — 20 pts
  let ePts = 0;
  if (earnings >= 10_000) ePts = 20; else if (earnings >= 5_000) ePts = 16; else if (earnings >= 1_000) ePts = 12; else if (earnings >= 250) ePts = 8; else if (earnings > 0) ePts = 4;
  items.push({ key: 'earnings', label: 'Lifetime earnings', pts: ePts, max: 20, value: `$${compact(earnings)}`, hint: earnings >= 10_000 ? null : 'Escrow-released earnings prove brands trust your work.' });

  // Approved clips — 15 pts
  let cPts = 0;
  if (approved >= 20) cPts = 15; else if (approved >= 10) cPts = 12; else if (approved >= 5) cPts = 9; else if (approved >= 2) cPts = 6; else if (approved >= 1) cPts = 3;
  items.push({ key: 'clips', label: 'Approved clips', pts: cPts, max: 15, value: String(approved), hint: approved >= 20 ? null : `Get ${approved >= 10 ? 20 - approved : approved >= 5 ? 10 - approved : approved >= 2 ? 5 - approved : 2 - approved} more clip(s) approved for the next bracket.` });

  // Approval rate — 10 pts
  let rPts = 0;
  if (decided >= 3) {
    if (approvalRate >= 80) rPts = 10; else if (approvalRate >= 60) rPts = 7; else if (approvalRate >= 40) rPts = 4; else rPts = 2;
  }
  items.push({ key: 'rate', label: 'Approval rate', pts: rPts, max: 10, value: decided >= 3 ? `${approvalRate}%` : 'n/a', hint: decided < 3 ? 'Needs at least 3 reviewed clips to count.' : approvalRate >= 80 ? null : 'Read campaign rules closely — 80%+ approval unlocks full points.' });

  // Activity (30 days) — 10 pts
  let aPts = 0;
  if (recent >= 4) aPts = 10; else if (recent >= 2) aPts = 7; else if (recent >= 1) aPts = 4;
  items.push({ key: 'activity', label: 'Activity (30 days)', pts: aPts, max: 10, value: `${recent} clip${recent === 1 ? '' : 's'}`, hint: recent >= 4 ? null : 'Submit at least 4 clips a month to stay in the top activity bracket.' });

  // Connected platforms — 10 pts
  let pPts = 0;
  if (connectionsCount >= 3) pPts = 10; else if (connectionsCount === 2) pPts = 7; else if (connectionsCount === 1) pPts = 4;
  items.push({ key: 'platforms', label: 'Connected platforms', pts: pPts, max: 10, value: String(connectionsCount), hint: connectionsCount >= 3 ? null : 'Connect 3+ platforms so brands can verify your full reach.' });

  // Rating — 10 pts
  let gPts = 0;
  if (rating >= 4.8) gPts = 10; else if (rating >= 4.5) gPts = 8; else if (rating >= 4) gPts = 6; else if (rating > 0) gPts = 3;
  items.push({ key: 'rating', label: 'Brand rating', pts: gPts, max: 10, value: rating > 0 ? rating.toFixed(1) : 'n/a', hint: rating >= 4.8 ? null : 'Great communication and fast revisions earn 5-star reviews.' });

  const score = Math.max(0, Math.min(100, items.reduce((a, i) => a + i.pts, 0)));
  return { score, items };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const { profile_id, all } = req.query;

    // Batch mode — tiers for every clipper (leaderboard, applications review)
    if (all) {
      const [{ data: profiles }, { data: subs }, { data: accounts }, { data: verifications }] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'clipper'),
        supabase.from('submissions').select('clipper_id,status,created_at'),
        supabase.from('connected_accounts').select('id,profile_id'),
        supabase.from('account_verifications').select('account_id,status'),
      ]);
      const subsBy = {};
      for (const s of subs || []) (subsBy[s.clipper_id] = subsBy[s.clipper_id] || []).push(s);
      const connBy = {};
      const verifiedIds = new Set((verifications || []).filter((v) => v.status === 'verified').map((v) => String(v.account_id)));
      for (const a of accounts || []) if (verifiedIds.has(String(a.id))) connBy[a.profile_id] = (connBy[a.profile_id] || 0) + 1;

      const out = (profiles || []).map((p) => {
        const { score } = computeBreakdown(p, subsBy[p.id] || [], connBy[p.id] || 0);
        const tier = tierFor(score);
        return { profile_id: p.id, score, tier: tier.key, label: tier.label };
      });
      return res.status(200).json(out);
    }

    if (!profile_id) return res.status(400).json({ error: 'profile_id is required' });
    if (!requireOwnProfile(auth, res, profile_id)) return;

    const [{ data: profile }, { data: subs }, { data: accounts }, { data: verifications }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', profile_id).maybeSingle(),
      supabase.from('submissions').select('clipper_id,status,created_at').eq('clipper_id', profile_id),
      supabase.from('connected_accounts').select('id').eq('profile_id', profile_id),
      supabase.from('account_verifications').select('account_id,status'),
    ]);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const verifiedIds = new Set((verifications || []).filter((v) => v.status === 'verified').map((v) => String(v.account_id)));
    const verifiedCount = (accounts || []).filter((a) => verifiedIds.has(String(a.id))).length;
    const { score, items } = computeBreakdown(profile, subs || [], verifiedCount);
    const tier = tierFor(score);
    const idx = TIERS.findIndex((t) => t.key === tier.key);
    const next = TIERS[idx + 1] || null;

    // Persist snapshot
    const { data: existing } = await supabase.from('clipper_tiers').select('id,tier').eq('profile_id', profile_id).maybeSingle();
    if (existing) {
      await supabase.from('clipper_tiers').update({ tier: tier.key, score, breakdown: items, computed_at: new Date().toISOString() }).eq('id', existing.id);
      if (existing.tier !== tier.key && TIERS.findIndex((t) => t.key === tier.key) > TIERS.findIndex((t) => t.key === existing.tier)) {
        await supabase.from('notifications').insert({
          profile_id: Number(profile_id),
          title: `Tier upgrade — you\u2019re now ${tier.label}! \ud83c\udfc5`,
          message: `Your verification score hit ${score}/100. New perks are live on your Verification page.`,
          type: 'system',
          read: false,
        });
      }
    } else {
      await supabase.from('clipper_tiers').insert({ profile_id: Number(profile_id), tier: tier.key, score, breakdown: items, computed_at: new Date().toISOString() });
    }

    // Silver and above earns the verified badge automatically
    const shouldVerify = score >= 45;
    if (shouldVerify !== Boolean(profile.verified)) {
      await supabase.from('profiles').update({ verified: shouldVerify }).eq('id', profile_id);
    }

    return res.status(200).json({
      tier: tier.key,
      label: tier.label,
      score,
      verified: shouldVerify,
      next: next ? { key: next.key, label: next.label, at: next.min, needed: next.min - score } : null,
      tiers: TIERS,
      breakdown: items,
    });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
