import { Shield, ShieldCheck, Medal, Crown, Gem } from 'lucide-react';

export const TIER_META: Record<string, { label: string; icon: any; cls: string; ring: string }> = {
  rising: { label: 'Rising', icon: Shield, cls: 'bg-white/8 text-white/70 border-white/15', ring: '#9096a8' },
  bronze: { label: 'Bronze', icon: Medal, cls: 'bg-orange-400/10 text-orange-300 border-orange-400/30', ring: '#fdba74' },
  silver: { label: 'Silver', icon: ShieldCheck, cls: 'bg-slate-300/10 text-slate-200 border-slate-300/30', ring: '#cbd5e1' },
  gold: { label: 'Gold', icon: Crown, cls: 'bg-amber-400/10 text-amber-300 border-amber-400/35', ring: '#fbbf24' },
  elite: { label: 'Elite', icon: Gem, cls: 'bg-primary/12 text-primary border-primary/40', ring: '#cdff4d' },
};

export default function TierBadge({ tier, size = 'sm' }: { tier?: string; size?: 'sm' | 'md' }) {
  const meta = TIER_META[tier || 'rising'] || TIER_META.rising;
  const Icon = meta.icon;
  if (size === 'md') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${meta.cls}`}>
        <Icon size={13} /> {meta.label}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border whitespace-nowrap ${meta.cls}`}>
      <Icon size={10} /> {meta.label}
    </span>
  );
}
