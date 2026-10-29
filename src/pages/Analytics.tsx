import { useState, useEffect } from 'react';
import { Eye, Sparkles, TrendingUp, CheckCircle2, Users, DollarSign, BarChart3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api, money, compact } from '../lib/api';
import { Spinner, Stat, EmptyState } from '../components/ui';
import { Sparkline, Bars, Donut } from '../components/Charts';

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: '#cdff4d', youtube: '#fb7185', instagram: '#8b7cff', twitter: '#6ee7f9',
};

export default function Analytics() {
  const { profile } = useAuth();
  const isOwner = profile?.role === 'owner';
  const [subs, setSubs] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    Promise.all([
      api(isOwner ? `submissions?owner_id=${profile.id}` : `submissions?clipper_id=${profile.id}`),
      isOwner ? api(`campaigns?owner_id=${profile.id}`) : Promise.resolve([]),
    ]).then(([s, c]) => { setSubs(s); setCampaigns(c); }).catch(console.error).finally(() => setLoading(false));
  }, [profile?.id, isOwner]);

  if (loading) return <div className="flex justify-center py-24"><Spinner size={30} /></div>;

  const sorted = [...subs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const totalViews = subs.reduce((a, s) => a + Number(s.views || 0), 0);
  const avgQuality = subs.length ? Math.round(subs.reduce((a, s) => a + Number(s.ai_quality || 0), 0) / subs.length) : 0;
  const avgViral = subs.length ? Math.round(subs.reduce((a, s) => a + Number(s.ai_viral || 0), 0) / subs.length) : 0;
  const approved = subs.filter((s) => s.status === 'approved' || s.status === 'paid');
  const approvalRate = subs.length ? Math.round((approved.length / subs.length) * 100) : 0;

  let acc = 0;
  const viewsSeries = sorted.length ? sorted.map((s) => (acc += Number(s.views || 0))) : [0, 0];

  const platformViews: Record<string, number> = {};
  subs.forEach((s) => { platformViews[s.platform] = (platformViews[s.platform] || 0) + Number(s.views || 0); });
  const donutSegments = Object.entries(platformViews).map(([p, v]) => ({
    label: p.charAt(0).toUpperCase() + p.slice(1), value: v, color: PLATFORM_COLORS[p] || '#9096a8',
  }));

  const statusCounts: Record<string, number> = {};
  subs.forEach((s) => { statusCounts[s.status] = (statusCounts[s.status] || 0) + 1; });
  const statusSegments = [
    { label: 'Approved', value: statusCounts.approved || 0, color: '#cdff4d' },
    { label: 'Pending', value: statusCounts.pending || 0, color: '#fbbf24' },
    { label: 'Rejected', value: statusCounts.rejected || 0, color: '#fb7185' },
  ].filter((s) => s.value > 0);

  const uniqueClippers = new Set(subs.map((s) => s.clipper_id)).size;
  const totalSpent = campaigns.reduce((a, c) => a + Number(c.spent || 0), 0);

  if (subs.length === 0 && campaigns.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold text-white">Analytics</h1>
        <EmptyState icon={<BarChart3 size={22} />} title="No data yet" desc={isOwner ? 'Launch a campaign and approve clips to see performance data.' : 'Submit clips to campaigns to unlock your performance analytics.'} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Analytics</h1>
        <p className="text-sm text-mut mt-1">{isOwner ? 'Campaign performance and clipper output.' : 'Your clip performance across every campaign.'}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={<Eye size={16} />} label="Total views" value={compact(totalViews)} tone="cyan" sub={`${subs.length} clips`} />
        <Stat icon={<Sparkles size={16} />} label="Avg AI quality" value={`${avgQuality}/100`} tone="violet" sub={`viral score ${avgViral}/100`} />
        {isOwner ? (
          <>
            <Stat icon={<DollarSign size={16} />} label="Total released" value={money(totalSpent)} sub="escrow to clippers" />
            <Stat icon={<Users size={16} />} label="Active clippers" value={uniqueClippers} tone="amber" sub="submitted clips" />
          </>
        ) : (
          <>
            <Stat icon={<CheckCircle2 size={16} />} label="Approval rate" value={`${approvalRate}%`} sub={`${approved.length} of ${subs.length} approved`} />
            <Stat icon={<TrendingUp size={16} />} label="Earnings" value={money(profile.total_earnings)} tone="amber" sub="lifetime" />
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        <div className="glass rounded-2xl p-6 lg:col-span-3">
          <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-faint mb-1">Cumulative views</p>
          <p className="font-display text-2xl font-bold text-white mb-3">{compact(totalViews)}</p>
          <Sparkline data={viewsSeries} height={130} color="#6ee7f9" />
        </div>
        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-faint mb-5">{isOwner ? 'Submissions by status' : 'Views by platform'}</p>
          {isOwner ? (
            statusSegments.length ? <Donut segments={statusSegments} centerValue={String(subs.length)} centerLabel="clips" /> : <p className="text-sm text-mut py-8 text-center">No submissions yet.</p>
          ) : (
            donutSegments.length ? <Donut segments={donutSegments} centerValue={compact(totalViews)} centerLabel="views" /> : <p className="text-sm text-mut py-8 text-center">No clips yet.</p>
          )}
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-faint mb-5">{isOwner ? 'Spend by campaign' : 'Views per clip (latest)'}</p>
        {isOwner ? (
          campaigns.length ? (
            <Bars data={campaigns.slice(0, 8).map((c) => ({ label: c.title.length > 10 ? c.title.slice(0, 10) + '…' : c.title, value: Number(c.spent || 0) }))} color="#8b7cff" format={(n) => money(n)} />
          ) : <p className="text-sm text-mut py-8 text-center">No campaigns yet.</p>
        ) : (
          sorted.length ? (
            <Bars data={sorted.slice(-8).map((s) => ({ label: s.title.length > 10 ? s.title.slice(0, 10) + '…' : s.title, value: Number(s.views || 0) }))} color="#cdff4d" format={(n) => compact(n)} />
          ) : <p className="text-sm text-mut py-8 text-center">No clips yet.</p>
        )}
      </div>
    </div>
  );
}
