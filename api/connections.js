import supabase from './db-client.js';
import { requireAuth, requireOwnProfile } from './_auth.js';
import { fetchProfileStats, fetchProfileBio, canonicalProfileUrl } from './_social.js';

const makeCode = () => 'CC-' + Math.random().toString(36).slice(2, 8).toUpperCase().replace(/[^A-Z0-9]/g, 'X');

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
      const { data, error } = await supabase.from('connected_accounts').select('*')
        .eq('profile_id', profile_id).order('followers', { ascending: false });
      if (error) throw error;

      // Merge ownership verification state
      const ids = (data || []).map((a) => a.id);
      let verifs = [];
      if (ids.length) {
        const { data: v } = await supabase.from('account_verifications').select('*').in('account_id', ids);
        verifs = v || [];
      }
      const vBy = {};
      for (const v of verifs) vBy[v.account_id] = v;
      return res.status(200).json((data || []).map((a) => ({
        ...a,
        ownership: vBy[a.id]?.status || 'none',
        verify_code: vBy[a.id]?.status === 'pending' ? vBy[a.id].code : null,
      })));
    }

    if (req.method === 'POST') {
      const { profile_id, platform, label, handle, url } = req.body;
      if (!profile_id || !platform) return res.status(400).json({ error: 'profile_id and platform are required' });
      if (!requireOwnProfile(auth, res, profile_id)) return;
      if (!handle || !String(handle).trim()) return res.status(400).json({ error: 'Handle is required' });
      const key = String(platform).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      if (!key) return res.status(400).json({ error: 'Invalid platform name' });

      // Multiple accounts per platform are allowed — only the exact same
      // handle on the same platform is a duplicate.
      const normHandle = String(handle).trim().replace(/^@/, '').toLowerCase();
      const { data: sameplatform } = await supabase.from('connected_accounts')
        .select('id,handle').eq('profile_id', profile_id).eq('platform', key);
      const dupe = (sameplatform || []).find(
        (a) => String(a.handle || '').trim().replace(/^@/, '').toLowerCase() === normHandle
      );
      if (dupe) return res.status(400).json({ error: `@${normHandle} is already connected on this platform. Add a different handle to link another account.` });

      const profileUrl = (url && String(url).startsWith('http') ? String(url).trim() : '') || canonicalProfileUrl(key, handle);

      const { data, error } = await supabase.from('connected_accounts').insert({
        profile_id,
        platform: key,
        label: label || platform,
        handle: String(handle).trim(),
        url: profileUrl,
        // Never use caller supplied follower counts for eligibility or tiers.
        followers: 0,
        engagement: 0,
        status: 'pending',
        last_synced: new Date().toISOString(),
      }).select().single();
      if (error) throw error;

      await supabase.from('notifications').insert({
        profile_id,
        title: `${data.label} connected`,
        message: 'Verify account ownership to sync stats and use this account for eligibility.',
        type: 'system',
        read: false,
      });

      return res.status(201).json({ ...data, live: false, reason: 'Verify account ownership before stats can be used.' });
    }

    if (req.method === 'PUT') {
      const { id, action } = req.body;
      if (!id) return res.status(400).json({ error: 'id is required' });
      const { data: owned } = await supabase.from('connected_accounts').select('profile_id').eq('id', id).maybeSingle();
      if (!owned || String(owned.profile_id) !== String(auth.profile?.id)) return res.status(404).json({ error: 'Account not found' });

      if (action === 'start_ownership') {
        const { data: acc } = await supabase.from('connected_accounts').select('*').eq('id', id).maybeSingle();
        if (!acc) return res.status(404).json({ error: 'Account not found' });
        const { data: existing } = await supabase.from('account_verifications').select('*').eq('account_id', id).maybeSingle();
        if (existing?.status === 'verified') return res.status(200).json({ code: existing.code, status: 'verified' });
        if (existing) return res.status(200).json({ code: existing.code, status: 'pending' });
        const code = makeCode();
        const { error } = await supabase.from('account_verifications').insert({ account_id: id, code, status: 'pending' });
        if (error) throw error;
        return res.status(200).json({ code, status: 'pending' });
      }

      if (action === 'check_ownership') {
        const { data: acc } = await supabase.from('connected_accounts').select('*').eq('id', id).maybeSingle();
        if (!acc) return res.status(404).json({ error: 'Account not found' });
        const { data: verif } = await supabase.from('account_verifications').select('*').eq('account_id', id).maybeSingle();
        if (!verif) return res.status(400).json({ error: 'Start verification first' });
        if (verif.status === 'verified') return res.status(200).json({ verified: true, already: true });

        const bio = await fetchProfileBio(acc.platform, acc.handle);
        if (!bio.ok) return res.status(200).json({ verified: false, reason: bio.reason });

        const found = String(bio.bio || '').toUpperCase().includes(String(verif.code).toUpperCase());
        if (!found) {
          return res.status(200).json({
            verified: false,
            reason: `We read your real ${bio.where} but the code isn\u2019t there yet. Save your bio and try again \u2014 platforms can take a minute to update.`,
          });
        }

        const stats = await fetchProfileStats(acc.platform, acc.handle);
        await supabase.from('account_verifications').update({ status: 'verified', verified_at: new Date().toISOString() }).eq('id', verif.id);
        if (stats.ok) {
          await supabase.from('connected_accounts').update({
            followers: Number(stats.followers) || 0,
            status: 'live',
            url: acc.url || stats.url || canonicalProfileUrl(acc.platform, acc.handle),
            last_synced: new Date().toISOString(),
          }).eq('id', id).eq('profile_id', auth.profile.id);
        }
        await supabase.from('notifications').insert({
          profile_id: acc.profile_id,
          title: `${acc.label} ownership verified \ud83d\udd10`,
          message: `We found your code in your real ${bio.where}. This account is now proven yours \u2014 you can remove the code from your bio.`,
          type: 'system',
          read: false,
        });
        return res.status(200).json({ verified: true, where: bio.where });
      }

      if (action === 'sync') {
        const { data: acc, error: e1 } = await supabase.from('connected_accounts').select('*').eq('id', id).maybeSingle();
        if (e1) throw e1;
        if (!acc) return res.status(404).json({ error: 'Account not found' });
        const { data: ownership } = await supabase.from('account_verifications').select('status').eq('account_id', id).maybeSingle();
        if (ownership?.status !== 'verified') return res.status(403).json({ error: 'Verify account ownership before syncing stats' });

        const live = await fetchProfileStats(acc.platform, acc.handle);
        if (!live.ok) {
          // Even when live sync fails, make sure the profile URL is usable
          if (!acc.url) {
            const fallback = canonicalProfileUrl(acc.platform, acc.handle);
            if (fallback) await supabase.from('connected_accounts').update({ url: fallback }).eq('id', id);
          }
          return res.status(200).json({ ...acc, sync_failed: true, reason: live.reason });
        }
        const growth = Number(live.followers) - Number(acc.followers || 0);
        const { data, error } = await supabase.from('connected_accounts').update({
          followers: Number(live.followers),
          status: 'live',
          url: acc.url || live.url || canonicalProfileUrl(acc.platform, acc.handle),
          last_synced: new Date().toISOString(),
        }).eq('id', id).select().single();
        if (error) throw error;
        return res.status(200).json({ ...data, growth, api: live.api });
      }

      return res.status(400).json({ error: 'Unsupported account action' });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'id is required' });
      const { error } = await supabase.from('connected_accounts').delete().eq('id', id).eq('profile_id', auth.profile?.id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
