import supabase from './db-client.js';
import { requireAuth } from './_auth.js';

const FEE_BY_PLAN = { starter: 0.10, professional: 0.05, enterprise: 0.02 };

async function isAdmin(profileId) {
  if (!profileId) return false;
  const { data } = await supabase.from('platform_admins').select('id').eq('profile_id', profileId).maybeSingle();
  return Boolean(data);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    if (req.method === 'GET') {
      const { check, resource } = req.query;

      if (check) {
        return res.status(200).json({ is_admin: String(check) === String(auth.profile?.id) && await isAdmin(auth.profile?.id) });
      }

      if (!(await isAdmin(auth.profile?.id))) return res.status(403).json({ error: 'Admin access required' });

      if (resource === 'users') {
        const [{ data: profiles }, { data: mods }, { data: tiers }] = await Promise.all([
          supabase.from('profiles').select('*').order('id', { ascending: true }),
          supabase.from('user_moderation').select('*'),
          supabase.from('clipper_tiers').select('profile_id,tier,score'),
        ]);
        const modBy = {};
        for (const m of mods || []) modBy[m.profile_id] = m.status;
        const tierBy = {};
        for (const t of tiers || []) tierBy[t.profile_id] = t;
        return res.status(200).json((profiles || []).map((p) => ({
          ...p,
          moderation: modBy[p.id] || 'active',
          tier: tierBy[p.id]?.tier || null,
          tier_score: tierBy[p.id]?.score ?? null,
        })));
      }

      if (resource === 'campaigns') {
        const { data, error } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return res.status(200).json(data);
      }

      if (resource === 'transactions') {
        const [{ data: txns }, { data: profiles }] = await Promise.all([
          supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(100),
          supabase.from('profiles').select('id,name,role'),
        ]);
        const nameBy = {};
        for (const p of profiles || []) nameBy[p.id] = { name: p.name, role: p.role };
        return res.status(200).json((txns || []).map((t) => ({
          ...t,
          profile_name: nameBy[t.profile_id]?.name || `#${t.profile_id}`,
          profile_role: nameBy[t.profile_id]?.role || '',
        })));
      }

      // overview (default)
      const [{ data: profiles }, { data: campaigns }, { data: subs }, { data: txns }, { data: apps }] = await Promise.all([
        supabase.from('profiles').select('id,role,plan,verified,created_at,total_earnings'),
        supabase.from('campaigns').select('id,title,status,budget,spent,owner_id'),
        supabase.from('submissions').select('id,status,views,created_at'),
        supabase.from('transactions').select('type,amount,status'),
        supabase.from('applications').select('id,status'),
      ]);

      const owners = (profiles || []).filter((p) => p.role === 'owner');
      const clippers = (profiles || []).filter((p) => p.role === 'clipper');
      const planBy = {};
      for (const o of owners) planBy[o.id] = o.plan || 'starter';

      const totalBudget = (campaigns || []).reduce((a, c) => a + Number(c.budget || 0), 0);
      const totalSpent = (campaigns || []).reduce((a, c) => a + Number(c.spent || 0), 0);
      const escrowHeld = totalBudget - totalSpent;
      const platformRevenue = (campaigns || []).reduce((a, c) => {
        const fee = FEE_BY_PLAN[planBy[c.owner_id] || 'starter'] ?? 0.10;
        return a + Number(c.spent || 0) * fee;
      }, 0);

      const planCounts = { starter: 0, professional: 0, enterprise: 0 };
      for (const o of owners) planCounts[o.plan || 'starter'] = (planCounts[o.plan || 'starter'] || 0) + 1;

      const mrr = planCounts.professional * 49 + planCounts.enterprise * 199;
      const totalViews = (subs || []).reduce((a, s) => a + Number(s.views || 0), 0);

      return res.status(200).json({
        stats: {
          users: (profiles || []).length,
          clippers: clippers.length,
          owners: owners.length,
          verified: (profiles || []).filter((p) => p.verified).length,
          campaigns: (campaigns || []).length,
          active_campaigns: (campaigns || []).filter((c) => c.status === 'active').length,
          escrow_held: Math.round(escrowHeld * 100) / 100,
          released: Math.round(totalSpent * 100) / 100,
          platform_revenue: Math.round(platformRevenue * 100) / 100,
          mrr,
          submissions: (subs || []).length,
          pending_submissions: (subs || []).filter((s) => s.status === 'pending').length,
          applications: (apps || []).length,
          total_views: totalViews,
          payouts_processing: (txns || []).filter((t) => t.type === 'payout' && t.status === 'processing').length,
        },
        plan_counts: planCounts,
        spend_by_campaign: (campaigns || [])
          .filter((c) => Number(c.spent) > 0)
          .sort((a, b) => Number(b.spent) - Number(a.spent))
          .slice(0, 8)
          .map((c) => ({ label: c.title, value: Number(c.spent) })),
        submission_status: {
          approved: (subs || []).filter((s) => s.status === 'approved').length,
          pending: (subs || []).filter((s) => s.status === 'pending').length,
          rejected: (subs || []).filter((s) => s.status === 'rejected').length,
        },
      });
    }

    if (req.method === 'PUT') {
      const { action } = req.body || {};
      if (!(await isAdmin(auth.profile?.id))) return res.status(403).json({ error: 'Admin access required' });

      if (action === 'verify') {
        const { profile_id, verified } = req.body;
        const { data, error } = await supabase.from('profiles').update({ verified: Boolean(verified) }).eq('id', profile_id).select().single();
        if (error) throw error;
        return res.status(200).json(data);
      }

      if (action === 'plan') {
        const { profile_id, plan } = req.body;
        if (!['starter', 'professional', 'enterprise'].includes(plan)) return res.status(400).json({ error: 'Invalid plan' });
        const { data, error } = await supabase.from('profiles').update({ plan }).eq('id', profile_id).select().single();
        if (error) throw error;
        await supabase.from('notifications').insert({
          profile_id: Number(profile_id),
          title: `Subscription updated to ${plan.charAt(0).toUpperCase() + plan.slice(1)}`,
          message: 'Your plan was updated by the Campaign Clippers team. New limits are live immediately.',
          type: 'system', read: false,
        });
        return res.status(200).json(data);
      }

      if (action === 'moderation') {
        const { profile_id, status } = req.body;
        if (!['active', 'suspended'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
        const { data: existing } = await supabase.from('user_moderation').select('id').eq('profile_id', profile_id).maybeSingle();
        if (existing) {
          await supabase.from('user_moderation').update({ status, updated_at: new Date().toISOString() }).eq('id', existing.id);
        } else {
          await supabase.from('user_moderation').insert({ profile_id: Number(profile_id), status });
        }
        if (status === 'suspended') {
          await supabase.from('campaigns').update({ status: 'paused' }).eq('owner_id', profile_id).eq('status', 'active');
        }
        await supabase.from('notifications').insert({
          profile_id: Number(profile_id),
          title: status === 'suspended' ? 'Account suspended' : 'Account reinstated',
          message: status === 'suspended'
            ? 'Your account was suspended for a policy review. Contact support@campaignclippers.com to appeal.'
            : 'Your account is active again. Welcome back!',
          type: 'system', read: false,
        });
        return res.status(200).json({ ok: true, status });
      }

      if (action === 'campaign_status') {
        const { campaign_id, status } = req.body;
        if (!['active', 'paused', 'completed'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
        const { data, error } = await supabase.from('campaigns').update({ status }).eq('id', campaign_id).select().single();
        if (error) throw error;
        return res.status(200).json(data);
      }

      if (action === 'campaign_delete') {
        const { campaign_id } = req.body;
        await supabase.from('applications').delete().eq('campaign_id', campaign_id);
        await supabase.from('submissions').delete().eq('campaign_id', campaign_id);
        const { error } = await supabase.from('campaigns').delete().eq('id', campaign_id);
        if (error) throw error;
        return res.status(200).json({ ok: true });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
