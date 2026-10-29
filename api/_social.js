// Real social-platform data layer.
// Pulls live public stats directly from platform endpoints (no keys required),
// and automatically upgrades to official APIs when secrets are configured:
//   YOUTUBE_API_KEY, TWITTER_BEARER_TOKEN, TWITCH_CLIENT_ID + TWITCH_CLIENT_SECRET

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function get(url, { headers = {}, timeout = 6500, json = false } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9', ...headers },
      signal: ctrl.signal,
      redirect: 'follow',
    });
    let body = null;
    if (json) {
      try { body = await res.json(); } catch { body = null; }
    } else {
      body = await res.text();
    }
    return { status: res.status, ok: res.ok, body };
  } catch (e) {
    return { status: 0, ok: false, body: null, error: e.message };
  } finally {
    clearTimeout(t);
  }
}

export function parseCompact(s) {
  if (s == null) return 0;
  const str = String(s).trim().replace(/,/g, '');
  const m = str.match(/^([\d.]+)\s*([KMB])?/i);
  if (!m) return 0;
  const n = parseFloat(m[1]) || 0;
  const mult = { K: 1e3, M: 1e6, B: 1e9 }[(m[2] || '').toUpperCase()] || 1;
  return Math.round(n * mult);
}

const cleanHandle = (h) => String(h || '').trim().replace(/^@/, '').replace(/\s+/g, '');

// Canonical public profile URL for every supported platform — guarantees the
// \u201cView profile\u201d button always opens the user's real account on the web.
export function canonicalProfileUrl(platform, handle) {
  const h = cleanHandle(handle);
  if (!h) return '';
  const p = String(platform || '').toLowerCase();
  const map = {
    youtube: `https://www.youtube.com/@${h}`,
    tiktok: `https://www.tiktok.com/@${h}`,
    instagram: `https://www.instagram.com/${h}`,
    twitter: `https://x.com/${h}`,
    x: `https://x.com/${h}`,
    twitch: `https://www.twitch.tv/${h}`,
    facebook: `https://www.facebook.com/${h}`,
    linkedin: `https://www.linkedin.com/in/${h}`,
    snapchat: `https://www.snapchat.com/add/${h}`,
    pinterest: `https://www.pinterest.com/${h}`,
    threads: `https://www.threads.net/@${h}`,
    reddit: `https://www.reddit.com/user/${h.replace(/^u\//, '')}`,
    kick: `https://kick.com/${h}`,
    rumble: `https://rumble.com/user/${h}`,
  };
  return map[p] || '';
}

// ---------------------------------------------------------------- profiles

async function youtubeStats(handle) {
  const h = cleanHandle(handle);
  const key = process.env.YOUTUBE_API_KEY;
  if (key) {
    const r = await get(`https://www.googleapis.com/youtube/v3/channels?part=statistics&forHandle=${encodeURIComponent(h)}&key=${key}`, { json: true });
    const c = r.body?.items?.[0];
    if (c) return { ok: true, followers: Number(c.statistics?.subscriberCount || 0), url: `https://youtube.com/@${h}`, api: 'YouTube Data API' };
  }
  const r = await get(`https://www.youtube.com/@${encodeURIComponent(h)}/about`);
  if (r.status === 404) return { ok: false, reason: `YouTube channel @${h} not found` };
  if (!r.ok || !r.body) return { ok: false, reason: 'YouTube did not respond \u2014 try again shortly' };
  const m =
    r.body.match(/"subscriberCountText":\{"simpleText":"([^"]+?)\s+subscribers"/) ||
    r.body.match(/"subscriberCountText":\{[^}]*?"content":"([^"]+?)\s+subscribers"/) ||
    r.body.match(/([\d.,]+[KMB]?)\s+subscribers/i);
  if (m) return { ok: true, followers: parseCompact(m[1]), url: `https://youtube.com/@${h}`, api: 'YouTube public data' };
  return { ok: false, reason: 'Could not read public subscriber count' };
}

async function tiktokStats(handle) {
  const h = cleanHandle(handle);
  const r = await get(`https://www.tiktok.com/@${encodeURIComponent(h)}`);
  if (r.status === 404) return { ok: false, reason: `TikTok account @${h} not found` };
  if (!r.ok || !r.body) return { ok: false, reason: 'TikTok did not respond \u2014 try again shortly' };
  const m = r.body.match(/"followerCount":(\d+)/);
  if (m) return { ok: true, followers: Number(m[1]), url: `https://tiktok.com/@${h}`, api: 'TikTok public data' };
  return { ok: false, reason: 'Could not read public follower count' };
}

