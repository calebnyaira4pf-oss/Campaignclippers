import supabase from './db-client.js';
import { requireAuth } from './_auth.js';

const compact = (n) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(n) || 0);
const tierName = (t) => String(t || 'rising').charAt(0).toUpperCase() + String(t || 'rising').slice(1);

// Build a stats-backed application summary from the clipper's real profile —
// no writing required. Brands see verified numbers instead of prose.
async function buildQuickPitch(clipperId, note) {
  const [{ data: p }, { data: accounts }, { data: tierRow }, { data: subs }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', clipperId).maybeSingle(),
    supabase.from('connected_accounts').select('*').eq('profile_id', clipperId),
    supabase.from('clipper_tiers').select('tier,score').eq('profile_id', clipperId).maybeSingle(),
    supabase.from('submissions').select('status').eq('clipper_id', clipperId),
  ]);
  if (!p) return note || 'Quick application';

  const accs = accounts || [];
  const reach = accs.reduce((a, x) => a + Number(x.followers || 0), 0);
  const live = accs.filter((a) => a.status === 'live').length;
  const approved = (subs || []).filter((s) => s.status === 'approved').length;
  const decided = (subs || []).filter((s) => s.status === 'approved' || s.status === 'rejected').length;

  const parts = [];
  parts.push(`\u26a1 Quick apply \u00b7 ${tierName(tierRow?.tier)} tier${p.verified ? ' \u00b7 Verified \u2713' : ''}`);
  if (accs.length) {
    const list = accs.slice(0, 4).map((a) => `${a.label} ${a.handle} (${compact(a.followers)}${a.status === 'live' ? ' live' : ''})`).join(' \u00b7 ');
    parts.push(`${compact(reach)} total reach across ${accs.length} account${accs.length === 1 ? '' : 's'}${live ? ` (${live} live-verified)` : ''}: ${list}`);
  }
  const record = [];
  if (approved > 0) record.push(`${approved} approved clip${approved === 1 ? '' : 's'}${decided >= 3 ? ` (${Math.round((approved / decided) * 100)}% approval)` : ''}`);
  if (Number(p.total_views) > 0) record.push(`${compact(p.total_views)} campaign views`);
  if (Number(p.total_earnings) > 0) record.push(`$${compact(p.total_earnings)} earned`);
  if (Number(p.rating) > 0) record.push(`${Number(p.rating).toFixed(1)}\u2605 brand rating`);
  if (record.length) parts.push(`Track record: ${record.join(' \u00b7 ')}`);
  if (note && String(note).trim()) parts.push(`Note: ${String(note).trim()}`);
  return parts.join('\n');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    if (req.method === 'GET') {
      const { campaign_id, clipper_id, owner_id } = req.query;
      if (!auth.profile) return res.status(403).json({ error: 'Profile required' });
      if (clipper_id && String(clipper_id) !== String(auth.profile.id)) return res.status(403).json({ error: 'You can only view your own applications' });
      if (owner_id && String(owner_id) !== String(auth.profile.id)) return res.status(403).json({ error: 'You can only view your own applications' });
      let query = supabase.from('applications').select('*').order('created_at', { ascending: false });
      if (campaign_id) query = query.eq('campaign_id', campaign_id);
      if (clipper_id) query = query.eq('clipper_id', clipper_id);
      if (owner_id) query = query.eq('owner_id', owner_id);
      if (!campaign_id && !clipper_id && !owner_id) return res.status(400).json({ error: 'A campaign or profile filter is required' });
      if (campaign_id) {
        const { data: campaign } = await supabase.from('campaigns').select('owner_id').eq('id', campaign_id).maybeSingle();
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
        if (String(campaign.owner_id) !== String(auth.profile.id)) query = query.eq('clipper_id', auth.profile.id);
      }
      const { data, error } = await query.limit(200);
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const a = req.body;
      if (auth.profile?.role !== 'clipper') return res.status(403).json({ error: 'Clipper account required' });
      const { data: campaign } = await supabase.from('campaigns').select('id,title,owner_id,status').eq('id', a.campaign_id).maybeSingle();
      if (!campaign || campaign.status !== 'active') return res.status(404).json({ error: 'Active campaign not found' });
      a.clipper_id = auth.profile.id;
      a.owner_id = campaign.owner_id;
      a.campaign_title = campaign.title;
      a.clipper_name = auth.profile.name;
      // Prevent duplicate applications
      const { data: existing } = await supabase.from('applications')
        .select('id').eq('campaign_id', a.campaign_id).eq('clipper_id', a.clipper_id).maybeSingle();
      if (existing) return res.status(400).json({ error: 'You have already applied to this campaign' });

      const pitch = a.quick_apply
        ? await buildQuickPitch(a.clipper_id, a.pitch)
        : (a.pitch || '');

      const { data, error } = await supabase.from('applications').insert({
        campaign_id: a.campaign_id,
        campaign_title: a.campaign_title || '',
        owner_id: a.owner_id,
        clipper_id: a.clipper_id,
        clipper_name: a.clipper_name || '',
        clipper_avatar: a.clipper_avatar || '',
        pitch,
        status: 'pending',
      }).select().single();
      if (error) throw error;

      if (a.owner_id) {
        await supabase.from('notifications').insert({
          profile_id: a.owner_id,
          title: 'New clipper application',
          message: `${a.clipper_name} applied to \u201c${a.campaign_title}\u201d. Review their pitch now.`,
          type: 'application',
          read: false,
        });
      }
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, status } = req.body;
      if (!id) return res.status(400).json({ error: 'id is required' });
      if (!['approved', 'rejected', 'pending'].includes(status)) return res.status(400).json({ error: 'Invalid application status' });
      const { data: application } = await supabase.from('applications').select('owner_id').eq('id', id).maybeSingle();
      if (!application || String(application.owner_id) !== String(auth.profile?.id)) return res.status(404).json({ error: 'Application not found' });
      const { data, error } = await supabase.from('applications').update({ status }).eq('id', id).select().single();
      if (error) throw error;

      if (status === 'approved' || status === 'rejected') {
        await supabase.from('notifications').insert({
          profile_id: data.clipper_id,
          title: status === 'approved' ? 'Application approved \u2705' : 'Application update',
          message: status === 'approved'
            ? `You\u2019re in! Start clipping for \u201c${data.campaign_title}\u201d and submit your first clip.`
            : `Your application to \u201c${data.campaign_title}\u201d wasn\u2019t selected this time.`,
          type: 'application',
          read: false,
        });
      }
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
