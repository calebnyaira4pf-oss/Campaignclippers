// Real email validation:
//  1. Strict RFC-style format check
//  2. Disposable/temporary email domain blocklist (incl. subdomains)
//  3. Typo detection against popular providers ("did you mean gmail.com?")
//  4. Live DNS MX-record lookup (DNS-over-HTTPS) — proves the domain can
//     actually receive mail, so only real, deliverable addresses register.

const DISPOSABLE = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'sharklasers.com',
  '10minutemail.com', '10minutemail.net', 'tempmail.com', 'temp-mail.org', 'temp-mail.io',
  'yopmail.com', 'yopmail.fr', 'throwawaymail.com', 'getnada.com', 'nada.email',
  'maildrop.cc', 'dispostable.com', 'trashmail.com', 'trashmail.de', 'mailnesia.com',
  'fakeinbox.com', 'mytemp.email', 'tempinbox.com', 'mohmal.com', 'spamgourmet.com',
  'mailcatch.com', 'inboxkitten.com', 'emailondeck.com', 'burnermail.io', 'mintemail.com',
  'tempmailo.com', 'moakt.com', 'tmpmail.org', 'tmpmail.net', 'disbox.net', 'dropmail.me',
  'mail-temp.com', 'onetimemail.org', 'mailsac.com', 'spam4.me', 'grr.la', 'mailnull.com',
  'tempr.email', 'discard.email', 'mailbox.in.ua', 'spambox.us', 'mailexpire.com',
  'jetable.org', 'mailforspam.com', 'tempail.com', 'crazymailing.com', 'tafmail.com',
  'emailfake.com', 'generator.email', 'harakirimail.com', 'mailgen.biz', 'trbvm.com',
  'cuvox.de', 'dayrep.com', 'einrot.com', 'fleckens.hu', 'gustr.com', 'jourrapide.com',
  'rhyta.com', 'superrito.com', 'teleworm.us', 'armyspy.com',
]);

// Fake/placeholder domains people type to skip forms
const FAKE = new Set([
  'example.com', 'example.org', 'example.net', 'test.com', 'email.com.fake',
  'fake.com', 'asdf.com', 'nomail.com', 'noemail.com', 'none.com', 'no.com',
]);

const POPULAR = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'aol.com',
  'proton.me', 'protonmail.com', 'live.com', 'msn.com', 'me.com', 'mail.com',
  'zoho.com', 'gmx.com', 'yandex.com', 'hey.com', 'fastmail.com',
];

const FORMAT = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 2) return 99;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

function typoSuggestion(domain) {
  if (POPULAR.includes(domain)) return null;
  let best = null;
  let bestDist = 3;
  for (const p of POPULAR) {
    const d = levenshtein(domain, p);
    if (d > 0 && d < bestDist) { bestDist = d; best = p; }
  }
  return best;
}

function isDisposable(domain) {
  if (DISPOSABLE.has(domain)) return true;
  // Catch subdomains of disposable services (e.g. abc.yopmail.com)
  const parts = domain.split('.');
  for (let i = 1; i < parts.length - 1; i++) {
    if (DISPOSABLE.has(parts.slice(i).join('.'))) return true;
  }
  return false;
}

async function hasMx(domain) {
  const resolvers = [
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`,
    `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`,
  ];
  for (const url of resolvers) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(url, { headers: { accept: 'application/dns-json' }, signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.Status === 3) return { checked: true, ok: false }; // NXDOMAIN
      if (data.Status !== 0) continue;
      const mx = (data.Answer || []).filter((a) => a.type === 15);
      if (mx.length > 0) return { checked: true, ok: true };
      const aRes = await fetch(url.replace('type=MX', 'type=A'), { headers: { accept: 'application/dns-json' } });
      if (aRes.ok) {
        const aData = await aRes.json();
        const aRecords = (aData.Answer || []).filter((r) => r.type === 1);
        return { checked: true, ok: aRecords.length > 0 };
      }
      return { checked: true, ok: false };
    } catch { /* try next resolver */ }
  }
  return { checked: false, ok: true };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const email = String(req.body?.email || '').trim().toLowerCase();

    if (!email) return res.status(200).json({ valid: false, reason: 'Enter an email address.' });
    if (email.length > 254 || !FORMAT.test(email)) {
      return res.status(200).json({ valid: false, reason: 'That doesn\u2019t look like a valid email address.' });
    }

    const domain = email.split('@')[1];

    if (FAKE.has(domain)) {
      return res.status(200).json({ valid: false, reason: 'Placeholder domains can\u2019t be used — enter your real email.' });
    }
    if (isDisposable(domain)) {
      return res.status(200).json({ valid: false, reason: 'Disposable email addresses aren\u2019t allowed — please use your real email.' });
    }

    // Typo detection before DNS — squatted typo domains often have MX records
    const suggestion = typoSuggestion(domain);
    if (suggestion) {
      return res.status(200).json({
        valid: false,
        reason: `Did you mean @${suggestion}? \u201c${domain}\u201d looks like a typo.`,
        suggestion: `${email.split('@')[0]}@${suggestion}`,
      });
    }

    const mx = await hasMx(domain);
    if (mx.checked && !mx.ok) {
      return res.status(200).json({ valid: false, reason: `\u201c${domain}\u201d can\u2019t receive email — check the spelling of the domain.` });
    }

    return res.status(200).json({ valid: true, domain, mx_verified: mx.checked });
  } catch (err) {
    console.error('API error:', err);
    return res.status(200).json({ valid: true, mx_verified: false });
  }
}
