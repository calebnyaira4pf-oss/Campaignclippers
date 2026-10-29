import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, PlusCircle, Calendar, Users, Pause, Play, ArrowRight, Megaphone, SlidersHorizontal, Target, ShieldCheck, BadgeCheck, Users2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api, money, timeAgo, rewardLabel, CATEGORIES, PLATFORMS } from '../lib/api';
import { Spinner, StatusBadge, Badge, EmptyState, ProgressBar } from '../components/ui';
import { PlatformIcon, platformLabel } from '../components/Platform';

export default function Campaigns() {
  const { profile } = useAuth();
  if (profile?.role === 'owner') return <OwnerCampaigns />;
  return <BrowseCampaigns />;
}

function CampaignCard({ c, match }: { c: any; match?: any }) {
  const budget = Number(c.budget || 0);
  const spent = Number(c.spent || 0);
  return (
    <Link to={`/dashboard/campaigns/${c.id}`} className="glass rounded-2xl overflow-hidden flex flex-col hover:border-primary/35 hover:-translate-y-0.5 transition-all">
      <div className="relative h-36 bg-elev">
        {c.thumbnail_url && <img src={c.thumbnail_url} alt={`${c.title} — ${c.category} campaign by ${c.brand_name}`} loading="lazy" className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 to-transparent" />
        {match && (
          <div className="absolute top-3 left-4">
            <Badge tone={match.status === 'qualified' ? 'lime' : match.status === 'partial' ? 'amber' : 'red'}>
              <Target size={10} /> {match.score}% match
            </Badge>
          </div>
        )}
        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
          <Badge tone="lime">{rewardLabel(c)}</Badge>
          <Badge>{c.category}</Badge>
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <p className="text-[11px] uppercase tracking-[0.12em] font-bold text-faint">{c.brand_name}</p>
        <h3 className="font-display font-bold text-white text-lg leading-snug mt-1">{c.title}</h3>
        <p className="text-[13px] text-mut mt-2 line-clamp-2 leading-relaxed flex-1">{c.description}</p>
        {c.requirements && (Number(c.requirements.min_followers) > 0 || c.requirements.min_tier !== 'any' || c.requirements.verified_only) && (
          <div className="flex gap-1.5 flex-wrap mt-3">
            {Number(c.requirements.min_followers) > 0 && (
              <Badge tone="cyan"><Users2 size={9} /> {Number(c.requirements.min_followers) >= 1000 ? `${Number(c.requirements.min_followers) / 1000}K+` : `${c.requirements.min_followers}+`}</Badge>
            )}
            {c.requirements.min_tier !== 'any' && (
              <Badge tone="cyan"><ShieldCheck size={9} /> {c.requirements.min_tier.charAt(0).toUpperCase() + c.requirements.min_tier.slice(1)}+</Badge>
            )}
            {c.requirements.verified_only && <Badge tone="cyan"><BadgeCheck size={9} /> Verified</Badge>}
          </div>
        )}
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-faint">Budget used</span>
            <span className="text-white/80">{money(spent)} / {money(budget)}</span>
          </div>
          <ProgressBar value={spent} max={budget} />
        </div>
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/8">
          <div className="flex items-center gap-1.5 text-mut">
            {(c.platforms || []).slice(0, 4).map((p: string) => <PlatformIcon key={p} platform={p} size={13} />)}
          </div>
          <span className="flex-1" />
          {c.deadline && <span className="text-[11px] text-faint flex items-center gap-1"><Calendar size={11} /> {c.deadline}</span>}
          <span className="text-[11px] text-faint flex items-center gap-1"><Users size={11} /> {c.max_clippers}</span>
        </div>
      </div>
    </Link>
  );
}

function BrowseCampaigns() {
  const { profile } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [matches, setMatches] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('All');
  const [platform, setPlatform] = useState('all');
  const [eligibleOnly, setEligibleOnly] = useState(false);

  useEffect(() => {
    api('campaigns?status=active')
      .then(setCampaigns)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    api(`eligibility?profile_id=${profile.id}`)
      .then((d: any) => {
        const map: Record<number, any> = {};
        for (const r of d.results || []) map[r.campaign.id] = { score: r.score, status: r.status, eligible: r.eligible };
        setMatches(map);
      })
      .catch(() => {});
  }, [profile?.id]);

  const eligibleCount = campaigns.filter((c) => matches[c.id]?.eligible).length;

  const filtered = campaigns.filter((c) => {
    const text = `${c.title} ${c.brand_name} ${c.description} ${(c.keywords || []).join(' ')}`.toLowerCase();
    if (q && !text.includes(q.toLowerCase())) return false;
    if (category !== 'All' && c.category !== category) return false;
    if (platform !== 'all' && !(c.platforms || []).includes(platform)) return false;
    if (eligibleOnly && !matches[c.id]?.eligible) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Browse campaigns</h1>
          <p className="text-sm text-mut mt-1">{campaigns.length} live campaigns with escrow-loaded budgets.</p>
        </div>
        <Link to="/dashboard/eligibility" className="btn-ghost text-xs"><Target size={14} className="text-primary" /> Check my eligibility</Link>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <input className="input pl-10" placeholder="Search by title, brand or keyword…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input md:w-44" value={platform} onChange={(e) => setPlatform(e.target.value)}>
          <option value="all">All platforms</option>
          {PLATFORMS.map((p) => <option key={p} value={p}>{platformLabel(p)}</option>)}
        </select>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <button
          onClick={() => setEligibleOnly(!eligibleOnly)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors inline-flex items-center gap-1.5 ${eligibleOnly ? 'bg-cyan text-ink border-cyan' : 'text-cyan border-cyan/30 hover:border-cyan/60'}`}
        >
          <CheckCircle2 size={12} /> Eligible for me{Object.keys(matches).length > 0 ? ` (${eligibleCount})` : ''}
        </button>
        <span className="w-px h-5 bg-white/10" />
        {['All', ...CATEGORIES].map((cat) => (
          <button key={cat} onClick={() => setCategory(cat)} className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${category === cat ? 'bg-primary text-ink border-primary' : 'text-mut border-white/10 hover:text-white'}`}>
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size={30} /></div>
      ) : error ? (
        <EmptyState icon={<SlidersHorizontal size={22} />} title="Couldn't load campaigns" desc={error} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={22} />}
          title={eligibleOnly ? 'No campaigns you currently qualify for' : 'No campaigns match'}
          desc={eligibleOnly ? 'Connect more accounts or level up your verification tier to unlock campaigns with brand requirements.' : 'Try clearing your filters or searching different keywords.'}
          action={eligibleOnly ? <Link to="/dashboard/eligibility" className="btn-primary">See how to qualify</Link> : undefined}
        />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((c) => <CampaignCard key={c.id} c={c} match={matches[c.id]} />)}
        </div>
      )}
    </div>
  );
}

