import { useState, useEffect, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Target, RefreshCw, CheckCircle2, XCircle, Lightbulb, ArrowRight, Link2,
  Sparkles, Users, Activity, ChevronDown,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api, compact, rewardLabel } from '../lib/api';
import { Spinner, Badge, EmptyState, StatusBadge } from '../components/ui';
import { PlatformIcon, platformLabel } from '../components/Platform';

function ScoreRing({ score, size = 64, stroke = 6 }: { score: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const color = score >= 70 ? '#cdff4d' : score >= 40 ? '#fbbf24' : '#fb7185';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${(score / 100) * circ} ${circ}`}
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-display font-bold text-white" style={{ fontSize: size * 0.28 }}>
        {score}
      </span>
    </div>
  );
}

const STATUS_META: Record<string, { tone: string; label: string }> = {
  qualified: { tone: 'lime', label: 'Great match' },
  partial: { tone: 'amber', label: 'Partial match' },
  ineligible: { tone: 'red', label: 'Not eligible yet' },
};

export default function Eligibility() {
  const { profile } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'qualified' | 'partial' | 'ineligible'>('all');

  const analyze = useCallback(async (soft = false) => {
    if (!profile?.id) return;
    if (soft) setRefreshing(true);
    setError('');
    try {
      const d = await api(`eligibility?profile_id=${profile.id}`);
      setData(d);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.id]);

  useEffect(() => { analyze(); }, [analyze]);

  if (profile?.role === 'owner') return <Navigate to="/dashboard/campaigns" replace />;
  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Spinner size={30} />
      <p className="text-sm text-mut">Analyzing your connected accounts…</p>
    </div>
  );
  if (error || !data) return <EmptyState icon={<Target size={22} />} title="Analysis failed" desc={error || 'Try again in a moment.'} action={<button onClick={() => analyze()} className="btn-primary">Retry</button>} />;

  const { summary, results } = data;
  const shown = results.filter((r: any) => filter === 'all' || r.status === filter);

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white flex items-center gap-2.5">
            <Target size={26} className="text-primary" /> Campaign match
          </h1>
          <p className="text-sm text-mut mt-1">We analyzed your connected accounts against every live campaign.</p>
        </div>
        <button onClick={() => analyze(true)} disabled={refreshing} className="btn-ghost">
          {refreshing ? <Spinner size={14} /> : <RefreshCw size={14} />} Re-analyze
        </button>
      </div>

      {/* Summary */}
      <div className="glass rounded-2xl p-6">
        <div className="grid md:grid-cols-[auto_1fr] gap-6 items-center">
          <div className="flex items-center gap-5">
            <ScoreRing score={summary.readiness} size={96} stroke={8} />
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-faint">Profile readiness</p>
              <p className="font-display text-xl font-bold text-white mt-1">
                {summary.readiness >= 70 ? 'Brand-ready' : summary.readiness >= 40 ? 'Almost there' : 'Just getting started'}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs font-mono text-mut">
                <span className="inline-flex items-center gap-1"><Link2 size={11} /> {summary.connected} connected</span>
                <span className="inline-flex items-center gap-1"><Users size={11} /> {compact(summary.total_reach)} reach</span>
                <span className="inline-flex items-center gap-1"><Activity size={11} /> {summary.avg_engagement}% eng.</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {summary.top_hints.map((h: string, i: number) => (
              <div key={i} className="flex items-start gap-2.5 rounded-xl bg-violet/6 border border-violet/20 px-4 py-2.5">
                <Lightbulb size={14} className="text-violet mt-0.5 shrink-0" />
                <p className="text-[13px] text-white/85 leading-relaxed">{h}</p>
              </div>
            ))}
            {summary.connected === 0 && (
              <Link to="/dashboard/connections" className="btn-primary text-xs mt-1 inline-flex">Connect a platform <ArrowRight size={13} /></Link>
            )}
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {([
          ['all', `All (${results.length})`],
          ['qualified', `Great match (${summary.qualified})`],
          ['partial', `Partial (${summary.partial})`],
          ['ineligible', `Not eligible (${summary.ineligible})`],
        ] as const).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${filter === k ? 'bg-primary text-ink border-primary' : 'text-mut border-white/10 hover:text-white'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Results */}
      {shown.length === 0 ? (
        <EmptyState icon={<Target size={22} />} title="Nothing in this bucket" desc="Try a different filter." />
      ) : (
        <div className="space-y-3">
          {shown.map((r: any, i: number) => {
            const meta = STATUS_META[r.status];
            const open = expanded === r.campaign.id;
            return (
              <motion.div
                key={r.campaign.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3) }}
                className="glass rounded-2xl overflow-hidden"
              >
                <button onClick={() => setExpanded(open ? null : r.campaign.id)} className="w-full text-left p-5 flex items-center gap-4">
                  <ScoreRing score={r.score} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <p className="font-display font-bold text-white truncate">{r.campaign.title}</p>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      {r.applied && <StatusBadge status={r.applied} />}
                    </div>
                    <p className="text-xs text-faint mt-1">{r.campaign.brand_name} · {r.campaign.category} · {rewardLabel(r.campaign)}</p>
                    <div className="flex items-center gap-1.5 mt-2 text-mut">
                      {r.campaign.platforms.map((p: string) => <PlatformIcon key={p} platform={p} size={13} />)}
                      {r.hints.length > 0 && (
                        <span className="text-[11px] text-violet font-bold inline-flex items-center gap-1 ml-2"><Lightbulb size={11} /> {r.hints.length} hint{r.hints.length === 1 ? '' : 's'}</span>
                      )}
                    </div>
                  </div>
                  <ChevronDown size={17} className={`text-faint shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>

                {open && (
                  <div className="px-5 pb-5 border-t border-white/8 pt-4 grid lg:grid-cols-2 gap-5">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-faint mb-3">Eligibility checks</p>
                      <div className="space-y-2">
                        {r.checks.map((c: any, j: number) => (
                          <div key={j} className="flex items-start gap-2.5">
                            {c.pass
                              ? <CheckCircle2 size={15} className="text-primary mt-0.5 shrink-0" />
                              : <XCircle size={15} className="text-rose-300 mt-0.5 shrink-0" />}
                            <div>
                              <p className="text-[13px] font-bold text-white">{c.label}</p>
                              <p className="text-xs text-mut leading-relaxed">{c.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      {r.hints.length > 0 && (
                        <>
                          <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-faint mb-3">How to improve</p>
                          <div className="space-y-2">
                            {r.hints.map((h: string, j: number) => (
                              <div key={j} className="flex items-start gap-2.5 rounded-xl bg-violet/6 border border-violet/20 px-3.5 py-2.5">
                                <Sparkles size={13} className="text-violet mt-0.5 shrink-0" />
                                <p className="text-xs text-white/85 leading-relaxed">{h}</p>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                      <div className="mt-auto pt-4 flex gap-2">
                        <Link to={`/dashboard/campaigns/${r.campaign.id}`} className={`${r.status === 'qualified' && !r.applied ? 'btn-primary' : 'btn-ghost'} text-xs flex-1`}>
                          {r.applied ? 'View campaign' : r.status === 'qualified' ? 'Apply now' : 'View campaign'} <ArrowRight size={13} />
                        </Link>
                        {r.status !== 'qualified' && !r.applied && (
                          <Link to="/dashboard/connections" className="btn-ghost text-xs"><Link2 size={13} /> Connections</Link>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
