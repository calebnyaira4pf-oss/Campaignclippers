import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Gift, Copy, Check, Users, Sparkles, DollarSign, Share2, Clock, Trophy,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api, money, timeAgo } from '../lib/api';
import { Spinner, Stat, Badge, EmptyState, Avatar, ProgressBar, ErrorNote } from '../components/ui';

const MILESTONES = [
  { at: 5, bonus: 25, label: 'Rising Referrer' },
  { at: 15, bonus: 100, label: 'Super Connector' },
  { at: 40, bonus: 400, label: 'Ambassador' },
];

export default function Referrals() {
  const { profile } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);

  const fetchData = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const d = await api(`referrals?profile_id=${profile.id}`);
      setData(d);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="flex justify-center py-24"><Spinner size={30} /></div>;
  if (error || !data) return <EmptyState icon={<Gift size={22} />} title="Couldn't load referrals" desc={error} />;

  const link = `${window.location.origin}/signup?ref=${data.code}`;
  const nextMilestone = MILESTONES.find((m) => data.stats.active < m.at);

  const copy = async (what: 'link' | 'code') => {
    try {
      await navigator.clipboard.writeText(what === 'link' ? link : data.code);
      setCopied(what);
      setTimeout(() => setCopied(null), 1800);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <div className="space-y-7">
      <div>
        <h1 className="font-display text-3xl font-bold text-white flex items-center gap-2.5">
          <Gift size={26} className="text-primary" /> Referral program
        </h1>
        <p className="text-sm text-mut mt-1">Earn {money(data.reward_per_referral)} for every {profile.role === 'owner' ? 'brand or clipper' : 'friend'} who joins and becomes active.</p>
      </div>

      {/* Share card */}
      <motion.div
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden border border-primary/25 bg-gradient-to-br from-primary/10 via-panel to-ink p-6 md:p-8"
      >
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="relative grid lg:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <Badge tone="lime" className="mb-3"><Sparkles size={11} /> Your invite link</Badge>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="input flex-1 font-mono text-[13px] !py-3 truncate select-all">{link}</div>
              <button onClick={() => copy('link')} className="btn-primary shrink-0">
                {copied === 'link' ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy link</>}
              </button>
            </div>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <span className="text-xs text-mut">Referral code:</span>
              <button onClick={() => copy('code')} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/6 border border-white/12 font-mono text-sm font-bold text-primary hover:border-primary/40 transition-colors">
                {data.code}
                {copied === 'code' ? <Check size={13} /> : <Copy size={13} className="text-mut" />}
              </button>
              <span className="text-[11px] text-faint">New users can also enter this at signup.</span>
            </div>
          </div>
          <div className="hidden lg:grid place-items-center w-24 h-24 rounded-3xl bg-primary/12 text-primary">
            <Share2 size={38} />
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={<Users size={16} />} label="Invited" value={data.stats.invited} sub="signed up with your code" />
        <Stat icon={<Sparkles size={16} />} label="Became active" value={data.stats.active} tone="violet" sub="qualified referrals" />
        <Stat icon={<Clock size={16} />} label="Pending" value={data.stats.pending} tone="cyan" sub="not active yet" />
        <Stat icon={<DollarSign size={16} />} label="Referral earnings" value={money(data.stats.earned)} tone="amber" sub="paid to your wallet" />
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        {/* How it works + milestones */}
        <div className="lg:col-span-2 space-y-5">
          <div className="glass rounded-2xl p-6">
            <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-faint mb-5">How it works</p>
            <div className="space-y-5">
              {[
                { n: '01', t: 'Share your link', d: 'Send it to clippers, editors, brands \u2014 anyone who should be on the platform.' },
                { n: '02', t: 'They join & get active', d: 'A clipper qualifies at their first paid clip; a brand at their first campaign launch.' },
                { n: '03', t: `You both win`, d: `${money(data.reward_per_referral)} lands in your wallet instantly \u2014 escrow-backed like everything else.` },
              ].map((s) => (
                <div key={s.n} className="flex gap-4">
                  <span className="font-mono text-primary text-sm font-bold pt-0.5">{s.n}</span>
                  <div>
                    <p className="font-bold text-white text-sm">{s.t}</p>
                    <p className="text-[13px] text-mut mt-0.5 leading-relaxed">{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-faint mb-4">Milestone bonuses</p>
            {nextMilestone && (
              <div className="mb-5">
                <div className="flex justify-between text-xs font-mono mb-1.5">
                  <span className="text-mut">{data.stats.active} / {nextMilestone.at} active referrals</span>
                  <span className="text-primary font-bold">+{money(nextMilestone.bonus)} bonus</span>
                </div>
                <ProgressBar value={data.stats.active} max={nextMilestone.at} />
              </div>
            )}
            <div className="space-y-2.5">
              {MILESTONES.map((m) => {
                const hit = data.stats.active >= m.at;
                return (
                  <div key={m.at} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${hit ? 'border-primary/30 bg-primary/6' : 'border-white/8 bg-white/3'}`}>
                    <span className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${hit ? 'bg-primary/15 text-primary' : 'bg-white/6 text-faint'}`}>
                      <Trophy size={15} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold ${hit ? 'text-primary' : 'text-white'}`}>{m.label}</p>
                      <p className="text-[11px] text-faint">{m.at} active referrals</p>
                    </div>
                    <span className={`font-mono text-sm font-bold ${hit ? 'text-primary' : 'text-mut'}`}>+{money(m.bonus)}</span>
                    {hit && <Check size={15} className="text-primary" />}
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-faint mt-4 leading-relaxed">Milestone bonuses are credited automatically at the end of each month. Self-referrals and duplicate accounts are excluded (see Terms).</p>
          </div>
        </div>

        {/* Referral list */}
        <div className="lg:col-span-3">
          <div className="glass rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-faint">Your referrals</p>
              <p className="text-[11px] text-faint font-mono">{data.referrals.length} total</p>
            </div>
            {data.referrals.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<Gift size={22} />}
                  title="No referrals yet"
                  desc="Share your link to start earning. Every active signup is worth real money — paid straight to your wallet."
                  action={<button onClick={() => copy('link')} className="btn-primary">{copied === 'link' ? 'Copied!' : 'Copy invite link'}</button>}
                />
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {data.referrals.map((r: any) => (
                  <div key={r.id} className="flex items-center gap-4 px-6 py-4">
                    <Avatar name={r.referred_name} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white truncate">{r.referred_name}</p>
                      <p className="text-[11px] text-faint font-mono mt-0.5 capitalize">{r.referred_role === 'owner' ? 'Brand' : 'Clipper'} · joined {timeAgo(r.created_at)}</p>
                    </div>
                    {r.status === 'rewarded' ? (
                      <>
                        <span className="font-mono font-bold text-sm text-primary">+{money(r.reward)}</span>
                        <Badge tone="lime"><Check size={10} /> Rewarded</Badge>
                      </>
                    ) : (
                      <Badge tone="amber"><Clock size={10} /> Signed up</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
