import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Seo from '../components/Seo';
import Breadcrumbs from '../components/Breadcrumbs';

const CONTENT: Record<string, { title: string; updated: string; sections: { h: string; p: string }[] }> = {
  privacy: {
    title: 'Privacy Policy',
    updated: 'January 2025',
    sections: [
      { h: '1. Data we collect', p: 'We collect account information (name, email, role), campaign and submission metadata, payment records processed by our PCI-compliant partners (Stripe, PayPal), and usage analytics required to operate the marketplace.' },
      { h: '2. How we use your data', p: 'Your data powers core platform features: matching clippers with campaigns, processing escrow payments, computing leaderboards, and generating AI quality scores. We never sell personal data to third parties.' },
      { h: '3. Data retention', p: 'Account data is retained while your account is active. Financial records are retained for 7 years to comply with tax regulations. You may request deletion of non-mandatory data at any time.' },
      { h: '4. Third-party processors', p: 'We share the minimum necessary data with Stripe and PayPal (payments), Supabase (infrastructure), and analytics providers under strict data-processing agreements.' },
      { h: '5. Your rights', p: 'You have the right to access, rectify, export, and erase your personal data. Contact privacy@campaignclippers.com to exercise these rights.' },
    ],
  },
  terms: {
    title: 'Terms of Service',
    updated: 'January 2025',
    sections: [
      { h: '1. The marketplace', p: 'Campaign Clippers connects Campaign Owners (brands and agencies) with Clippers (creators and editors). We facilitate discovery, escrow payments, and dispute resolution but are not a party to agreements between users.' },
      { h: '2. Escrow & payouts', p: 'Campaign budgets are held in escrow. Funds are released to clippers when submissions are approved by the campaign owner. Payouts are processed within 1\u20132 business days via Stripe or PayPal.' },
      { h: '3. Content ownership', p: 'Clippers grant campaign owners a license to the approved clips as defined in each campaign\u2019s rules. Raw brand assets remain the property of the campaign owner.' },
      { h: '4. Prohibited conduct', p: 'Fake engagement, purchased views, misleading claims, and content violating platform policies (TikTok, YouTube, Instagram, X) will result in forfeiture of pending earnings and account termination.' },
      { h: '5. Fees', p: 'Platform fees vary by subscription tier: 10% (Starter), 5% (Professional), 2% (Enterprise), deducted from campaign spend at the time of escrow release.' },
    ],
  },
  gdpr: {
    title: 'GDPR Compliance',
    updated: 'January 2025',
    sections: [
      { h: 'Lawful basis', p: 'We process personal data under contract necessity (operating your account), legitimate interest (fraud prevention, product improvement), and consent (marketing communications).' },
      { h: 'Data portability', p: 'EU/EEA users can export all account data in machine-readable JSON format from Settings, or by emailing dpo@campaignclippers.com.' },
      { h: 'Right to erasure', p: 'Submit a deletion request and we will erase personal data within 30 days, except records we are legally required to retain (e.g., invoices).' },
      { h: 'Data Protection Officer', p: 'Our DPO can be reached at dpo@campaignclippers.com. You may also lodge complaints with your local supervisory authority.' },
      { h: 'International transfers', p: 'Data transferred outside the EEA is protected by Standard Contractual Clauses and processed in SOC2-certified data centers.' },
    ],
  },
};

export default function Legal() {
  const { page } = useParams();
  const doc = CONTENT[page || 'privacy'] || CONTENT.privacy;
  return (
    <div className="min-h-screen bg-ink">
      <Seo
        title={`${doc.title} — Campaign Clippers`}
        description={`${doc.title} for the Campaign Clippers marketplace. Last updated ${doc.updated}.`}
        path={`/legal/${page || 'privacy'}`}
      />
      <Navbar />
      <main className="max-w-3xl mx-auto px-5 pt-28 pb-24">
        <div className="mb-6">
          <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Legal' }, { label: doc.title, to: `/legal/${page || 'privacy'}` }]} />
        </div>
        <div className="flex gap-2 mb-8">
          {Object.keys(CONTENT).map((k) => (
            <Link key={k} to={`/legal/${k}`} className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${k === page ? 'bg-primary/12 text-primary border-primary/25' : 'text-mut border-white/10 hover:text-white'}`}>
              {CONTENT[k].title}
            </Link>
          ))}
        </div>
        <h1 className="font-display text-4xl font-bold text-white">{doc.title}</h1>
        <p className="text-sm text-faint mt-2 font-mono">Last updated: {doc.updated}</p>
        <div className="mt-10 space-y-8">
          {doc.sections.map((s) => (
            <section key={s.h}>
              <h2 className="font-display text-lg font-bold text-white mb-2">{s.h}</h2>
              <p className="text-[15px] text-mut leading-relaxed">{s.p}</p>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
