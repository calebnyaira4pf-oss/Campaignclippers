import supabase from './db-client.js';
import { requireAuth } from './_auth.js';

const KNOWLEDGE = {
  escrow: {
    reply: () => 'Verified campaign escrow is not available yet. Campaign launches and approval payouts are paused until payment settlement is integrated. Do not treat campaign budgets or wallet balances as funded cash.',
    suggestions: ['How do payouts work?', 'What are the reward models?'],
  },
  payout: {
    reply: () => 'Withdrawals are currently unavailable because payout providers are not connected. No payout request will be marked complete until a provider confirms the transfer.',
    suggestions: ['What is my balance?', 'How does escrow work?'],
  },
  apply: {
    reply: () => 'To join a campaign: open Browse Campaigns, filter by niche, platform or keyword, then hit \u201cApply to campaign\u201d and write a short pitch (mention your niche, average views, and turnaround time). Once the brand approves you, you can submit unlimited clips from the campaign page.',
    suggestions: ['How do I submit a clip?', 'How do AI scores work?'],
  },
  submit: {
    reply: () => 'Clip scoring and caption suggestions are heuristic estimates, not validated AI predictions. Payment approval is paused until campaign escrow and payout settlement are available.',
    suggestions: ['How much will I earn per clip?', 'How do payouts work?'],
  },
  reward: {
    reply: () => 'Campaigns use one of three reward models:\n\u2022 CPM \u2014 you earn per 1,000 views (e.g. $5 CPM on 100K views = $500)\n\u2022 Fixed \u2014 a flat fee per approved clip\n\u2022 Hybrid \u2014 a base fee plus a CPM bonus on top.\nThe rate is always shown on the campaign card before you apply.',
    suggestions: ['How does escrow work?', 'How do I apply to a campaign?'],
  },
  create: {
    reply: () => 'The campaign wizard can help prepare campaign details, but campaign launch is paused until verified escrow funding is available.',
    suggestions: ['Which reward model should I pick?', 'How do I review submissions?'],
  },
  review: {
    reply: () => 'You can review application and submission details. Rejecting submissions is available; approval and payout are paused until campaign escrow settlement is configured. Scores and captions are heuristic estimates.',
    suggestions: ['How do AI scores work?', 'How does escrow work?'],
  },
  ai: {
    reply: () => 'The ClipIQ\u2122 AI suite grades every submission the moment it lands: a Quality score (0\u2013100) for edit pacing, hook strength and caption clarity, a Viral potential prediction trained on short-form performance data, and an auto-generated platform-native caption with hashtags from the campaign keywords.',
    suggestions: ['How do I submit a clip?', 'How do brands review clips?'],
  },
  pricing: {
    reply: () => 'The pricing screen lists Starter, Professional, and Enterprise plans. Paid subscriptions and campaign launches are currently disabled until verified payment processing is configured.',
    suggestions: ['How does escrow work?', 'How do I create a campaign?'],
  },
  verify: {
    reply: () => 'Verification is earned through tiers: Rising \u2192 Bronze \u2192 Silver \u2192 Gold \u2192 Elite. Your tier score (0\u2013100) is computed from verified views, lifetime earnings, approved clips, approval rate, 30-day activity, connected platforms, and brand ratings. Hit Silver (45+ pts) and the verified badge activates automatically. Check your live score and next-tier checklist on the Verification page.',
    suggestions: ['How do I climb the leaderboard?', 'How do I connect my accounts?'],
  },
  tiers: {
    reply: () => 'The five clipper tiers are Rising, Bronze (25+ pts), Silver (45+ \u2014 auto-verified badge), Gold (65+ \u2014 premium campaign invites, reduced fees), and Elite (85+ \u2014 instant payouts, dedicated manager). Points come from views (25), earnings (20), approved clips (15), approval rate (10), monthly activity (10), connected platforms (10), and ratings (10). Tiers recalculate automatically as your stats change.',
    suggestions: ['How do I get verified?', 'What is my balance?'],
  },
  security: {
    reply: () => 'Multi-factor authentication and account deletion are not configured yet. You can export the profile data currently available from Profile. Use a unique password and keep your email account secure.',
    suggestions: ['How do I export my data?', 'How does escrow work?'],
  },
  gdpr: {
    reply: () => 'We\u2019re fully GDPR compliant. From Profile \u2192 Security & privacy you can export all your account data as JSON in one click. For erasure requests, data is deleted within 30 days (except legally required financial records). Full details are on the GDPR Compliance page in the footer.',
    suggestions: ['Is 2FA available?'],
  },
  leaderboard: {
    reply: () => 'The leaderboard ranks clippers by lifetime escrow-released earnings. Ranks 1\u20133 are Elite, 4\u201310 are Pro, and the rest are Rising. Higher earnings, more views, and strong ratings from brands all push you up \u2014 and top-ranked clippers get approved faster.',
    suggestions: ['How do I get verified?', 'How do payouts work?'],
  },
  human: {
    reply: () => 'You can reach the team at support@campaignclippers.com \u2014 replies within 24h on Starter, priority on Professional, and a dedicated success manager on Enterprise. In the meantime, ask me anything about campaigns, payments, or the platform!',
    suggestions: ['How does escrow work?', 'What plans are available?'],
  },
};