async function instagramStats(handle) {
  const h = cleanHandle(handle);
  const r = await get(`https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(h)}`, {
    headers: { 'x-ig-app-id': '936619743392459' },
    json: true,
  });
  const count = r.body?.data?.user?.edge_followed_by?.count;
  if (typeof count === 'number') return { ok: true, followers: count, url: `https://instagram.com/${h}`, api: 'Instagram public data' };
  if (r.status === 404) return { ok: false, reason: `Instagram account @${h} not found` };
  return { ok: false, reason: 'Instagram stats unavailable right now' };
}

async function twitterStats(handle) {
  const h = cleanHandle(handle);
  const token = process.env.TWITTER_BEARER_TOKEN;
  if (token) {
    const r = await get(`https://api.twitter.com/2/users/by/username/${encodeURIComponent(h)}?user.fields=public_metrics`, {
      headers: { authorization: `Bearer ${token}` }, json: true,
    });
    const u = r.body?.data;
    if (u) return { ok: true, followers: Number(u.public_metrics?.followers_count || 0), url: `https://x.com/${h}`, api: 'X API v2' };
    if (r.body?.errors) return { ok: false, reason: `X account @${h} not found` };
  }
  return { ok: false, reason: 'X requires the TWITTER_BEARER_TOKEN secret for live stats' };
}

async function twitchStats(handle) {
  const h = cleanHandle(handle);
  const id = process.env.TWITCH_CLIENT_ID;
  const secret = process.env.TWITCH_CLIENT_SECRET;
  if (id && secret) {
    const tok = await get(`https://id.twitch.tv/oauth2/token?client_id=${id}&client_secret=${secret}&grant_type=client_credentials`, { json: true, timeout: 5000 });
    const access = tok.body?.access_token;
    if (access) {
      const u = await get(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(h)}`, {
        headers: { 'client-id': id, authorization: `Bearer ${access}` }, json: true,
      });
      const user = u.body?.data?.[0];
      if (!user) return { ok: false, reason: `Twitch channel ${h} not found` };
      const f = await get(`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${user.id}&first=1`, {
        headers: { 'client-id': id, authorization: `Bearer ${access}` }, json: true,
      });
      return { ok: true, followers: Number(f.body?.total || 0), url: `https://twitch.tv/${h}`, api: 'Twitch Helix API' };
    }
  }
  // DecAPI is a long-running public stats service for Twitch
  const r = await get(`https://decapi.me/twitch/followcount/${encodeURIComponent(h)}`);
  const n = parseInt(String(r.body || '').trim(), 10);
  if (r.ok && Number.isFinite(n)) return { ok: true, followers: n, url: `https://twitch.tv/${h}`, api: 'Twitch public data' };
  if (r.ok) return { ok: false, reason: String(r.body || '').slice(0, 80) || `Twitch channel ${h} not found` };
  return { ok: false, reason: 'Twitch stats unavailable right now' };
}

