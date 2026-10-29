import { Link } from 'react-router-dom';
import { Logo } from './Navbar';

export default function Footer() {
  const cols = [
    {
      title: 'Product',
      links: [
        { label: 'Features', href: '/#features' },
        { label: 'AI Suite', href: '/#ai' },
        { label: 'Pricing', href: '/pricing', route: true },
        { label: 'For Brands', href: '/signup', route: true },
        { label: 'For Clippers', href: '/signup', route: true },
      ],
    },
    {
      title: 'Platform',
      links: [
        { label: 'Campaigns', href: '/login', route: true },
        { label: 'Leaderboard', href: '/login', route: true },
        { label: 'Analytics', href: '/login', route: true },
        { label: 'Escrow payments', href: '/#features' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', href: '/legal/privacy', route: true },
        { label: 'Terms of Service', href: '/legal/terms', route: true },
        { label: 'GDPR Compliance', href: '/legal/gdpr', route: true },
      ],
    },
  ];

  return (
    <footer className="border-t border-white/8 bg-surface">
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-14 grid grid-cols-2 md:grid-cols-5 gap-10">
        <div className="col-span-2">
          <Logo />
          <p className="text-sm text-mut mt-4 max-w-xs leading-relaxed">
            The marketplace where brands, agencies and creators turn content into viral clips — with escrow-protected payouts and AI-graded quality.
          </p>
          <p className="text-xs text-faint mt-6 font-mono">SOC2 · GDPR · PCI-DSS ready</p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-faint mb-4">{c.title}</h4>
            <ul className="space-y-2.5">
              {c.links.map((l) => (
                <li key={l.label}>
                  {l.route ? (
                    <Link to={l.href} className="text-sm text-mut hover:text-white transition-colors">{l.label}</Link>
                  ) : (
                    <a href={l.href} className="text-sm text-mut hover:text-white transition-colors">{l.label}</a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/8">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-faint">© {new Date().getFullYear()} Campaign Clippers, Inc. All rights reserved.</p>
          <p className="text-xs text-faint">Payments secured by Stripe & PayPal · Funds held in escrow</p>
        </div>
      </div>
    </footer>
  );
}
