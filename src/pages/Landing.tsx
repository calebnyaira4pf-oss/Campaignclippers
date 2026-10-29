import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, ShieldCheck, Sparkles, TrendingUp, Trophy, Zap, Wallet, PlayCircle,
  Wand2, Gauge, MessageSquare, Star, CheckCircle2, Scissors, Megaphone, Clapperboard,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Seo from '../components/Seo';
import { Sparkline } from '../components/Charts';
import { Badge } from '../components/ui';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.55, ease: [0.21, 0.6, 0.35, 1] as any } }),
};

function Section({ id, children, className = '' }: any) {
  return <section id={id} className={`max-w-7xl mx-auto px-5 md:px-8 ${className}`}>{children}</section>;
}

export default function Landing() {
  const stats = [
    { v: '$2.4M+', l: 'Paid to clippers' },
    { v: '12,400', l: 'Active clippers' },
    { v: '340M', l: 'Views generated' },
    { v: '4.9/5', l: 'Average rating' },
  ];

  const features = [
    { icon: ShieldCheck, title: 'Escrow-protected payments', desc: 'Campaign budgets are locked in escrow the moment a campaign launches. Clippers get paid automatically when clips are approved \u2014 no chasing invoices.', tone: 'text-primary bg-primary/10' },
    { icon: Wand2, title: 'AI clip scoring', desc: 'Every submission is graded by our AI for edit quality, hook strength and viral potential before it ever reaches your review queue.', tone: 'text-violet bg-violet/10' },
    { icon: TrendingUp, title: 'Real-time analytics', desc: 'Track views, engagement, spend and ROI per clip, per clipper, per platform \u2014 all in one live dashboard.', tone: 'text-cyan bg-cyan/10' },
    { icon: Trophy, title: 'Leaderboards & reputation', desc: 'Verified track records, ratings and earnings leaderboards make it easy to spot elite clippers instantly.', tone: 'text-amber-300 bg-amber-400/10' },
    { icon: PlayCircle, title: 'Multi-platform campaigns', desc: 'Run one campaign across TikTok, YouTube Shorts, Instagram Reels and X \u2014 with per-platform rules and rewards.', tone: 'text-primary bg-primary/10' },
    { icon: Zap, title: 'Instant payouts', desc: 'Withdraw earnings via Stripe or PayPal in 1\u20132 business days. CPM, fixed-fee, or hybrid reward models supported.', tone: 'text-violet bg-violet/10' },
  ];

  const clipperSteps = [
    { n: '01', t: 'Build your profile', d: 'Connect your socials, showcase your portfolio, and earn your verified badge.' },
    { n: '02', t: 'Apply to campaigns', d: 'Browse live campaigns from brands, filter by niche and reward model, and pitch in one click.' },
    { n: '03', t: 'Clip, submit, get paid', d: 'Upload your clips, watch the views roll in, and receive escrow-backed payouts on approval.' },
  ];
  const brandSteps = [
    { n: '01', t: 'Launch a campaign', d: 'Set your budget, reward model, target platforms, keywords and content rules in minutes.' },
    { n: '02', t: 'Approve elite clippers', d: 'Review applications with verified stats, ratings, and AI-graded portfolios.' },
    { n: '03', t: 'Pay only for results', d: 'Approve clips you love. Escrow releases payment automatically \u2014 track every dollar of ROI.' },
  ];

  const testimonials = [
    { name: 'Maya Rodriguez', role: 'Clipper \u00b7 2.1M views/mo', quote: 'I quit my editing agency job after three months on Campaign Clippers. The escrow system means I never worry about getting paid \u2014 I just clip.', earn: '$8,200/mo' },
    { name: 'Daniel Okafor', role: 'Growth Lead \u00b7 Arcade.gg', quote: 'We generated 40M views in six weeks for less than one influencer post used to cost. The AI scoring cut our review time by 80%.', earn: '40M views' },
    { name: 'Sofia Lindqvist', role: 'Founder \u00b7 PulseFit', quote: 'The leaderboard made it trivial to find clippers who actually convert. Our CAC dropped 35% in the first month.', earn: '-35% CAC' },
  ];

  const tiers = [
    { name: 'Starter', price: '$0', desc: '1 active campaign \u00b7 10% fee', highlight: false },
    { name: 'Professional', price: '$49', desc: '10 campaigns \u00b7 AI suite \u00b7 5% fee', highlight: true },
    { name: 'Enterprise', price: '$199', desc: 'Unlimited \u00b7 API \u00b7 2% fee', highlight: false },
  ];

  return (
    <div className="min-h-screen bg-ink overflow-x-hidden">
      <Seo
        title="Campaign Clippers — The Clip Economy Marketplace"
        description="Campaign Clippers connects brands and agencies with 12,000+ elite video clippers. Launch escrow-funded campaigns, get AI-scored clips, and pay for results across TikTok, YouTube, Instagram and X."
        path="/"
      />
      <Navbar />

      {/* HERO */}
      <div className="relative hero-glow">
        <div className="absolute inset-0 grid-lines pointer-events-none" />
        <Section className="pt-32 md:pt-40 pb-16 relative">
          <div className="max-w-3xl">
            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
              <Badge tone="lime" className="mb-6"><Sparkles size={12} /> The clip economy marketplace</Badge>
            </motion.div>
            <motion.h1
              variants={fadeUp} initial="hidden" animate="show" custom={1}
              className="font-display text-[42px] leading-[1.04] md:text-7xl font-bold text-white tracking-tight"
            >
              Where brands meet clippers.{' '}
              <span className="text-grad">Every view gets paid.</span>
            </motion.h1>
            <motion.p variants={fadeUp} initial="hidden" animate="show" custom={2} className="mt-6 text-lg text-mut leading-relaxed max-w-xl">
              Campaign Clippers connects brands and agencies with 12,000+ elite video clippers.
              Launch performance campaigns, get AI-scored clips, and pay for results through escrow — not promises.
            </motion.p>
            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3} className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup" className="btn-primary text-base px-6 py-3">Start clipping — it’s free <ArrowRight size={17} /></Link>
              <Link to="/signup" className="btn-ghost text-base px-6 py-3"><Megaphone size={17} /> Launch a campaign</Link>
            </motion.div>
            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4} className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6">
              {stats.map((s) => (
                <div key={s.l}>
                  <p className="font-display text-2xl md:text-3xl font-bold text-white">{s.v}</p>
                  <p className="text-xs text-faint mt-1 uppercase tracking-[0.12em] font-bold">{s.l}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Mock dashboard */}
          <motion.div
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.7, ease: [0.21, 0.6, 0.35, 1] }}
            className="mt-16 glass-strong rounded-3xl p-4 md:p-6 shadow-2xl shadow-black/50"
          >
            <div className="grid md:grid-cols-3 gap-4">
              <div className="glass rounded-2xl p-5 md:col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-faint">Campaign spend · live</p>
                    <p className="font-display text-3xl font-bold text-white mt-1">$18,420 <span className="text-sm text-primary font-body font-bold">+12.4%</span></p>
                  </div>
                  <Badge tone="green">6 campaigns active</Badge>
                </div>
                <Sparkline data={[4, 6, 5, 9, 8, 12, 11, 15, 14, 19, 18, 24]} height={90} />
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {[{ l: 'Views', v: '38.2M' }, { l: 'Clips approved', v: '412' }, { l: 'Avg AI score', v: '87/100' }].map((x) => (
                    <div key={x.l} className="rounded-xl bg-white/4 border border-white/8 px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-wider text-faint font-bold">{x.l}</p>
                      <p className="font-display font-bold text-white text-lg">{x.v}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="glass rounded-2xl p-5">
                <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-faint mb-4">Top clippers this week</p>
                <div className="space-y-3.5">
                  {[
                    { n: 'Maya R.', e: '$2,140', c: 'from-primary to-cyan' },
                    { n: 'Jae P.', e: '$1,870', c: 'from-violet to-cyan' },
                    { n: 'Luca B.', e: '$1,540', c: 'from-amber-300 to-rose-400' },
                    { n: 'Nia K.', e: '$1,210', c: 'from-cyan to-violet' },
                  ].map((c, i) => (
                    <div key={c.n} className="flex items-center gap-3">
                      <span className="text-[11px] font-mono text-faint w-4">#{i + 1}</span>
                      <span className={`w-8 h-8 rounded-full bg-gradient-to-br ${c.c} grid place-items-center text-[11px] font-black text-ink`}>{c.n[0]}</span>
                      <span className="text-sm font-bold text-white flex-1">{c.n}</span>
                      <span className="text-sm font-mono text-primary">{c.e}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-xl bg-primary/8 border border-primary/20 px-3 py-2.5 flex items-center gap-2">
                  <Wallet size={14} className="text-primary" />
                  <span className="text-xs font-bold text-primary">Escrow released: $4,720 today</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Logos */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-50">
            {['NOVA LABS', 'ARCADE.GG', 'PULSEFIT', 'SONICWAVE', 'BYTEBOX', 'LUMEN'].map((b) => (
              <span key={b} className="font-display font-bold tracking-[0.2em] text-sm text-mut">{b}</span>
            ))}
          </div>
        </Section>
      </div>

      {/* HOW IT WORKS */}
      <Section id="how" className="py-24">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Badge tone="violet" className="mb-4">How it works</Badge>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white tracking-tight">One marketplace, two ways to win</h2>
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="glass rounded-3xl p-7 md:p-9">
            <div className="flex items-center gap-3 mb-7">
              <span className="w-10 h-10 rounded-xl bg-primary/12 grid place-items-center text-primary"><Clapperboard size={19} /></span>
              <h3 className="font-display text-2xl font-bold text-white">For clippers</h3>
            </div>
            <div className="space-y-6">
              {clipperSteps.map((s) => (
                <div key={s.n} className="flex gap-4">
                  <span className="font-mono text-primary text-sm font-bold pt-0.5">{s.n}</span>
                  <div>
                    <p className="font-bold text-white">{s.t}</p>
                    <p className="text-sm text-mut mt-1 leading-relaxed">{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/signup" className="btn-primary mt-8">Become a clipper <ArrowRight size={15} /></Link>
          </div>
          <div className="glass rounded-3xl p-7 md:p-9">
            <div className="flex items-center gap-3 mb-7">
              <span className="w-10 h-10 rounded-xl bg-violet/12 grid place-items-center text-violet"><Megaphone size={19} /></span>
              <h3 className="font-display text-2xl font-bold text-white">For brands & agencies</h3>
            </div>
            <div className="space-y-6">
              {brandSteps.map((s) => (
                <div key={s.n} className="flex gap-4">
                  <span className="font-mono text-violet text-sm font-bold pt-0.5">{s.n}</span>
                  <div>
                    <p className="font-bold text-white">{s.t}</p>
                    <p className="text-sm text-mut mt-1 leading-relaxed">{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/signup" className="btn-ghost mt-8">Launch a campaign <ArrowRight size={15} /></Link>
          </div>
        </div>
      </Section>

      {/* FEATURES */}
      <Section id="features" className="py-24">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Badge tone="lime" className="mb-4">Platform</Badge>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white tracking-tight">Built like a payments company.<br />Feels like a game.</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: (i % 3) * 0.08, duration: 0.5 }}
              className="glass rounded-2xl p-6 hover:border-white/20 transition-colors"
            >
              <span className={`w-11 h-11 rounded-xl grid place-items-center ${f.tone}`}><f.icon size={20} /></span>
              <h3 className="font-display font-bold text-white text-lg mt-4">{f.title}</h3>
              <p className="text-sm text-mut mt-2 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* AI SUITE */}
      <Section id="ai" className="py-24">
        <div className="relative rounded-3xl overflow-hidden border border-violet/25 bg-gradient-to-br from-violet/12 via-panel to-ink p-8 md:p-14">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-violet/15 blur-3xl pointer-events-none" />
          <div className="grid lg:grid-cols-2 gap-12 items-center relative">
            <div>
              <Badge tone="violet" className="mb-5"><Wand2 size={12} /> ClipIQ™ AI Suite</Badge>
              <h2 className="font-display text-3xl md:text-5xl font-bold text-white tracking-tight leading-tight">Your AI co-pilot for every clip</h2>
              <div className="mt-8 space-y-5">
                {[
                  { icon: Gauge, t: 'Quality scoring', d: 'Edit pacing, hook strength and caption clarity graded 0\u2013100 in seconds.' },
                  { icon: TrendingUp, t: 'Viral potential prediction', d: 'Trained on 40M+ short-form posts to forecast breakout probability per platform.' },
                  { icon: MessageSquare, t: 'Caption generation', d: 'Platform-native hooks and hashtag sets generated from your campaign keywords.' },
                ].map((x) => (
                  <div key={x.t} className="flex gap-4">
                    <span className="w-9 h-9 rounded-lg bg-violet/15 text-violet grid place-items-center shrink-0"><x.icon size={17} /></span>
                    <div>
                      <p className="font-bold text-white">{x.t}</p>
                      <p className="text-sm text-mut mt-0.5 leading-relaxed">{x.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-strong rounded-2xl p-6">
              <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-faint mb-4">Submission analysis</p>
              <div className="flex items-center gap-6">
                {[{ v: 92, l: 'Quality', c: '#cdff4d' }, { v: 87, l: 'Viral', c: '#8b7cff' }, { v: 94, l: 'Hook', c: '#6ee7f9' }].map((r) => (
                  <div key={r.l} className="text-center">
                    <div className="relative w-20 h-20">
                      <svg viewBox="0 0 80 80" className="-rotate-90">
                        <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
                        <circle cx="40" cy="40" r="34" fill="none" stroke={r.c} strokeWidth="7" strokeLinecap="round"
                          strokeDasharray={`${(r.v / 100) * 213.6} 213.6`} />
                      </svg>
                      <span className="absolute inset-0 grid place-items-center font-display font-bold text-white text-lg">{r.v}</span>
                    </div>
                    <p className="text-xs text-mut font-bold mt-2">{r.l}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-xl bg-white/4 border border-white/8 p-4">
                <p className="text-[10px] uppercase tracking-wider text-faint font-bold mb-1.5 flex items-center gap-1.5"><Sparkles size={11} className="text-violet" /> AI-generated caption</p>
                <p className="text-sm text-white/85 leading-relaxed font-mono">“POV: you just discovered the cheat code 🔥 #gaming #arcade #fyp”</p>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-primary font-bold">
                <CheckCircle2 size={14} /> Recommended: approve — top 8% of submissions
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* TESTIMONIALS */}
      <Section className="py-24">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Badge tone="cyan" className="mb-4">Loved by both sides</Badge>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white tracking-tight">Receipts, not promises</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map((t) => (
            <div key={t.name} className="glass rounded-2xl p-6 flex flex-col">
              <div className="flex gap-1 text-primary mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
              </div>
              <p className="text-[15px] text-white/85 leading-relaxed flex-1">“{t.quote}”</p>
              <div className="flex items-center justify-between mt-6 pt-5 border-t border-white/8">
                <div>
                  <p className="text-sm font-bold text-white">{t.name}</p>
                  <p className="text-xs text-faint mt-0.5">{t.role}</p>
                </div>
                <Badge tone="lime">{t.earn}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* PRICING TEASER */}
      <Section className="pb-24">
        <div className="glass rounded-3xl p-8 md:p-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <Badge tone="lime" className="mb-4">Pricing</Badge>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-white tracking-tight">Start free. Scale when it works.</h2>
            </div>
            <Link to="/pricing" className="btn-ghost">Compare all plans <ArrowRight size={15} /></Link>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {tiers.map((t) => (
              <Link to="/pricing" key={t.name} className={`rounded-2xl border p-6 transition-all hover:-translate-y-1 ${t.highlight ? 'border-primary/40 bg-primary/6' : 'border-white/10 bg-white/3'}`}>
                <p className="font-bold text-white">{t.name}</p>
                <p className="font-display text-3xl font-bold text-white mt-2">{t.price}<span className="text-sm text-faint font-body">/mo</span></p>
                <p className="text-xs text-mut mt-2">{t.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </Section>

      {/* CTA */}
      <Section className="pb-28">
        <div className="relative rounded-3xl overflow-hidden text-center px-6 py-16 md:py-20 border border-primary/25 bg-gradient-to-b from-primary/10 to-transparent">
          <div className="absolute inset-0 grid-lines pointer-events-none" />
          <div className="relative">
            <span className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-primary text-ink mb-6"><Scissors size={26} strokeWidth={2.5} /></span>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white tracking-tight">The clip economy is hiring.</h2>
            <p className="text-mut mt-4 max-w-md mx-auto">Join 12,000+ clippers and 800+ brands already earning on Campaign Clippers.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/signup" className="btn-primary text-base px-7 py-3">Create free account <ArrowRight size={17} /></Link>
              <Link to="/pricing" className="btn-ghost text-base px-7 py-3">View pricing</Link>
            </div>
          </div>
        </div>
      </Section>

      <Footer />
    </div>
  );
}
