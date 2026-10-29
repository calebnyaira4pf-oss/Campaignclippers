import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet, TrendingUp, Eye, Star, Megaphone, ArrowRight, Sparkles, Users,
  DollarSign, Clapperboard, PlusCircle, CheckCircle2, XCircle, Compass,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api, money, compact, timeAgo, calcEarnings } from '../lib/api';
import { Stat, StatusBadge, Badge, Spinner, EmptyState, Avatar, ProgressBar } from '../components/ui';
import { Sparkline, Bars } from '../components/Charts';
import { PlatformIcon } from '../components/Platform';

export default function DashboardHome() {
  const { profile } = useAuth();
  if (profile?.role === 'owner') return <OwnerHome />;
  return <ClipperHome />;
}

function ClipperHome() {
  const { profile } = useAuth();
  const [apps, setApps] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    Promise.all([
      api(`applications?clipper_id=${profile.id}`),
      api(`submissions?clipper_id=${profile.id}`),
      api(`transactions?profile_id=${profile.id}`),
    ])
      .then(([a, s, t]) => { setApps(a); setSubs(s); setTxns(t); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [profile?.id]);

  if (loading) return <div className="flex justify-center py-24"><Spinner size={30} /></div>;

  const earningTxns = txns.filter((t) => t.type === 'earning').sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  let acc = 0;
  const earningsSeries = earningTxns.length ? earningTxns.map((t) => (acc += Number(t.amount))) : [0, 0];
  const activeApps = apps.filter((a) => a.status === 'approved');

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Hey, {profile.name?.split(' ')[0]} 👋</h1>
          <p className="text-sm text-mut mt-1">Here's how your clips are performing.</p>
        </div>
        <Link to="/dashboard/campaigns" className="btn-primary"><Compass size={15} /> Browse campaigns</Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={<Wallet size={16} />} label="Wallet balance" value={money(profile.balance)} sub={<Link to="/dashboard/wallet" className="text-primary font-bold">Withdraw →</Link>} />
        <Stat icon={<DollarSign size={16} />} label="Lifetime earnings" value={money(profile.total_earnings)} tone="violet" sub={`${earningTxns.length} approved payouts`} />
        <Stat icon={<Eye size={16} />} label="Total views" value={compact(profile.total_views)} tone="cyan" sub="across all platforms" />
        <Stat icon={<Star size={16} />} label="Rating" value={Number(profile.rating) > 0 ? `${Number(profile.rating).toFixed(1)}` : '—'} tone="amber" sub={`${profile.rating_count || 0} reviews`} />
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        <div className="glass rounded-2xl p-6 lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-faint">Cumulative earnings</p>
              <p className="font-display text-2xl font-bold text-white mt-1">{money(profile.total_earnings)}</p>
            </div>
            <Badge tone="lime"><TrendingUp size={11} /> Escrow-backed</Badge>
          </div>
          <Sparkline data={earningsSeries} height={120} />
        </div>

        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-faint">Active campaigns</p>
            <Link to="/dashboard/work" className="text-[11px] font-bold text-primary hover:underline">View all</Link>
          </div>
          {activeApps.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-mut">No active campaigns yet.</p>
              <Link to="/dashboard/campaigns" className="text-primary text-sm font-bold hover:underline">Apply to one →</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activeApps.slice(0, 4).map((a) => (
                <Link key={a.id} to={`/dashboard/campaigns/${a.campaign_id}`} className="flex items-center gap-3 rounded-xl bg-white/4 border border-white/8 px-4 py-3 hover:border-primary/30 transition-colors">
                  <span className="w-8 h-8 rounded-lg bg-primary/12 text-primary grid place-items-center shrink-0"><Megaphone size={15} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate">{a.campaign_title}</p>
                    <p className="text-[11px] text-faint">Approved {timeAgo(a.created_at)}</p>
                  </div>
                  <ArrowRight size={14} className="text-faint" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-faint">Recent submissions</p>
          <Link to="/dashboard/work" className="text-[11px] font-bold text-primary hover:underline">All submissions</Link>
        </div>
        {subs.length === 0 ? (
          <EmptyState icon={<Clapperboard size={22} />} title="No clips submitted yet" desc="Get approved for a campaign, then submit your first clip to start earning." />
        ) : (
          <div className="space-y-2.5">
            {subs.slice(0, 5).map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-white/3 border border-white/8 px-4 py-3">
                <PlatformIcon platform={s.platform} size={16} className="text-mut shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white truncate">{s.title}</p>
                  <p className="text-[11px] text-faint truncate">{s.campaign_title} · {timeAgo(s.created_at)}</p>
                </div>
                <span className="text-xs font-mono text-mut">{compact(s.views)} views</span>
                <Badge tone="violet"><Sparkles size={10} /> AI {s.ai_quality}</Badge>
                {Number(s.earnings) > 0 && <span className="text-sm font-mono text-primary">{money(s.earnings)}</span>}
                <StatusBadge status={s.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OwnerHome() {
  const { profile } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const fetchAll = useCallback(() => {
    if (!profile?.id) return Promise.resolve();
    return Promise.all([
      api(`campaigns?owner_id=${profile.id}`),
      api(`applications?owner_id=${profile.id}`),
      api(`submissions?owner_id=${profile.id}`),
    ]).then(([c, a, s]) => { setCampaigns(c); setApps(a); setSubs(s); }).catch(console.error);
  }, [profile?.id]);

  useEffect(() => { fetchAll()?.finally(() => setLoading(false)); }, [fetchAll]);

  if (loading) return <div className="flex justify-center py-24"><Spinner size={30} /></div>;

  const active = campaigns.filter((c) => c.status === 'active');
  const totalBudget = campaigns.reduce((a, c) => a + Number(c.budget || 0), 0);
  const totalSpent = campaigns.reduce((a, c) => a + Number(c.spent || 0), 0);
  const pendingApps = apps.filter((a) => a.status === 'pending');
  const pendingSubs = subs.filter((s) => s.status === 'pending');

  const decideApp = async (id: number, status: string) => {
    setBusyId(id);
    try {
      await api('applications', { method: 'PUT', body: { id, status } });
      await fetchAll();
    } catch (e) { console.error(e); }
    setBusyId(null);
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">{profile.name}</h1>
          <p className="text-sm text-mut mt-1">Your campaigns at a glance.</p>
        </div>
        <Link to="/dashboard/campaigns/new" className="btn-primary"><PlusCircle size={15} /> New campaign</Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={<Megaphone size={16} />} label="Active campaigns" value={active.length} sub={`${campaigns.length} total`} />
        <Stat icon={<Wallet size={16} />} label="Total budget" value={money(totalBudget)} tone="violet" sub="held in escrow" />
        <Stat icon={<DollarSign size={16} />} label="Released to clippers" value={money(totalSpent)} tone="cyan" sub={`${Math.round(totalBudget ? (totalSpent / totalBudget) * 100 : 0)}% of budget`} />
        <Stat icon={<Users size={16} />} label="Pending reviews" value={pendingApps.length + pendingSubs.length} tone="amber" sub={`${pendingApps.length} applicants · ${pendingSubs.length} clips`} />
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        <div className="glass rounded-2xl p-6 lg:col-span-3">
          <div className="flex items-center justify-between mb-5">
            <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-faint">Spend by campaign</p>
            <Link to="/dashboard/analytics" className="text-[11px] font-bold text-primary hover:underline">Full analytics</Link>
          </div>
          {campaigns.length === 0 ? (
            <p className="text-sm text-mut py-8 text-center">Launch a campaign to see spend data.</p>
          ) : (
            <Bars
              data={campaigns.slice(0, 6).map((c) => ({ label: c.title.length > 12 ? c.title.slice(0, 12) + '…' : c.title, value: Number(c.spent || 0) }))}
              color="#8b7cff"
              format={(n) => money(n)}
            />
          )}
        </div>

        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-faint mb-4">Pending applications</p>
          {pendingApps.length === 0 ? (
            <p className="text-sm text-mut py-6 text-center">No applications waiting.</p>
          ) : (
            <div className="space-y-3">
              {pendingApps.slice(0, 4).map((a) => (
                <div key={a.id} className="rounded-xl bg-white/4 border border-white/8 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={a.clipper_name} src={a.clipper_avatar} size={30} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white truncate">{a.clipper_name}</p>
                      <p className="text-[11px] text-faint truncate">{a.campaign_title}</p>
                    </div>
                    <button disabled={busyId === a.id} onClick={() => decideApp(a.id, 'approved')} title="Approve" className="w-7 h-7 rounded-lg bg-emerald-400/10 text-emerald-300 grid place-items-center hover:bg-emerald-400/20 transition-colors"><CheckCircle2 size={15} /></button>
                    <button disabled={busyId === a.id} onClick={() => decideApp(a.id, 'rejected')} title="Reject" className="w-7 h-7 rounded-lg bg-rose-400/10 text-rose-300 grid place-items-center hover:bg-rose-400/20 transition-colors"><XCircle size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-faint">Clips awaiting review</p>
          <Link to="/dashboard/campaigns" className="text-[11px] font-bold text-primary hover:underline">My campaigns</Link>
        </div>
        {pendingSubs.length === 0 ? (
          <EmptyState icon={<Clapperboard size={22} />} title="Review queue is clear" desc="New submissions will appear here with their AI quality scores." />
        ) : (
          <div className="space-y-2.5">
            {pendingSubs.slice(0, 5).map((s) => (
              <Link key={s.id} to={`/dashboard/campaigns/${s.campaign_id}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-white/3 border border-white/8 px-4 py-3 hover:border-violet/30 transition-colors">
                <PlatformIcon platform={s.platform} size={16} className="text-mut shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white truncate">{s.title}</p>
                  <p className="text-[11px] text-faint truncate">{s.clipper_name} · {s.campaign_title}</p>
                </div>
                <span className="text-xs font-mono text-mut">{compact(s.views)} views</span>
                <Badge tone="violet"><Sparkles size={10} /> Quality {s.ai_quality}</Badge>
                <Badge tone="cyan">Viral {s.ai_viral}</Badge>
                <ArrowRight size={14} className="text-faint" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