function OwnerCampaigns() {
  const { profile } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const fetchAll = () => api(`campaigns?owner_id=${profile.id}`).then(setCampaigns).catch(console.error);

  useEffect(() => {
    if (!profile?.id) return;
    fetchAll().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const toggleStatus = async (c: any) => {
    setBusyId(c.id);
    try {
      await api('campaigns', { method: 'PUT', body: { id: c.id, status: c.status === 'active' ? 'paused' : 'active' } });
      await fetchAll();
    } catch (e) { console.error(e); }
    setBusyId(null);
  };

  if (loading) return <div className="flex justify-center py-24"><Spinner size={30} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">My campaigns</h1>
          <p className="text-sm text-mut mt-1">{campaigns.filter((c) => c.status === 'active').length} active · {campaigns.length} total</p>
        </div>
        <Link to="/dashboard/campaigns/new" className="btn-primary"><PlusCircle size={15} /> New campaign</Link>
      </div>

      {campaigns.length === 0 ? (
        <EmptyState
          icon={<Megaphone size={22} />}
          title="No campaigns yet"
          desc="Create your first campaign to start receiving clips from 12,000+ clippers."
          action={<Link to="/dashboard/campaigns/new" className="btn-primary">Create campaign</Link>}
        />
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <div key={c.id} className="glass rounded-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4">
              <div className="w-full md:w-28 h-24 md:h-16 rounded-xl overflow-hidden bg-elev shrink-0">
                {c.thumbnail_url && <img src={c.thumbnail_url} alt={`${c.title} campaign thumbnail`} loading="lazy" className="w-full h-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="font-display font-bold text-white truncate">{c.title}</h3>
                  <StatusBadge status={c.status} />
                </div>
                <p className="text-xs text-faint mt-1">{c.category} · {rewardLabel(c)} · created {timeAgo(c.created_at)}</p>
                <div className="mt-2.5 max-w-sm space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-faint">Spent</span>
                    <span className="text-white/80">{money(c.spent)} / {money(c.budget)}</span>
                  </div>
                  <ProgressBar value={Number(c.spent)} max={Number(c.budget)} tone="violet" />
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button disabled={busyId === c.id} onClick={() => toggleStatus(c)} className="btn-ghost text-xs px-3 py-2">
                  {c.status === 'active' ? <><Pause size={13} /> Pause</> : <><Play size={13} /> Activate</>}
                </button>
                <Link to={`/dashboard/campaigns/${c.id}`} className="btn-primary text-xs px-3 py-2">Manage <ArrowRight size={13} /></Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
