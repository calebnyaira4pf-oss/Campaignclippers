import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Minus, ChevronDown } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Seo from '../components/Seo';
import Breadcrumbs from '../components/Breadcrumbs';
import { Badge } from '../components/ui';

const TIERS = [
  {
    name: 'Starter', monthly: 0, yearly: 0, tag: 'For first campaigns',
    features: ['1 active campaign', 'Up to 5 approved clippers', 'Basic analytics', 'Escrow payments', 'Community support', '10% platform fee'],
    cta: 'Start free', highlight: false,
  },
  {
    name: 'Professional', monthly: 49, yearly: 41, tag: 'Most popular',
    features: ['10 active campaigns', 'Unlimited clippers', 'Full ClipIQ\u2122 AI suite', 'Advanced analytics & ROI', 'Priority support', 'Custom brand assets hub', '5% platform fee'],
    cta: 'Start 14-day trial', highlight: true,
  },
  {
    name: 'Enterprise', monthly: 199, yearly: 166, tag: 'For agencies & studios',
    features: ['Unlimited campaigns', 'Dedicated success manager', 'API access & webhooks', 'SSO / SAML', 'Custom contracts & SLA', 'Multi-seat workspaces', '2% platform fee'],
    cta: 'Contact sales', highlight: false,
  },
];

const COMPARE = [
  { f: 'Active campaigns', v: ['1', '10', 'Unlimited'] },
  { f: 'Approved clippers per campaign', v: ['5', 'Unlimited', 'Unlimited'] },
  { f: 'AI quality scoring', v: [false, true, true] },
  { f: 'Viral potential prediction', v: [false, true, true] },
  { f: 'AI caption generation', v: [false, true, true] },
  { f: 'Escrow payments', v: [true, true, true] },
  { f: 'Instant payouts (Stripe / PayPal)', v: [true, true, true] },
  { f: 'Advanced ROI analytics', v: [false, true, true] },
  { f: 'API access & webhooks', v: [false, false, true] },
  { f: 'SSO / SAML', v: [false, false, true] },
  { f: 'Dedicated success manager', v: [false, false, true] },
  { f: 'Platform fee', v: ['10%', '5%', '2%'] },
];

const FAQ = [
  { q: 'How does escrow work?', a: 'When you launch a campaign, your budget is held securely in escrow. Funds are only released to clippers when you approve their submissions \u2014 unused budget is refundable at any time.' },
  { q: 'What reward models are supported?', a: 'CPM (pay per 1,000 views), fixed fee per approved clip, or hybrid (base fee + CPM bonus). You set the rates when creating a campaign.' },
  { q: 'Do clippers pay anything?', a: 'No. Clippers join free, forever. The platform fee is deducted from campaign spend on the brand side.' },
  { q: 'How fast are payouts?', a: 'Approved earnings land in your wallet instantly. Withdrawals via Stripe or PayPal arrive in 1\u20132 business days.' },
  { q: 'Can I cancel anytime?', a: 'Yes. Plans are month-to-month (or annual with 2 months free). Downgrades take effect at the end of the billing cycle.' },
];

export default function Pricing() {
  const [yearly, setYearly] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-ink">
      <Seo
        title="Pricing — Campaign Clippers"
        description="Simple plans for brands: Starter free, Professional $49/mo, Enterprise $199/mo. Clippers always join free. Escrow payments, AI clip scoring, and instant payouts included."
        path="/pricing"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQ.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }}
      />
      <Navbar />
      <main className="max-w-7xl mx-auto px-5 md:px-8 pt-28 pb-24">
        <div className="mb-8">
          <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Pricing', to: '/pricing' }]} />
        </div>
        <div className="text-center max-w-2xl mx-auto">
          <Badge tone="lime" className="mb-5">Pricing</Badge>
          <h1 className="font-display text-5xl md:text-6xl font-bold text-white tracking-tight">Pay for results,<br />not seat licenses</h1>
          <p className="text-mut mt-5 text-lg">Clippers always join free. Brands pick a plan that scales with campaign volume.</p>
          <div className="inline-flex items-center gap-1 mt-8 p-1 rounded-full glass">
            <button onClick={() => setYearly(false)} className={`px-5 py-2 rounded-full text-sm font-bold transition-colors ${!yearly ? 'bg-primary text-ink' : 'text-mut'}`}>Monthly</button>
            <button onClick={() => setYearly(true)} className={`px-5 py-2 rounded-full text-sm font-bold transition-colors ${yearly ? 'bg-primary text-ink' : 'text-mut'}`}>Yearly <span className="opacity-70">−2 mo</span></button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mt-14">
          {TIERS.map((t) => (
            <div key={t.name} className={`relative rounded-3xl p-7 border flex flex-col ${t.highlight ? 'border-primary/45 bg-primary/6 shadow-2xl shadow-primary/10' : 'border-white/10 bg-white/3'}`}>
              {t.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-ink text-[11px] font-black uppercase tracking-wider">Most popular</span>
              )}
              <p className="font-display font-bold text-white text-xl">{t.name}</p>
              <p className="text-xs text-faint mt-1">{t.tag}</p>
              <p className="font-display text-5xl font-bold text-white mt-5">
                ${yearly ? t.yearly : t.monthly}
                <span className="text-sm text-faint font-body font-semibold">/mo</span>
              </p>
              {yearly && t.monthly > 0 && <p className="text-[11px] text-primary font-bold mt-1">billed annually · save ${(t.monthly - t.yearly) * 12}/yr</p>}
              <ul className="mt-7 space-y-3 flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white/80">
                    <Check size={15} className="text-primary mt-0.5 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link to="/signup" className={`${t.highlight ? 'btn-primary' : 'btn-ghost'} w-full mt-8`}>{t.cta}</Link>
            </div>
          ))}
        </div>

        {/* Comparison */}
        <div className="mt-24">
          <h2 className="font-display text-3xl font-bold text-white text-center mb-10">Compare plans</h2>
          <div className="glass rounded-2xl overflow-hidden overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-5 py-4 text-faint font-bold text-xs uppercase tracking-wider">Feature</th>
                  {TIERS.map((t) => <th key={t.name} className="px-5 py-4 font-display font-bold text-white">{t.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((row, i) => (
                  <tr key={row.f} className={i % 2 ? '' : 'bg-white/2'}>
                    <td className="px-5 py-3.5 text-mut font-semibold">{row.f}</td>
                    {row.v.map((v, j) => (
                      <td key={j} className="px-5 py-3.5 text-center">
                        {v === true ? <Check size={16} className="text-primary inline" /> : v === false ? <Minus size={16} className="text-faint inline" /> : <span className="text-white font-bold">{v}</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-24 max-w-2xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-white text-center mb-8">Frequently asked</h2>
          <div className="space-y-3">
            {FAQ.map((f, i) => (
              <div key={f.q} className="glass rounded-2xl overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between px-5 py-4 text-left">
                  <span className="font-bold text-white text-[15px]">{f.q}</span>
                  <ChevronDown size={17} className={`text-mut transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && <p className="px-5 pb-5 text-sm text-mut leading-relaxed">{f.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
