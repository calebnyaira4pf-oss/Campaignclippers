import supabase from './db-client.js';
import { requireAuth, requireOwnProfile } from './_auth.js';

const LABELS = { tiktok: 'TikTok', youtube: 'YouTube', instagram: 'Instagram', twitter: 'X / Twitter' };
const label = (p) => LABELS[p] || (p ? p.charAt(0).toUpperCase() + p.slice(1) : '');
const compact = (n) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(n) || 0);

const TIER_ORDER = ['rising', 'bronze', 'silver', 'gold', 'elite'];
const tierRank = (t) => Math.max(0, TIER_ORDER.indexOf(String(t || 'rising')));
const tierName = (t) => String(t || 'rising').charAt(0).toUpperCase() + String(t || 'rising').slice(1);

// Minimum matched-platform reach a campaign expects, derived from its economics.
function minReachFor(c) {
  const budget = Number(c.budget) || 0;
  const cpm = Number(c.cpm_rate) || 0;
  if (cpm >= 6 || budget >= 6000) return 25000;
  if (cpm >= 4 || budget >= 3000) return 10000;
  return 2000;
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
    const { profile_id } = req.query;
    if (!profile_id) return res.status(400).json({ error: 'profile_id is required' });
    if (!requireOwnProfile(auth, res, profile_id)) return;

    const [{ data: profile }, { data: accounts }, { data: verifications }, { data: campaigns }, { data: apps }, { data: allApps }, { data: reqRows }, { data: tierRow }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', profile_id).maybeSingle(),
      supabase.from('connected_accounts').select('*').eq('profile_id', profile_id),
      supabase.from('account_verifications').select('account_id,status'),
      supabase.from('campaigns').select('*').eq('status', 'active').order('created_at', { ascending: false }),
      supabase.from('applications').select('campaign_id,status').eq('clipper_id', profile_id),
      supabase.from('applications').select('campaign_id,status').eq('status', 'approved'),
      supabase.from('campaign_requirements').select('*'),
      supabase.from('clipper_tiers').select('tier,score').eq('profile_id', profile_id).maybeSingle(),
    ]);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const reqBy = {};
    for (const r of reqRows || []) reqBy[r.campaign_id] = r;
    const myTier = tierRow?.tier || 'rising';

    const verifiedAccountIds = new Set((verifications || []).filter((v) => v.status === 'verified').map((v) => String(v.account_id)));
    const accs = (accounts || []).filter((a) => verifiedAccountIds.has(String(a.id)));
    // Aggregate multiple accounts on the same platform: reach sums, engagement averages.
    const accountByPlatform = {};
    for (const a of accs) {
      const cur = accountByPlatform[a.platform];
      if (!cur) {
        accountByPlatform[a.platform] = { followers: Number(a.followers || 0), engagement: Number(a.engagement || 0), count: 1 };
      } else {
        cur.followers += Number(a.followers || 0);
        cur.engagement += Number(a.engagement || 0);
        cur.count += 1;
      }
    }
    for (const k of Object.keys(accountByPlatform)) {
      const v = accountByPlatform[k];
      v.engagement = v.count ? v.engagement / v.count : 0;
    }
    const appByCampaign = {};
    for (const a of apps || []) appByCampaign[a.campaign_id] = a.status;
    const approvedCount = {};
    for (const a of allApps || []) approvedCount[a.campaign_id] = (approvedCount[a.campaign_id] || 0) + 1;

    const bioText = `${profile.bio || ''} ${(profile.portfolio || []).map((p) => p.title || '').join(' ')}`.toLowerCase();
    const missingPlatformDemand = {};
    const results = [];

    for (const c of campaigns || []) {
      const targets = Array.isArray(c.platforms) ? c.platforms : [];
      const matched = targets.filter((p) => accountByPlatform[p]);
      const missing = targets.filter((p) => !accountByPlatform[p]);
      const matchedReach = matched.reduce((s, p) => s + Number(accountByPlatform[p].followers || 0), 0);
      const matchedEng = matched.length
        ? matched.reduce((s, p) => s + Number(accountByPlatform[p].engagement || 0), 0) / matched.length
        : 0;
      const minReach = minReachFor(c);
      const kw = Array.isArray(c.keywords) ? c.keywords : [];
      const nicheHit = bioText.includes(String(c.category || '').toLowerCase()) || kw.some((k) => bioText.includes(String(k).toLowerCase()));
      const slotsLeft = Math.max(0, Number(c.max_clippers || 0) - (approvedCount[c.id] || 0));

      const checks = [];
      const hints = [];
      let score = 0;

      // 1. Platform match — 35 pts
      if (matched.length === targets.length && targets.length > 0) {
        score += 35;
        checks.push({ label: 'Platform match', pass: true, detail: `All target platforms connected (${matched.map(label).join(', ')})` });
      } else if (matched.length > 0) {
        score += 20 + Math.round(10 * (matched.length / Math.max(1, targets.length)));
        checks.push({ label: 'Platform match', pass: true, detail: `${matched.map(label).join(', ')} connected · missing ${missing.map(label).join(', ')}` });
        hints.push(`Connect ${missing.map(label).join(' and ')} to maximize your reach on this campaign.`);
      } else {
        checks.push({ label: 'Platform match', pass: false, detail: `Requires ${targets.map(label).join(' or ')} — none connected` });
        hints.push(`Connect ${targets.map(label).join(' or ')} to become eligible.`);
        for (const p of missing) missingPlatformDemand[p] = (missingPlatformDemand[p] || 0) + 1;
      }

      // 2. Audience reach — 25 pts
      if (matched.length > 0) {
        if (matchedReach >= minReach) {
          score += 25;
          checks.push({ label: 'Audience reach', pass: true, detail: `${compact(matchedReach)} matched followers (needs ${compact(minReach)}+)` });
        } else if (matchedReach >= minReach * 0.5) {
          score += 14;
          checks.push({ label: 'Audience reach', pass: false, detail: `${compact(matchedReach)} of ${compact(minReach)} recommended followers` });
          hints.push(`Grow your matched reach to ${compact(minReach)} — you're ${compact(minReach - matchedReach)} away.`);
        } else {
          score += 5;
          checks.push({ label: 'Audience reach', pass: false, detail: `${compact(matchedReach)} matched followers — this campaign expects ${compact(minReach)}+` });
          hints.push(`Brands running ${label(targets[0])} campaigns at this budget usually expect ${compact(minReach)}+ followers.`);
        }
      } else {
        checks.push({ label: 'Audience reach', pass: false, detail: 'No reach on the target platforms yet' });
      }

      // 3. Engagement — 15 pts
      if (matched.length > 0) {
        if (matchedEng >= 3) {
          score += 15;
          checks.push({ label: 'Engagement rate', pass: true, detail: `${matchedEng.toFixed(1)}% avg on matched accounts` });
        } else {
          score += 6;
          checks.push({ label: 'Engagement rate', pass: false, detail: `${matchedEng.toFixed(1)}% avg — 3%+ recommended` });
          hints.push('Sync your account stats after your next viral clip to lift your engagement score.');
        }
      }

      // 4. Niche fit — 10 pts
      if (nicheHit) {
        score += 10;
        checks.push({ label: 'Niche fit', pass: true, detail: `Your profile matches ${c.category}${kw.length ? ' / #' + kw[0] : ''}` });
      } else {
        score += 3;
        checks.push({ label: 'Niche fit', pass: false, detail: `No ${c.category} signals in your bio or portfolio` });
        hints.push(`Mention ${c.category.toLowerCase()} work in your bio or add a ${c.category.toLowerCase()} clip to your portfolio.`);
      }

      // 5. Reputation — 15 pts
      let rep = 0;
      if (profile.verified) rep += 7; else hints.push('Get verified — verified clippers are approved up to 2x faster.');
      if (Number(profile.rating) >= 4.5) rep += 5;
      else if (Number(profile.rating) > 0) rep += 3;
      if (Number(profile.total_earnings) > 0) rep += 3;
      score += rep;
      checks.push({
        label: 'Reputation',
        pass: rep >= 10,
        detail: `${profile.verified ? 'Verified' : 'Unverified'} · rating ${Number(profile.rating) > 0 ? Number(profile.rating).toFixed(1) : 'n/a'} · ${Number(profile.total_earnings) > 0 ? 'proven track record' : 'no earnings yet'}`,
      });

      // 6. Capacity
      if (slotsLeft === 0) {
        checks.push({ label: 'Open slots', pass: false, detail: 'Campaign is at max approved clippers' });
        score = Math.min(score, 35);
      } else {
        checks.push({ label: 'Open slots', pass: true, detail: `${slotsLeft} of ${c.max_clippers} clipper slots open` });
      }

      // 7. Brand-set requirements — hard gates defined by the campaign owner
      const cr = reqBy[c.id];
      let gatesPassed = true;
      if (cr) {
        if (Number(cr.min_followers) > 0) {
          const pass = matchedReach >= Number(cr.min_followers);
          if (!pass) {
            gatesPassed = false;
            hints.unshift(`This brand requires ${compact(cr.min_followers)}+ followers on the target platforms — you have ${compact(matchedReach)}.`);
          }
          checks.push({ label: 'Brand requirement · followers', pass, detail: `Needs ${compact(cr.min_followers)}+ matched followers · you have ${compact(matchedReach)}` });
        }
        if (cr.min_tier && cr.min_tier !== 'any') {
          const pass = tierRank(myTier) >= tierRank(cr.min_tier);
          if (!pass) {
            gatesPassed = false;
            hints.unshift(`This brand requires ${tierName(cr.min_tier)} tier or above — you're currently ${tierName(myTier)}. Level up on your Verification page.`);
          }
          checks.push({ label: 'Brand requirement · tier', pass, detail: `Needs ${tierName(cr.min_tier)}+ · you are ${tierName(myTier)}` });
        }
        if (cr.verified_only) {
          const pass = Boolean(profile.verified);
          if (!pass) {
            gatesPassed = false;
            hints.unshift('This brand only accepts verified clippers — reach Silver tier (45+ pts) to earn the badge automatically.');
          }
          checks.push({ label: 'Brand requirement · verified', pass, detail: pass ? 'You hold the verified badge' : 'Verified badge required' });
        }
      }

      score = Math.max(0, Math.min(100, Math.round(score)));
      if (!gatesPassed) score = Math.min(score, 35);
      const status = !gatesPassed || matched.length === 0 || slotsLeft === 0
        ? 'ineligible'
        : score >= 70 ? 'qualified' : score >= 40 ? 'partial' : 'ineligible';

      results.push({
        campaign: {
          id: c.id, title: c.title, brand_name: c.brand_name, category: c.category,
          reward_model: c.reward_model, cpm_rate: c.cpm_rate, fixed_rate: c.fixed_rate,
          platforms: targets, thumbnail_url: c.thumbnail_url, budget: c.budget, spent: c.spent,
        },
        score,
        status,
        eligible: status !== 'ineligible',
        requirements: cr ? { min_followers: Number(cr.min_followers) || 0, min_tier: cr.min_tier || 'any', verified_only: Boolean(cr.verified_only) } : null,
        applied: appByCampaign[c.id] || null,
        checks,
        hints: hints.slice(0, 3),
      });
    }

    results.sort((a, b) => b.score - a.score);

    const qualified = results.filter((r) => r.status === 'qualified').length;
    const partial = results.filter((r) => r.status === 'partial').length;
    const totalReach = accs.reduce((s, a) => s + Number(a.followers || 0), 0);
    const avgEng = accs.length ? accs.reduce((s, a) => s + Number(a.engagement || 0), 0) / accs.length : 0;

    const readiness = Math.round(
      Math.min(30, accs.length * 10) +
      Math.min(25, (totalReach / 100000) * 25) +
      Math.min(15, avgEng * 3) +
      (profile.verified ? 15 : 0) +
      Math.min(15, Number(profile.rating || 0) * 3)
    );

    const topHints = [];
    const bestMissing = Object.entries(missingPlatformDemand).sort((a, b) => b[1] - a[1])[0];
    if (bestMissing) topHints.push(`Connect ${label(bestMissing[0])} to unlock ${bestMissing[1]} more campaign${bestMissing[1] === 1 ? '' : 's'}.`);
    if (!profile.verified) topHints.push('Get verified from your Profile — it boosts every match score.');
    if (accs.length === 0) topHints.unshift('Connect your first platform — eligibility is based on your verified reach.');
    if (accs.length > 0 && topHints.length < 2) topHints.push('Keep your stats fresh — hit “Sync stats” on Connections after big posts.');

    return res.status(200).json({
      summary: {
        readiness: Math.max(0, Math.min(100, readiness)),
        connected: accs.length,
        total_reach: totalReach,
        avg_engagement: Math.round(avgEng * 10) / 10,
        qualified,
        partial,
        ineligible: results.length - qualified - partial,
        top_hints: topHints.slice(0, 3),
      },
      results,
    });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