const INTENTS = [
  { key: 'balance', test: /(my|check).*(balance|wallet)|balance\?|how much (do i have|have i earned)|my earnings/ },
  { key: 'mystats', test: /my (campaigns|stats|applications|submissions|clips|performance)|pending (reviews|applications|clips)|what('| i)?s waiting/ },
  { key: 'payout', test: /payout|withdraw|cash out|get (my )?money|paypal|stripe|when.*paid/ },
  { key: 'escrow', test: /escrow|payment protection|is it safe|trust|get scammed|guarantee/ },
  { key: 'apply', test: /apply|application|join a campaign|pitch|find (a )?campaign|browse/ },
  { key: 'submit', test: /submit|upload|send.*clip|post.*clip|deliver/ },
  { key: 'reward', test: /reward|cpm|fixed rate|hybrid|per view|per clip|how much.*earn|rates?\b/ },
  { key: 'create', test: /create|launch|start.*campaign|new campaign|set up.*campaign|wizard/ },
  { key: 'review', test: /review|approve|reject|applicants?|manage.*(clips|submissions)/ },
  { key: 'ai', test: /\bai\b|clipiq|quality score|viral|caption|scoring/ },
  { key: 'pricing', test: /pricing|price|plan|tier|subscription|fee|cost|upgrade|starter|professional|enterprise|free/ },
  { key: 'tiers', test: /tier|bronze|silver|gold|elite|rising|rank up|level up/ },
  { key: 'verify', test: /verif|badge|blue check/ },
  { key: 'security', test: /2fa|two.?factor|security|password|secure|safe.*account/ },
  { key: 'gdpr', test: /gdpr|privacy|export.*data|delete.*(account|data)|erasure/ },
  { key: 'leaderboard', test: /leaderboard|rank|elite|top clipper|tier list/ },
  { key: 'human', test: /human|support|contact|help desk|agent|email.*(team|support)|talk to (someone|a person)/ },
];

const money = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Number(n) || 0);

async function personalContext(profileId) {
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', profileId).maybeSingle();
  if (!profile) return null;
  if (profile.role === 'owner') {
    const [{ data: camps }, { data: apps }, { data: subs }] = await Promise.all([
      supabase.from('campaigns').select('id,title,status,budget,spent').eq('owner_id', profile.id),
      supabase.from('applications').select('id,status').eq('owner_id', profile.id),
      supabase.from('submissions').select('id,status').eq('owner_id', profile.id),
    ]);
    return { profile, campaigns: camps || [], apps: apps || [], subs: subs || [] };
  }
  const [{ data: apps }, { data: subs }] = await Promise.all([
    supabase.from('applications').select('id,status,campaign_title').eq('clipper_id', profile.id),
    supabase.from('submissions').select('id,status,earnings,views').eq('clipper_id', profile.id),
  ]);
  return { profile, apps: apps || [], subs: subs || [] };
}

function answerBalance(ctx) {
  if (!ctx) return { reply: 'Log in and I can check profile information. Funding, campaign escrow, and withdrawals are currently paused until payment providers are integrated.', suggestions: ['How do payouts work?', 'How does escrow work?'] };
  const p = ctx.profile;
  if (p.role === 'owner') {
    const inEscrow = ctx.campaigns.reduce((a, c) => a + Math.max(0, Number(c.budget) - Number(c.spent)), 0);
    const spent = ctx.campaigns.reduce((a, c) => a + Number(c.spent || 0), 0);
    return {
      reply: `Campaign ledger figures for ${p.name}:\n\u2022 Recorded campaign budgets: ${money(inEscrow + spent)}\n\u2022 Recorded spend: ${money(spent)}\nThese are database records, not proof of settled escrow funds. New launches are paused.`,
      suggestions: ['How do I review submissions?', 'How do I create a campaign?'],
    };
  }
  return {
    reply: `Here\u2019s your live wallet snapshot, ${p.name}:\n\u2022 Available balance: ${money(p.balance)}\n\u2022 Lifetime earnings: ${money(p.total_earnings)}\n\u2022 Total views: ${new Intl.NumberFormat('en-US', { notation: 'compact' }).format(p.total_views || 0)}\nReady to cash out? Wallet \u2192 Withdraw takes under a minute.`,
    suggestions: ['How do payouts work?', 'What are my stats?'],
  };
}

function answerStats(ctx) {
  if (!ctx) return { reply: 'Log in and I can pull your live campaign stats. Clippers see applications, submissions and earnings; brands see pending applicants and clips awaiting review.', suggestions: ['How do I apply to a campaign?', 'What plans are available?'] };
  const p = ctx.profile;
  if (p.role === 'owner') {
    const active = ctx.campaigns.filter((c) => c.status === 'active').length;
    const pendingApps = ctx.apps.filter((a) => a.status === 'pending').length;
    const pendingSubs = ctx.subs.filter((s) => s.status === 'pending').length;
    return {
      reply: `Live status for ${p.name}:\n\u2022 ${active} active campaign${active === 1 ? '' : 's'} (${ctx.campaigns.length} total)\n\u2022 ${pendingApps} applicant${pendingApps === 1 ? '' : 's'} waiting for review\n\u2022 ${pendingSubs} clip${pendingSubs === 1 ? '' : 's'} awaiting approval${pendingApps + pendingSubs > 0 ? '\nHead to your campaigns to clear the queue \u2014 fast reviews keep top clippers engaged.' : '\nYour review queue is clear. Nice.'}`,
      suggestions: ['How do I review submissions?', 'What is my funding status?'],
    };
  }
  const approvedApps = ctx.apps.filter((a) => a.status === 'approved').length;
  const pendingApps = ctx.apps.filter((a) => a.status === 'pending').length;
  const approvedSubs = ctx.subs.filter((s) => s.status === 'approved').length;
  const pendingSubs = ctx.subs.filter((s) => s.status === 'pending').length;
  return {
    reply: `Live status for ${p.name}:\n\u2022 ${approvedApps} active campaign${approvedApps === 1 ? '' : 's'}, ${pendingApps} application${pendingApps === 1 ? '' : 's'} pending\n\u2022 ${ctx.subs.length} clip${ctx.subs.length === 1 ? '' : 's'} submitted \u2014 ${approvedSubs} approved, ${pendingSubs} in review\n\u2022 Rating: ${Number(p.rating) > 0 ? Number(p.rating).toFixed(1) + '/5' : 'no reviews yet'}${pendingSubs > 0 ? '\nYour pending clips are with the brands now \u2014 you\u2019ll get a notification the moment they\u2019re approved.' : ''}`,
    suggestions: ['What is my balance?', 'How do I climb the leaderboard?'],
  };
}

function greetingFor(ctx) {
  const name = ctx?.profile?.name ? `, ${ctx.profile.name.split(' ')[0]}` : '';
  const roleLine = ctx?.profile?.role === 'owner'
    ? 'I can help you launch campaigns, review clips, and track escrow.'
    : ctx?.profile?.role === 'clipper'
      ? 'I can help you find campaigns, submit clips, and get paid faster.'
      : 'I can explain how campaigns, escrow payments, and AI scoring work.';
  return {
    reply: `Hey${name}! I\u2019m Clip, the Campaign Clippers assistant. ${roleLine} What do you need?`,
    suggestions: ctx?.profile?.role === 'owner'
      ? ['What\u2019s waiting for my review?', 'How do I create a campaign?', 'What is my funding status?']
      : ctx?.profile?.role === 'clipper'
        ? ['What is my balance?', 'How do I apply to a campaign?', 'How do AI scores work?']
        : ['How does escrow work?', 'What plans are available?', 'How do clippers get paid?'],
  };
}

async function tryOpenAI(message, history, ctx) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const sys = `You are Clip, the in-app assistant for Campaign Clippers. Be concise (under 120 words) and do not promise features that are unavailable. Funding, campaign escrow, paid subscriptions, approval payouts, and withdrawals are currently paused because payment providers are not configured. Submission scores and captions are heuristic estimates, not validated AI predictions. Account multi-factor authentication is not configured. If asked about a paused feature, state that clearly. Treat database balances and campaign budgets as records, not proof that funds have settled.${ctx?.profile ? ` User: ${ctx.profile.name}, role: ${ctx.profile.role}, recorded balance: $${ctx.profile.balance}, recorded lifetime earnings: $${ctx.profile.total_earnings}.` : ''}`;
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: sys }, ...(history || []).slice(-6), { role: 'user', content: message }],
        max_tokens: 300,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    return text ? { reply: text, suggestions: [] } : null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { message, profile_id, history } = req.body || {};
    if (profile_id && String(profile_id) !== String(auth.profile?.id)) return res.status(403).json({ error: 'Assistant context must belong to your profile' });
    const text = String(message || '').toLowerCase().trim();

    let ctx = null;
    if (profile_id) {
      try { ctx = await personalContext(auth.profile.id); } catch { ctx = null; }
    }

    if (!text || /^(hi|hey|hello|yo|sup|start|help)\b/.test(text)) {
      return res.status(200).json(greetingFor(ctx));
    }

    // Personalized intents first
    const intent = INTENTS.find((i) => i.test.test(text));
    if (intent?.key === 'balance') return res.status(200).json(answerBalance(ctx));
    if (intent?.key === 'mystats') return res.status(200).json(answerStats(ctx));

    // Optional LLM path (if the workspace has an OpenAI key configured)
    const llm = await tryOpenAI(message, history, ctx);
    if (llm) return res.status(200).json(llm);

    if (intent && KNOWLEDGE[intent.key]) {
      const k = KNOWLEDGE[intent.key];
      return res.status(200).json({ reply: k.reply(ctx || {}), suggestions: k.suggestions });
    }

    if (/thank|thx|ty\b|great|awesome|cool/.test(text)) {
      return res.status(200).json({ reply: 'Anytime! Ping me whenever you need help with campaigns, payments, or anything else on the platform. \ud83d\udc4b', suggestions: ['How does escrow work?', 'What plans are available?'] });
    }

    return res.status(200).json({
      reply: 'I can help with campaigns, applications, clip submissions, escrow payments, payouts, AI scoring, pricing plans, verification, and account security. Try one of these, or rephrase your question:',
      suggestions: ctx?.profile?.role === 'owner'
        ? ['How do I create a campaign?', 'What\u2019s waiting for my review?', 'What plans are available?']
        : ['How do I apply to a campaign?', 'What is my balance?', 'How do payouts work?'],
    });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
