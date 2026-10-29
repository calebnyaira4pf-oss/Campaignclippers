import { useState, useEffect, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheck, RefreshCw, Check, Lightbulb, ArrowRight, Lock, BadgeCheck,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { Spinner, EmptyState, ProgressBar, Badge } from '../components/ui';
import TierBadge, { TIER_META } from '../components/TierBadge';

const PERKS: Record<string, string[]> = {
  rising: ['Full marketplace access', 'Apply to any open campaign', 'Standard payout speed (1\u20132 days)'],
  bronze: ['Bronze badge on applications', 'Priority listing in campaign search', 'Weekly performance digest'],
  silver: ['Automatic verified badge \u2713', 'Featured in brand discovery', 'Early access to new campaigns'],
  gold: ['Invites to premium campaigns', 'Reduced payout fee', 'Direct line to brand teams'],
  elite: ['Homepage leaderboard feature', 'Instant payouts', 'Dedicated success manager', 'Beta access to ClipIQ\u2122 tools'],
};

export default function Verification() {
  const { profile, refreshProfile } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const analyze = useCallback(async (soft = false) => {
    if (!profile?.id) return;
    if (soft) setRefreshing(true);
    try {
      const d = await api(`tiers?profile_id=${profile.id}`);
      setData(d);
      if (Boolean(d.verified) !== Boolean(profile.verified)) refreshProfile();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  useEffect(() => { analyze(); }, [analyze]);

  if (profile?.role === 'owner') return <Navigate to="/dashboard/campaigns" replace />;
  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Spinner size={30} />
      <p className="text-sm text-mut">Scoring your track record…</p>
    </div>
  );
  if (error || !data) return <EmptyState icon={<ShieldCheck size={22} />} title="Couldn't compute your tier" desc={error} action={<button onClick={() => analyze()} className="btn-primary">Retry</button>} />;

  const meta = TIER_META[data.tier];
  const currentIdx = data.tiers.findIndex((t: any) => t.key === data.tier);

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white flex items-center gap-2.5">
            <ShieldCheck size={26} className="text-primary" /> Verification tiers
          </h1>
          <p className="text-sm text-mut mt-1">Your tier is computed from real activity — views, approvals, consistency, and reputation.</p>
        </div>
        <button onClick={() => analyze(true)} disabled={refreshing} className="btn-ghost">
          {refreshing ? <Spinner size={14} /> : <RefreshCw size={14} />} Recalculate
        </button>
      </div>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden border p-6 md:p-8"
        style={{ borderColor: `${meta.ring}40`, background: `linear-gradient(135deg, ${meta.ring}14, transparent 55%)` }}
      >
        <div className="grid md:grid-cols-[auto_1fr] gap-6 items-center">
          <div className="relative w-28 h-28 shrink-0 mx-auto md:mx-0">
            <svg width="112" height="112" className="-rotate-90">
              <circle cx="56" cy="56" r="48" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
              <circle cx="56" cy="56" r="48" fill="none" stroke={meta.ring} strokeWidth="9" strokeLinecap="round"
                strokeDasharray={`${(data.score / 100) * 301.6} 301.6`} style={{ transition: 'stroke-dasharray 0.9s ease' }} />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <p className="font-display font-bold text-white text-2xl leading-none">{data.score}</p>
                <p className="text-[9px] uppercase tracking-widest text-faint font-bold mt-0.5">/ 100</p>
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <TierBadge tier={data.tier} size="md" />
              {data.verified && <Badge tone="cyan"><BadgeCheck size={11} /> Verified badge active</Badge>}
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-white mt-3">
              {data.tier === 'elite' ? 'You\u2019re at the top of the marketplace.' : `You\u2019re a ${data.label} clipper.`}
            </h2>
            {data.next ? (
              <div className="mt-4 max-w-md">
                <div className="flex justify-between text-xs font-mono mb-1.5">
                  <span className="text-mut">{data.score} / {data.next.at} to {data.next.label}</span>
                  <span className="font-bold" style={{ color: meta.ring }}>{data.next.needed} pts away</span>
                </div>
                <ProgressBar value={data.score} max={data.next.at} />
              </div>
            ) : (
              <p className="text-sm text-mut mt-3">Maximum tier reached — keep your activity up to hold it.</p>
            )}
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-5 gap-5">
        {/* Score breakdown */}
        <div className="lg:col-span-3 glass rounded-2xl p-6">
          <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-faint mb-5">How your score is built</p>
          <div className="space-y-4">
            {data.breakdown.map((b: any) => (
              <div key={b.key}>
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <p className="text-sm font-bold text-white">{b.label} <span className="text-faint font-mono text-xs ml-1">{b.value}</span></p>
                  <span className={`font-mono text-xs font-bold ${b.pts >= b.max ? 'text-primary' : 'text-mut'}`}>{b.pts}/{b.max}</span>
                </div>
                <ProgressBar value={b.pts} max={b.max} tone={b.pts >= b.max ? 'lime' : 'violet'} />
                {b.hint && (
                  <p className="flex items-start gap-1.5 text-[11px] text-mut mt-1.5">
                    <Lightbulb size={11} className="text-violet mt-0.5 shrink-0" /> {b.hint}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-white/8">
            <Link to="/dashboard/campaigns" className="btn-primary text-xs">Find a campaign <ArrowRight size={13} /></Link>
            <Link to="/dashboard/connections" className="btn-ghost text-xs">Connect platforms</Link>
            <Link to="/dashboard/eligibility" className="btn-ghost text-xs">Check eligibility</Link>
          </div>
        </div>

        {/* Tier ladder */}
        <div className="lg:col-span-2 glass rounded-2xl p-6">
          <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-faint mb-4">Tier ladder & perks</p>
          <div className="space-y-3">
            {[...data.tiers].reverse().map((t: any) => {
              const tMeta = TIER_META[t.key];
              const idx = data.tiers.findIndex((x: any) => x.key === t.key);
              const reached = idx <= currentIdx;
              const isCurrent = t.key === data.tier;
              return (
                <div key={t.key} className={`rounded-xl border px-4 py-3.5 ${isCurrent ? '' : 'bg-white/3'} ${reached ? '' : 'opacity-70'}`}
                  style={isCurrent ? { borderColor: `${tMeta.ring}50`, background: `${tMeta.ring}10` } : { borderColor: 'rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center gap-2.5">
                    <TierBadge tier={t.key} />
                    <span className="text-[11px] font-mono text-faint">{t.min}+ pts</span>
                    <span className="ml-auto">
                      {isCurrent ? <Badge tone="lime">Current</Badge> : reached ? <Check size={14} className="text-primary" /> : <Lock size={13} className="text-faint" />}
                    </span>
                  </div>
                  <ul className="mt-2.5 space-y-1">
                    {(PERKS[t.key] || []).map((p) => (
                      <li key={p} className="text-[12px] text-mut flex items-start gap-1.5 leading-relaxed">
                        <span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: tMeta.ring }} /> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-faint mt-4 leading-relaxed">Tiers recalculate automatically as your stats change. Silver and above includes the verified badge — no manual review needed.</p>
        </div>
      </div>
    </div>
  );
}
