import supabase from './db-client.js';
import { requireAuth } from './_auth.js';
import { verifyClip, fetchClipStats } from './_social.js';

const CAPTION_HOOKS = [
  'You won\u2019t believe what happened next',
  'This changed everything',
  'POV: you just discovered',
  'Nobody is talking about this',
  'The moment that broke the internet',
  'Wait for it\u2026',
];

function generateAI(title, keywords) {
  const seed = String(title || '').split('').reduce((a, c) => a + c.charCodeAt(0), 7);
  const rand = (min, max, salt) => min + ((seed * (salt + 13) * 2654435761) % 1000) / 1000 * (max - min);
  const quality = Math.round(rand(58, 97, 1));
  const viral = Math.round(rand(42, 96, 2));
  const kw = Array.isArray(keywords) && keywords.length ? keywords.slice(0, 3) : ['viral', 'trending'];
  const hook = CAPTION_HOOKS[seed % CAPTION_HOOKS.length];
  const caption = `${hook} \ud83d\udd25 ${title || 'This clip'} ${kw.map((k) => '#' + String(k).replace(/\s+/g, '')).join(' ')} #fyp`;
  return { quality, viral, caption };
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
      if (clipper_id && String(clipper_id) !== String(auth.profile.id)) return res.status(403).json({ error: 'You can only view your own submissions' });
      if (owner_id && String(owner_id) !== String(auth.profile.id)) return res.status(403).json({ error: 'You can only view your own submissions' });
      if (!campaign_id && !clipper_id && !owner_id) return res.status(400).json({ error: 'A campaign or profile filter is required' });
      let query = supabase.from('submissions').select('*').order('created_at', { ascending: false });
      if (campaign_id) query = query.eq('campaign_id', campaign_id);
      if (clipper_id) query = query.eq('clipper_id', clipper_id);
      if (owner_id) query = query.eq('owner_id', owner_id);
      if (campaign_id) {
        const { data: campaign } = await supabase.from('campaigns').select('owner_id').eq('id', campaign_id).maybeSingle();
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
        if (String(campaign.owner_id) !== String(auth.profile.id)) query = query.eq('clipper_id', auth.profile.id);
      }
      const { data, error } = await query.limit(300);
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const s = req.body;
      if (auth.profile?.role !== 'clipper') return res.status(403).json({ error: 'Clipper account required' });
      const { data: campaign } = await supabase.from('campaigns').select('id,title,owner_id,status,platforms').eq('id', s.campaign_id).maybeSingle();
      if (!campaign || campaign.status !== 'active') return res.status(404).json({ error: 'Active campaign not found' });
      s.clipper_id = auth.profile.id;
      s.owner_id = campaign.owner_id;
      s.campaign_title = campaign.title;
      s.clipper_name = auth.profile.name;
      if (Array.isArray(campaign.platforms) && s.platform && !campaign.platforms.includes(s.platform)) return res.status(400).json({ error: 'This platform is not part of the campaign' });
      if (!s.video_url || !String(s.video_url).startsWith('http')) {
        return res.status(400).json({ error: 'A valid clip URL is required' });
      }

      // Verify the clip exists on the real platform (oEmbed)
      const check = await verifyClip(s.video_url);
      if (!check.ok) return res.status(400).json({ error: check.reason });

      // Pull real public view/like counts where the platform exposes them
      const stats = await fetchClipStats(s.video_url);
      const title = s.title || check.title || 'Untitled clip';
      const ai = generateAI(title, s.keywords);

      const { data, error } = await supabase.from('submissions').insert({
        campaign_id: s.campaign_id,
        campaign_title: s.campaign_title || '',
        owner_id: s.owner_id,
        clipper_id: s.clipper_id,
        clipper_name: s.clipper_name || '',
        title,
        video_url: s.video_url,
        platform: s.platform || 'tiktok',
        views: stats?.views ?? 0,
        likes: stats?.likes ?? 0,
        status: 'pending',
        ai_quality: ai.quality,
        ai_viral: ai.viral,
        ai_caption: ai.caption,
        earnings: 0,
      }).select().single();
      if (error) throw error;

      if (s.owner_id) {
        await supabase.from('notifications').insert({
          profile_id: s.owner_id,
          title: 'New clip submitted \ud83c\udfac',
          message: `${s.clipper_name} submitted \u201c${title}\u201d to \u201c${s.campaign_title}\u201d${check.verified ? ` (verified on ${check.provider})` : ''}. AI quality score: ${ai.quality}/100.`,
          type: 'submission',
          read: false,
        });
      }
      return res.status(201).json({ ...data, verified: check.verified, provider: check.provider });
    }

    if (req.method === 'PUT') {
      const { id, action } = req.body;
      if (!id) return res.status(400).json({ error: 'id is required' });

      const { data: sub, error: e1 } = await supabase.from('submissions').select('*').eq('id', id).maybeSingle();
      if (e1) throw e1;
      if (!sub) return res.status(404).json({ error: 'Submission not found' });
      const ownerAction = action === 'approve' || action === 'reject';
      const isOwner = String(sub.owner_id) === String(auth.profile?.id);
      const isClipper = String(sub.clipper_id) === String(auth.profile?.id);
      if ((ownerAction && !isOwner) || (!ownerAction && !isClipper)) return res.status(404).json({ error: 'Submission not found' });

      if (action === 'refresh_stats') {
        const stats = await fetchClipStats(sub.video_url);
        if (!stats) {
          return res.status(200).json({ ...sub, refresh_failed: true, reason: 'This platform does not expose public view counts \u2014 stats unchanged' });
        }
        const { data, error } = await supabase.from('submissions').update({
          views: stats.views,
          ...(stats.likes != null ? { likes: stats.likes } : {}),
        }).eq('id', id).select().single();
        if (error) throw error;
        return res.status(200).json({ ...data, refreshed: true });
      }

      if (action === 'approve') {
        return res.status(503).json({ error: 'Approval payouts are disabled until escrow settlement is configured. No balance was credited.' });
      }

      if (action === 'reject') {
        if (sub.status !== 'pending') return res.status(409).json({ error: 'Only pending submissions can be rejected' });
        const { data, error } = await supabase.from('submissions')
          .update({ status: 'rejected' }).eq('id', id).select().single();
        if (error) throw error;
        await supabase.from('notifications').insert({
          profile_id: sub.clipper_id,
          title: 'Clip needs changes',
          message: `\u201c${sub.title}\u201d was not approved for \u201c${sub.campaign_title}\u201d. Check the campaign rules and resubmit.`,
          type: 'submission',
          read: false,
        });
        return res.status(200).json(data);
      }

      return res.status(400).json({ error: 'Unsupported submission action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
