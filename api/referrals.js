import supabase from './db-client.js';
import { requireAuth } from './_auth.js';

const REWARD = 10;

function makeCode(name, id) {
  const base = String(name || 'clip').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'CLIP';
  const salt = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${base}-${salt}${id}`;
}

async function getOrCreateCode(profile) {
  const { data: existing } = await supabase.from('referral_codes').select('*').eq('profile_id', profile.id).maybeSingle();
  if (existing) return existing.code;
  let code = makeCode(profile.name, profile.id);
  // ensure uniqueness
  const { data: clash } = await supabase.from('referral_codes').select('id').eq('code', code).maybeSingle();
  if (clash) code = makeCode(profile.name, profile.id) + 'X';
  const { data, error } = await supabase.from('referral_codes').insert({ profile_id: profile.id, code }).select().single();
  if (error) throw error;
  return data.code;
}

// A referral qualifies when the referred user becomes active:
// clippers -> first earnings, owners -> first campaign launched.
async function qualifies(referred) {
  if (!referred) return false;
  if (referred.role === 'owner') {
    const { count } = await supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('owner_id', referred.id);
    return (count || 0) > 0;
  }
  return Number(referred.total_earnings || 0) > 0;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    if (req.method === 'GET') {
      const { profile_id } = req.query;
      if (!profile_id) return res.status(400).json({ error: 'profile_id is required' });
      if (String(profile_id) !== String(auth.profile?.id)) return res.status(403).json({ error: 'You can only view your own referrals' });

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', profile_id).maybeSingle();
      if (!profile) return res.status(404).json({ error: 'Profile not found' });

      const code = await getOrCreateCode(profile);
      const { data: referrals, error } = await supabase.from('referrals').select('*')
        .eq('referrer_id', profile.id).order('created_at', { ascending: false });
      if (error) throw error;

      // Auto-qualify pending referrals whose referred user became active
      const updated = [];
      for (const r of referrals || []) {
        if (r.status !== 'signed_up') { updated.push(r); continue; }
        const { data: referred } = await supabase.from('profiles').select('*').eq('id', r.referred_id).maybeSingle();
        if (await qualifies(referred)) {
          return res.status(503).json({ error: 'Referral cash rewards are paused until verified wallet settlement is configured.' });
          const { data: rew } = await supabase.from('referrals')
            .update({ status: 'rewarded', reward: REWARD }).eq('id', r.id).select().single();
          await supabase.from('transactions').insert({
            profile_id: profile.id,
            type: 'referral',
            amount: REWARD,
            description: `Referral bonus \u2014 ${r.referred_name} became active`,
            status: 'completed',
          });
          await supabase.from('profiles').update({
            balance: Number(profile.balance || 0) + REWARD,
            ...(profile.role === 'clipper' ? { total_earnings: Number(profile.total_earnings || 0) + REWARD } : {}),
          }).eq('id', profile.id);
          profile.balance = Number(profile.balance || 0) + REWARD;
          await supabase.from('notifications').insert({
            profile_id: profile.id,
            title: `Referral bonus earned \u2014 $${REWARD} \ud83c\udf81`,
            message: `${r.referred_name} just became active on Campaign Clippers. $${REWARD} was added to your wallet.`,
            type: 'payment',
            read: false,
          });
          updated.push(rew);
        } else {
          updated.push(r);
        }
      }

      const rewarded = updated.filter((r) => r.status === 'rewarded');
      return res.status(200).json({
        code,
        reward_per_referral: REWARD,
        stats: {
          invited: updated.length,
          active: rewarded.length,
          pending: updated.length - rewarded.length,
          earned: rewarded.reduce((a, r) => a + Number(r.reward || 0), 0),
        },
        referrals: updated,
      });
    }

    if (req.method === 'POST') {
      const { action, code, profile_id } = req.body || {};
      if (action !== 'redeem') return res.status(400).json({ error: 'Unknown action' });
      if (!code || !profile_id) return res.status(400).json({ error: 'code and profile_id are required' });
      if (String(profile_id) !== String(auth.profile?.id)) return res.status(403).json({ error: 'Referral must be redeemed by the signed-in profile' });

      const { data: codeRow } = await supabase.from('referral_codes').select('*').eq('code', String(code).trim().toUpperCase()).maybeSingle();
      if (!codeRow) return res.status(404).json({ error: 'Referral code not found' });
      if (codeRow.profile_id === Number(profile_id)) return res.status(400).json({ error: 'You cannot refer yourself' });

      const { data: dupe } = await supabase.from('referrals').select('id').eq('referred_id', profile_id).maybeSingle();
      if (dupe) return res.status(400).json({ error: 'This account was already referred' });

      const { data: referred } = await supabase.from('profiles').select('*').eq('id', profile_id).maybeSingle();
      if (!referred) return res.status(404).json({ error: 'Profile not found' });

      const { data, error } = await supabase.from('referrals').insert({
        referrer_id: codeRow.profile_id,
        referred_id: referred.id,
        referred_name: referred.name,
        referred_role: referred.role,
        code: codeRow.code,
        status: 'signed_up',
        reward: 0,
      }).select().single();
      if (error) throw error;

      await supabase.from('notifications').insert({
        profile_id: codeRow.profile_id,
        title: 'Your referral link worked \ud83c\udf89',
        message: `${referred.name} signed up with your code. You\u2019ll earn $${REWARD} when they become active.`,
        type: 'system',
        read: false,
      });
      return res.status(201).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