async function redditStats(handle) {
  const h = cleanHandle(handle).replace(/^u\//, '');
  const r = await get(`https://www.reddit.com/user/${encodeURIComponent(h)}/about.json`, { json: true });
  const d = r.body?.data;
  if (d) return { ok: true, followers: Number(d.subreddit?.subscribers ?? d.total_karma ?? 0), url: `https://reddit.com/user/${h}`, api: 'Reddit public API' };
  if (r.status === 404) return { ok: false, reason: `Reddit user u/${h} not found` };
  return { ok: false, reason: 'Reddit stats unavailable right now' };
}

const PROFILE_FETCHERS = {
  youtube: youtubeStats,
  tiktok: tiktokStats,
  instagram: instagramStats,
  twitter: twitterStats,
  x: twitterStats,
  twitch: twitchStats,
  reddit: redditStats,
};

export async function fetchProfileStats(platform, handle) {
  const fn = PROFILE_FETCHERS[String(platform || '').toLowerCase()];
  if (!fn) return { ok: false, reason: `No live-stats integration for ${platform} yet \u2014 saved as self-reported` };
  try {
    return await fn(handle);
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

// ------------------------------------------------------- ownership (bio code)

const unescapeJson = (s) => {
  try { return JSON.parse('"' + s + '"'); } catch { return s; }
};

export async function fetchProfileBio(platform, handle) {
  const h = cleanHandle(handle);
  const p = String(platform || '').toLowerCase();
  try {
    if (p === 'youtube') {
      const r = await get(`https://www.youtube.com/@${encodeURIComponent(h)}/about`);
      if (r.ok && r.body) {
        const m = r.body.match(/"description":"((?:[^"\\]|\\.)*)"/);
        if (m) return { ok: true, bio: unescapeJson(m[1]), where: 'channel description' };
      }
      return { ok: false, reason: 'Could not read your YouTube channel description' };
    }
    if (p === 'tiktok') {
      const r = await get(`https://www.tiktok.com/@${encodeURIComponent(h)}`);
      if (r.ok && r.body) {
        const m = r.body.match(/"signature":"((?:[^"\\]|\\.)*)"/);
        if (m) return { ok: true, bio: unescapeJson(m[1]), where: 'TikTok bio' };
      }
      return { ok: false, reason: 'Could not read your TikTok bio' };
    }
    if (p === 'instagram') {
      const r = await get(`https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(h)}`, {
        headers: { 'x-ig-app-id': '936619743392459' }, json: true,
      });
      const bio = r.body?.data?.user?.biography;
      if (typeof bio === 'string') return { ok: true, bio, where: 'Instagram bio' };
      return { ok: false, reason: 'Could not read your Instagram bio' };
    }
    if (p === 'reddit') {
      const r = await get(`https://www.reddit.com/user/${encodeURIComponent(h.replace(/^u\//, ''))}/about.json`, { json: true });
      const bio = r.body?.data?.subreddit?.public_description;
      if (typeof bio === 'string') return { ok: true, bio, where: 'Reddit profile description' };
      return { ok: false, reason: 'Could not read your Reddit profile description' };
    }
    if (p === 'twitter' || p === 'x') {
      const token = process.env.TWITTER_BEARER_TOKEN;
      if (token) {
        const r = await get(`https://api.twitter.com/2/users/by/username/${encodeURIComponent(h)}?user.fields=description`, {
          headers: { authorization: `Bearer ${token}` }, json: true,
        });
        const bio = r.body?.data?.description;
        if (typeof bio === 'string') return { ok: true, bio, where: 'X bio' };
      }
      return { ok: false, reason: 'X bio checks require the TWITTER_BEARER_TOKEN secret' };
    }
    return { ok: false, reason: `Bio verification isn\u2019t available for ${platform} yet` };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

// ------------------------------------------------------------------- clips

const OEMBED = [
  { test: /youtube\.com|youtu\.be/i, url: (u) => `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(u)}`, provider: 'YouTube' },
  { test: /tiktok\.com/i, url: (u) => `https://www.tiktok.com/oembed?url=${encodeURIComponent(u)}`, provider: 'TikTok' },
  { test: /twitter\.com|x\.com/i, url: (u) => `https://publish.twitter.com/oembed?url=${encodeURIComponent(u)}`, provider: 'X' },
  { test: /vimeo\.com/i, url: (u) => `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(u)}`, provider: 'Vimeo' },
];

export async function verifyClip(url) {
  const entry = OEMBED.find((o) => o.test.test(url || ''));
  if (!entry) return { ok: true, verified: false, provider: null };
  const r = await get(entry.url(url), { json: true });
  if (r.status === 404 || r.status === 400) {
    return { ok: false, verified: false, provider: entry.provider, reason: `${entry.provider} says this clip does not exist \u2014 double-check the URL` };
  }
  if (r.ok && r.body) {
    return {
      ok: true, verified: true, provider: entry.provider,
      title: r.body.title || '', author: r.body.author_name || '',
      thumbnail: r.body.thumbnail_url || '',
    };
  }
  // Endpoint unreachable \u2014 accept but unverified
  return { ok: true, verified: false, provider: entry.provider };
}

export async function fetchClipStats(url) {
  try {
    if (/youtube\.com|youtu\.be/i.test(url)) {
      const r = await get(url);
      if (r.ok && r.body) {
        const v = r.body.match(/"viewCount":\s*"(\d+)"/);
        const l = r.body.match(/"likeCount":\s*"?(\d+)/);
        if (v) return { views: Number(v[1]), likes: l ? Number(l[1]) : null };
      }
    }
    if (/tiktok\.com/i.test(url)) {
      const r = await get(url);
      if (r.ok && r.body) {
        const v = r.body.match(/"playCount":(\d+)/);
        const l = r.body.match(/"diggCount":(\d+)/);
        if (v) return { views: Number(v[1]), likes: l ? Number(l[1]) : null };
      }
    }
  } catch { /* stats optional */ }
  return null;
}
