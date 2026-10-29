import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Send, Clapperboard, Eye, Heart, Sparkles, ArrowRight, LinkIcon, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api, money, compact, timeAgo } from '../lib/api';
import { Spinner, StatusBadge, Badge, EmptyState } from '../components/ui';
import { PlatformIcon } from '../components/Platform';

export default function Work() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<'applications' | 'submissions'>('applications');
  const [apps, setApps] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState('');

  const refreshStats = async (s: any) => {
    setBusyId(s.id);
    setNotice('');
    try {
      const updated: any = await api('submissions', { method: 'PUT', body: { id: s.id, action: 'refresh_stats' } });
      if (updated.refresh_failed) {
        setNotice(`“${s.title}”: ${updated.reason}`);
      } else {
        setNotice(`“${s.title}” synced live — ${compact(updated.views)} views.`);
        setSubs((prev) => prev.map((x) => (x.id === s.id ? { ...x, views: updated.views, likes: updated.likes } : x)));
      }
    } catch (e: any) {
      setNotice(e.message);
    }
    setBusyId(null);
  };

  useEffect(() => {
    if (!profile?.id) return;
    Promise.all([
      api(`applications?clipper_id=${profile.id}`),
      api(`submissions?clipper_id=${profile.id}`),
    ]).then(([a, s]) => { setApps(a); setSubs(s); }).catch(console.error).finally(() => setLoading(false));
  }, [profile?.id]);

  if (profile?.role === 'owner') return <Navigate to="/dashboard/campaigns" replace />;
  if (loading) return <div className="flex justify-center py-24"><Spinner size={30} /></div>;

  const approvedApps = apps.filter((a) => a.status === 'approved');
  const totalEarned = subs.reduce((acc, s) => acc + Number(s.earnings || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">My work</h1>
        <p className="text-sm text-mut mt-1">{approvedApps.length} active campaigns · {subs.length} clips submitted · {money(totalEarned)} earned</p>
      </div>

      {notice && <div className="rounded-xl border border-cyan/25 bg-cyan/10 text-cyan text-sm px-4 py-3">{notice}</div>}

      <div className="flex gap-2">
        {([['applications', `Applications (${apps.length})`], ['submissions', `Submissions (${subs.length})`]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${tab === k ? 'bg-primary/12 text-primary border border-primary/30' : 'text-mut hover:text-white border border-white/10'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'applications' && (
        apps.length === 0 ? (
          <EmptyState icon={<Send size={22} />} title="No applications yet" desc="Browse live campaigns and pitch the brands you want to clip for." action={<Link to="/dashboard/campaigns" className="btn-primary">Browse campaigns</Link>} />
        ) : (
          <div className="space-y-3">
            {apps.map((a) => (
              <Link key={a.id} to={`/dashboard/campaigns/${a.campaign_id}`} className="glass rounded-2xl p-5 flex items-center gap-4 hover:border-primary/30 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white truncate">{a.campaign_title}</p>
                  <p className="text-xs text-faint mt-1">Applied {timeAgo(a.created_at)}</p>
                  <p className="text-[13px] text-mut mt-2 line-clamp-2 leading-relaxed">{a.pitch}</p>
                </div>
                <StatusBadge status={a.status} />
                <ArrowRight size={15} className="text-faint shrink-0" />
              </Link>
            ))}
          </div>
        )
      )}

      {tab === 'submissions' && (
        subs.length === 0 ? (
          <EmptyState icon={<Clapperboard size={22} />} title="No clips yet" desc="Once you're approved on a campaign, submit clips from the campaign page." action={<Link to="/dashboard/campaigns" className="btn-primary">Find a campaign</Link>} />
        ) : (
          <div className="space-y-3">
            {subs.map((s) => (
              <div key={s.id} className="glass rounded-2xl p-5">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <PlatformIcon platform={s.platform} size={16} className="text-mut" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-white truncate">{s.title}</p>
                    <p className="text-xs text-faint mt-0.5">{s.campaign_title} · {timeAgo(s.created_at)}</p>
                  </div>
                  <span className="text-xs font-mono text-mut flex items-center gap-1"><Eye size={12} /> {compact(s.views)}</span>
                  <span className="text-xs font-mono text-mut flex items-center gap-1"><Heart size={12} /> {compact(s.likes)}</span>
                  <Badge tone="violet"><Sparkles size={10} /> {s.ai_quality}</Badge>
                  <Badge tone="cyan">Viral {s.ai_viral}</Badge>
                  {Number(s.earnings) > 0 && <span className="font-mono text-primary font-bold text-sm">{money(s.earnings)}</span>}
                  <StatusBadge status={s.status} />
                  {s.video_url && <a href={s.video_url} target="_blank" rel="noreferrer" className="text-cyan hover:underline text-xs flex items-center gap-1"><LinkIcon size={12} /> Clip</a>}
                  <button
                    disabled={busyId === s.id}
                    onClick={() => refreshStats(s)}
                    title="Pull live view count from the platform"
                    className="w-7 h-7 rounded-lg grid place-items-center text-mut hover:text-white hover:bg-white/8 transition-colors"
                  >
                    <RefreshCw size={13} className={busyId === s.id ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
