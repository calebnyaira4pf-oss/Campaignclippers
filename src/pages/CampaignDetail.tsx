import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Calendar, Users, Sparkles, CheckCircle2, XCircle, Send, Pause, Play,
  Trash2, Eye, Heart, LinkIcon, Clapperboard, ScrollText, Flag, RefreshCw,
  ShieldCheck, BadgeCheck, Users2, Zap, PenLine, Star,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api, money, compact, timeAgo, rewardLabel, calcEarnings } from '../lib/api';
import { Spinner, StatusBadge, Badge, EmptyState, ProgressBar, Avatar, Modal, Field, ErrorNote } from '../components/ui';
import { PlatformIcon, platformLabel } from '../components/Platform';
import TierBadge from '../components/TierBadge';
import Breadcrumbs from '../components/Breadcrumbs';
import { compact as compactNum } from '../lib/api';

export default function CampaignDetail() {
  const { id } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<any>(null);
  const [apps, setApps] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [tiers, setTiers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'overview' | 'applications' | 'submissions'>('overview');
  const [busyId, setBusyId] = useState<string | null>(null);

  // clipper interactions
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyMode, setApplyMode] = useState<'quick' | 'pitch'>('quick');
  const [pitch, setPitch] = useState('');
  const [note, setNote] = useState('');
  const [applyErr, setApplyErr] = useState('');
  const [myAccounts, setMyAccounts] = useState<any[]>([]);
  const [myTier, setMyTier] = useState<any>(null);
  const [applyLoading, setApplyLoading] = useState(false);

  const openApply = async () => {
    setApplyErr(''); setApplyMode('quick'); setApplyOpen(true);
    if (myTier || !profile?.id) return;
    setApplyLoading(true);
    try {
      const [accs, tier] = await Promise.all([
        api(`connections?profile_id=${profile.id}`),
        api(`tiers?profile_id=${profile.id}`).catch(() => null),
      ]);
      setMyAccounts(accs || []);
      setMyTier(tier);
    } catch { /* preview optional */ }
    setApplyLoading(false);
  };
  const [subForm, setSubForm] = useState({ title: '', video_url: '', platform: 'tiktok' });
  const [subErr, setSubErr] = useState('');
  const [subOk, setSubOk] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [c, a, s] = await Promise.all([
        api(`campaigns?id=${id}`),
        api(`applications?campaign_id=${id}`),
        api(`submissions?campaign_id=${id}`),
      ]);
      setCampaign(c); setApps(a); setSubs(s);
    } catch (e: any) {
      setError(e.message);
    }
  }, [id]);

  useEffect(() => { setLoading(true); fetchAll().finally(() => setLoading(false)); }, [fetchAll]);

  useEffect(() => {
    if (profile?.role !== 'owner') return;
    api('tiers?all=1').then((rows: any[]) => {
      const map: Record<number, string> = {};
      for (const r of rows) map[r.profile_id] = r.tier;
      setTiers(map);
    }).catch(() => {});
  }, [profile?.role]);

  if (loading) return <div className="flex justify-center py-24"><Spinner size={30} /></div>;
  if (error || !campaign) return <EmptyState icon={<Flag size={22} />} title="Campaign not found" desc={error || 'It may have been removed.'} action={<Link to="/dashboard/campaigns" className="btn-ghost">Back to campaigns</Link>} />;

  const isOwner = profile?.role === 'owner' && campaign.owner_id === profile.id;
  const myApp = apps.find((a) => a.clipper_id === profile?.id);
  const mySubs = subs.filter((s) => s.clipper_id === profile?.id);
  const approvedCount = apps.filter((a) => a.status === 'approved').length;
  const pendingApps = apps.filter((a) => a.status === 'pending');
  const pendingSubs = subs.filter((s) => s.status === 'pending');

  const decideApp = async (appId: number, status: string) => {
    setBusyId(`app-${appId}`);
    try { await api('applications', { method: 'PUT', body: { id: appId, status } }); await fetchAll(); } catch (e) { console.error(e); }
    setBusyId(null);
  };

  const decideSub = async (sub: any, action: 'approve' | 'reject') => {
    setBusyId(`sub-${sub.id}`);
    try {
      const earnings = action === 'approve' ? calcEarnings(campaign, sub.views) : 0;
      await api('submissions', { method: 'PUT', body: { id: sub.id, action, earnings } });
      await fetchAll();
    } catch (e) { console.error(e); }
    setBusyId(null);
  };

  const refreshSubStats = async (sub: any) => {
    setBusyId(`refresh-${sub.id}`);
    try {
      await api('submissions', { method: 'PUT', body: { id: sub.id, action: 'refresh_stats' } });
      await fetchAll();
    } catch (e) { console.error(e); }
    setBusyId(null);
  };

  const submitApplication = async () => {
    if (applyMode === 'pitch' && pitch.trim().length < 20) { setApplyErr('Write a pitch of at least 20 characters.'); return; }
    setApplyErr(''); setBusyId('apply');
    try {
      await api('applications', {
        method: 'POST',
        body: {
          campaign_id: campaign.id, campaign_title: campaign.title, owner_id: campaign.owner_id,
          clipper_id: profile.id, clipper_name: profile.name, clipper_avatar: profile.avatar_url,
          quick_apply: applyMode === 'quick',
          pitch: applyMode === 'quick' ? note : pitch,
        },
      });
      setApplyOpen(false); setPitch(''); setNote('');
      await fetchAll();
    } catch (e: any) {
      setApplyErr(e.message);
    }
    setBusyId(null);
  };

  const submitClip = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubErr(''); setSubOk(false);
    if (!subForm.title.trim()) { setSubErr('Give your clip a title.'); return; }
    if (!subForm.video_url.trim().startsWith('http')) { setSubErr('Paste a valid clip URL (https://…).'); return; }
    setBusyId('clip');
    try {
      await api('submissions', {
        method: 'POST',
        body: {
          campaign_id: campaign.id, campaign_title: campaign.title, owner_id: campaign.owner_id,
          clipper_id: profile.id, clipper_name: profile.name,
          title: subForm.title, video_url: subForm.video_url, platform: subForm.platform,
          keywords: campaign.keywords,
        },
      });
      setSubForm({ title: '', video_url: '', platform: 'tiktok' });
      setSubOk(true);
      await fetchAll();
    } catch (e2: any) {
      setSubErr(e2.message);
    }
    setBusyId(null);
  };

  const toggleStatus = async () => {
    setBusyId('status');
    try { await api('campaigns', { method: 'PUT', body: { id: campaign.id, status: campaign.status === 'active' ? 'paused' : 'active' } }); await fetchAll(); } catch (e) { console.error(e); }
    setBusyId(null);
  };

  const deleteCampaign = async () => {
    setBusyId('delete');
    try { await api('campaigns', { method: 'DELETE', body: { id: campaign.id } }); navigate('/dashboard/campaigns'); } catch (e) { console.error(e); setBusyId(null); }
  };

  const Overview = (
    <div className="grid lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-5">
        <div className="glass rounded-2xl p-6">
          <h3 className="font-display font-bold text-white mb-3 flex items-center gap-2"><ScrollText size={16} className="text-primary" /> Brief</h3>
          <p className="text-sm text-mut leading-relaxed whitespace-pre-line">{campaign.description || 'No description provided.'}</p>
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="font-display font-bold text-white mb-3">Campaign rules</h3>
          <p className="text-sm text-mut leading-relaxed whitespace-pre-line">{campaign.rules || 'No specific rules. Follow platform community guidelines.'}</p>
        </div>
      </div>
      <div className="space-y-5">
        <div className="glass rounded-2xl p-6 space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider font-bold text-faint">Reward</p>
            <p className="font-display text-xl font-bold text-primary mt-0.5">{rewardLabel(campaign)}</p>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-faint">Escrow used</span>
              <span className="text-white/80">{money(campaign.spent)} / {money(campaign.budget)}</span>
            </div>
            <ProgressBar value={Number(campaign.spent)} max={Number(campaign.budget)} />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-faint">Clippers</p>
              <p className="text-white font-bold mt-0.5">{approvedCount} / {campaign.max_clippers}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-faint">Deadline</p>
              <p className="text-white font-bold mt-0.5">{campaign.deadline || 'Open'}</p>
            </div>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider font-bold text-faint mb-2">Platforms</p>
            <div className="flex gap-2 flex-wrap">
              {(campaign.platforms || []).map((p: string) => (
                <Badge key={p}><PlatformIcon platform={p} size={11} /> {platformLabel(p)}</Badge>
              ))}
            </div>
          </div>
          {(campaign.keywords || []).length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-faint mb-2">Keywords</p>
              <div className="flex gap-1.5 flex-wrap">
                {campaign.keywords.map((k: string) => <Badge key={k} tone="violet">#{k}</Badge>)}
              </div>
            </div>
          )}
          {campaign.requirements && (Number(campaign.requirements.min_followers) > 0 || campaign.requirements.min_tier !== 'any' || campaign.requirements.verified_only) && (
            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-faint mb-2">Clipper requirements</p>
              <div className="flex gap-1.5 flex-wrap">
                {Number(campaign.requirements.min_followers) > 0 && (
                  <Badge tone="cyan"><Users2 size={10} /> {Number(campaign.requirements.min_followers) >= 1000 ? `${Number(campaign.requirements.min_followers) / 1000}K+` : `${campaign.requirements.min_followers}+`} followers</Badge>
                )}
                {campaign.requirements.min_tier !== 'any' && (
                  <Badge tone="cyan"><ShieldCheck size={10} /> {campaign.requirements.min_tier.charAt(0).toUpperCase() + campaign.requirements.min_tier.slice(1)}+ tier</Badge>
                )}
                {campaign.requirements.verified_only && <Badge tone="cyan"><BadgeCheck size={10} /> Verified only</Badge>}
              </div>
              <p className="text-[11px] text-faint mt-2 leading-relaxed">Checked automatically against your live connected accounts and verification tier.</p>
            </div>
          )}
        </div>

        {!isOwner && profile?.role === 'clipper' && (
          <div className="glass rounded-2xl p-6">
            {!myApp ? (
              <>
                <p className="text-sm text-mut mb-4">One click — your verified stats do the pitching. Approved clippers can submit unlimited clips.</p>
                <button onClick={openApply} disabled={campaign.status !== 'active'} className="btn-primary w-full"><Zap size={15} /> Quick apply</button>
                {campaign.status !== 'active' && <p className="text-[11px] text-amber-300 mt-2 text-center">This campaign is currently {campaign.status}.</p>}
              </>
            ) : myApp.status === 'pending' ? (
              <div className="text-center">
                <StatusBadge status="pending" />
                <p className="text-sm text-mut mt-3">Application sent {timeAgo(myApp.created_at)}. The brand is reviewing your pitch.</p>
              </div>
            ) : myApp.status === 'rejected' ? (
              <div className="text-center">
                <StatusBadge status="rejected" />
                <p className="text-sm text-mut mt-3">This one didn't work out - plenty more campaigns to clip.</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <StatusBadge status="approved" />
                  <span className="text-xs text-mut">You're on this campaign</span>
                </div>
                <form onSubmit={submitClip} className="space-y-3.5">
                  <Field label="Clip title">
                    <input className="input" placeholder="e.g. The boss fight nobody saw coming" value={subForm.title} onChange={(e) => setSubForm({ ...subForm, title: e.target.value })} />
                  </Field>
                  <Field label="Clip URL">
                    <input className="input" placeholder="https://tiktok.com/@you/video/…" value={subForm.video_url} onChange={(e) => setSubForm({ ...subForm, video_url: e.target.value })} />
                  </Field>
                  <Field label="Platform">
                    <select className="input" value={subForm.platform} onChange={(e) => setSubForm({ ...subForm, platform: e.target.value })}>
                      {(campaign.platforms || ['tiktok']).map((p: string) => <option key={p} value={p}>{platformLabel(p)}</option>)}
                    </select>
                  </Field>
                  <ErrorNote>{subErr}</ErrorNote>
                  {subOk && <div className="rounded-xl border border-primary/25 bg-primary/10 text-primary text-sm px-4 py-3">Clip submitted! It was checked against the platform and live stats were pulled where available.</div>}
                  <button type="submit" disabled={busyId === 'clip'} className="btn-primary w-full">
                    {busyId === 'clip' ? <><Spinner size={15} /> Verifying clip…</> : <><Clapperboard size={15} /> Submit clip</>}
                  </button>
                  <p className="text-[11px] text-faint text-center leading-relaxed">Clip URLs are verified against the platform’s public API. YouTube & TikTok view counts sync live.</p>
                </form>
              </div>
            )}
          </div>
        )}

        {!isOwner && mySubs.length > 0 && (
          <div className="glass rounded-2xl p-6">
            <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-faint mb-3">Your clips here</p>
            <div className="space-y-2.5">
              {mySubs.map((s) => (
                <div key={s.id} className="rounded-xl bg-white/4 border border-white/8 px-3.5 py-3">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-bold text-white truncate flex-1">{s.title}</p>
                    <StatusBadge status={s.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] font-mono text-mut">
                    <span>{compact(s.views)} views</span>
                    <span className="text-violet">AI {s.ai_quality}</span>
                    {Number(s.earnings) > 0 && <span className="text-primary">{money(s.earnings)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const Applications = (
    <div className="space-y-3">
      {apps.length === 0 ? (
        <EmptyState icon={<Users size={22} />} title="No applications yet" desc="Clippers browsing the marketplace will apply here." />
      ) : apps.map((a) => (
        <div key={a.id} className="glass rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <Avatar name={a.clipper_name} src={a.clipper_avatar} size={40} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <p className="font-bold text-white">{a.clipper_name}</p>
              <TierBadge tier={tiers[a.clipper_id]} />
              <span className="text-[11px] text-faint font-mono">{timeAgo(a.created_at)}</span>
            </div>
            <p className="text-sm text-mut mt-1 leading-relaxed whitespace-pre-line">{a.pitch}</p>
          </div>
          {a.status === 'pending' ? (
            <div className="flex gap-2 shrink-0">
              <button disabled={busyId === `app-${a.id}`} onClick={() => decideApp(a.id, 'approved')} className="btn-primary text-xs px-3 py-2"><CheckCircle2 size={14} /> Approve</button>
              <button disabled={busyId === `app-${a.id}`} onClick={() => decideApp(a.id, 'rejected')} className="btn-danger text-xs px-3 py-2"><XCircle size={14} /> Reject</button>
            </div>
          ) : <StatusBadge status={a.status} />}
        </div>
      ))}
    </div>
  );

  const Submissions = (
    <div className="space-y-3">
      {subs.length === 0 ? (
        <EmptyState icon={<Clapperboard size={22} />} title="No clips submitted yet" desc="Approved clippers will submit their clips here for review." />
      ) : subs.map((s) => {
        const projected = calcEarnings(campaign, s.views);
        return (
          <div key={s.id} className="glass rounded-2xl p-5">
            <div className="flex flex-col lg:flex-row lg:items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <PlatformIcon platform={s.platform} size={15} className="text-mut" />
                  <p className="font-bold text-white">{s.title}</p>
                  <StatusBadge status={s.status} />
                </div>
                <p className="text-xs text-faint mt-1">{s.clipper_name} · {timeAgo(s.created_at)}</p>
                <div className="flex items-center gap-4 mt-3 text-xs font-mono text-mut flex-wrap">
                  <span className="flex items-center gap-1"><Eye size={12} /> {compact(s.views)}</span>
                  <span className="flex items-center gap-1"><Heart size={12} /> {compact(s.likes)}</span>
                  {s.video_url && <a href={s.video_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-cyan hover:underline"><LinkIcon size={12} /> View clip</a>}
                  {isOwner && (
                    <button
                      disabled={busyId === `refresh-${s.id}`}
                      onClick={() => refreshSubStats(s)}
                      title="Pull live view count before paying out"
                      className="flex items-center gap-1 text-mut hover:text-white transition-colors"
                    >
                      <RefreshCw size={12} className={busyId === `refresh-${s.id}` ? 'animate-spin' : ''} /> Sync live stats
                    </button>
                  )}
                </div>
                <div className="mt-3 rounded-xl bg-violet/6 border border-violet/20 px-3.5 py-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-violet font-bold mb-1 flex items-center gap-1"><Sparkles size={10} /> AI caption suggestion</p>
                  <p className="text-xs text-white/75 font-mono leading-relaxed">{s.ai_caption}</p>
                </div>
              </div>
              <div className="flex lg:flex-col items-center lg:items-end gap-3 shrink-0">
                <div className="flex gap-2">
                  <Badge tone="violet"><Sparkles size={10} /> Quality {s.ai_quality}</Badge>
                  <Badge tone="cyan">Viral {s.ai_viral}</Badge>
                </div>
                {s.status === 'pending' && isOwner ? (
                  <div className="flex flex-col items-end gap-2">
                    <p className="text-xs text-mut">Payout on approval: <span className="font-mono text-primary font-bold">{money(projected)}</span></p>
                    <div className="flex gap-2">
                      <button disabled={busyId === `sub-${s.id}`} onClick={() => decideSub(s, 'approve')} className="btn-primary text-xs px-3 py-2">
                        {busyId === `sub-${s.id}` ? <Spinner size={13} /> : <><CheckCircle2 size={14} /> Approve & pay</>}
                      </button>
                      <button disabled={busyId === `sub-${s.id}`} onClick={() => decideSub(s, 'reject')} className="btn-danger text-xs px-3 py-2"><XCircle size={14} /> Reject</button>
                    </div>
                  </div>
                ) : Number(s.earnings) > 0 ? (
                  <p className="font-mono text-primary font-bold">{money(s.earnings)} paid</p>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      <Breadcrumbs
        withSchema={false}
        items={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Campaigns', to: '/dashboard/campaigns' },
          { label: campaign.title },
        ]}
      />

      {/* Hero */}
      <div className="relative rounded-3xl overflow-hidden border border-white/10 min-h-[190px]">
        {campaign.thumbnail_url && <img src={campaign.thumbnail_url} alt={`${campaign.title} — ${campaign.category} campaign by ${campaign.brand_name}`} className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-r from-ink/95 via-ink/80 to-ink/40" />
        <div className="relative p-6 md:p-8 flex flex-col justify-end min-h-[190px]">
          <div className="flex items-center gap-2.5 flex-wrap">
            <StatusBadge status={campaign.status} />
            <Badge>{campaign.category}</Badge>
            <Badge tone="lime">{rewardLabel(campaign)}</Badge>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white mt-3">{campaign.title}</h1>
          <p className="text-sm text-mut mt-1.5 flex items-center gap-3 flex-wrap">
            <span className="font-bold text-white/85">{campaign.brand_name}</span>
            {campaign.deadline && <span className="flex items-center gap-1"><Calendar size={12} /> Due {campaign.deadline}</span>}
            <span className="flex items-center gap-1"><Users size={12} /> {approvedCount}/{campaign.max_clippers} clippers</span>
          </p>
          {isOwner && (
            <div className="flex gap-2 mt-4">
              <button disabled={busyId === 'status'} onClick={toggleStatus} className="btn-ghost text-xs px-3 py-2">
                {campaign.status === 'active' ? <><Pause size={13} /> Pause</> : <><Play size={13} /> Activate</>}
              </button>
              <button onClick={() => setDeleteOpen(true)} className="btn-danger text-xs px-3 py-2"><Trash2 size={13} /> Delete</button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs (owner) */}
      {isOwner && (
        <div className="flex gap-2">
          {([
            ['overview', 'Overview', null],
            ['applications', 'Applications', pendingApps.length],
            ['submissions', 'Submissions', pendingSubs.length],
          ] as any[]).map(([key, label, count]) => (
            <button key={key} onClick={() => setTab(key)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 ${tab === key ? 'bg-primary/12 text-primary border border-primary/30' : 'text-mut hover:text-white border border-white/10'}`}>
              {label}
              {count > 0 && <span className="px-1.5 py-0.5 rounded-full bg-amber-400/15 text-amber-300 text-[10px] font-black">{count}</span>}
            </button>
          ))}
        </div>
      )}

      {(!isOwner || tab === 'overview') && Overview}
      {isOwner && tab === 'applications' && Applications}
      {isOwner && tab === 'submissions' && Submissions}

      {/* Apply modal */}
      <Modal open={applyOpen} onClose={() => setApplyOpen(false)} title={`Apply to \u201c${campaign.title}\u201d`}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setApplyMode('quick')} className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors flex items-center justify-center gap-1.5 ${applyMode === 'quick' ? 'border-primary/50 bg-primary/10 text-primary' : 'border-white/10 text-mut hover:text-white'}`}>
              <Zap size={14} /> Quick apply
            </button>
            <button onClick={() => setApplyMode('pitch')} className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors flex items-center justify-center gap-1.5 ${applyMode === 'pitch' ? 'border-primary/50 bg-primary/10 text-primary' : 'border-white/10 text-mut hover:text-white'}`}>
              <PenLine size={14} /> Write a pitch
            </button>
          </div>

          {applyMode === 'quick' ? (
            <>
              <div className="rounded-xl bg-white/4 border border-white/10 p-4">
                <p className="text-[10px] uppercase tracking-[0.12em] font-bold text-faint mb-3">What the brand sees — built from your real stats</p>
                {applyLoading ? (
                  <div className="flex justify-center py-4"><Spinner size={18} /></div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white">{profile.name}</span>
                      {myTier && <TierBadge tier={myTier.tier} />}
                      {profile.verified && <Badge tone="cyan"><BadgeCheck size={10} /> Verified</Badge>}
                    </div>
                    {myAccounts.length > 0 ? (
                      <div className="flex gap-1.5 flex-wrap">
                        {myAccounts.slice(0, 4).map((a) => (
                          <Badge key={a.id}><PlatformIcon platform={a.platform} size={10} /> {a.handle} · {compactNum(a.followers)}</Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-amber-300">No connected accounts yet — your application will be stronger with verified reach.</p>
                    )}
                    <div className="flex gap-3 flex-wrap text-[11px] font-mono text-mut">
                      {Number(profile.total_views) > 0 && <span className="inline-flex items-center gap-1"><Eye size={10} /> {compactNum(profile.total_views)} views</span>}
                      {Number(profile.total_earnings) > 0 && <span>${compactNum(profile.total_earnings)} earned</span>}
                      {Number(profile.rating) > 0 && <span className="inline-flex items-center gap-1"><Star size={10} className="text-amber-300" /> {Number(profile.rating).toFixed(1)}</span>}
                    </div>
                  </div>
                )}
              </div>
              <Field label="Add a note (optional)">
                <input className="input" placeholder="e.g. Can deliver 3 clips this week" value={note} onChange={(e) => setNote(e.target.value)} />
              </Field>
            </>
          ) : (
            <Field label="Your pitch" hint="Why you? Mention your niche, avg views, and turnaround time.">
              <textarea className="input min-h-32" placeholder="I run a 120K-follower gaming page averaging 400K views per clip…" value={pitch} onChange={(e) => setPitch(e.target.value)} />
            </Field>
          )}

          <ErrorNote>{applyErr}</ErrorNote>
          <button onClick={submitApplication} disabled={busyId === 'apply' || applyLoading} className="btn-primary w-full">
            {busyId === 'apply' ? <Spinner size={15} /> : applyMode === 'quick' ? <><Zap size={15} /> Apply in one click</> : <><Send size={15} /> Send application</>}
          </button>
          {applyMode === 'quick' && <p className="text-[11px] text-faint text-center leading-relaxed">Your tier, connected accounts and track record are attached automatically — nothing to write.</p>}
        </div>
      </Modal>

      {/* Delete modal */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete campaign?">
        <p className="text-sm text-mut leading-relaxed">This permanently removes the campaign along with its applications and submissions. Escrowed funds are returned to your balance. This cannot be undone.</p>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setDeleteOpen(false)} className="btn-ghost flex-1">Cancel</button>
          <button onClick={deleteCampaign} disabled={busyId === 'delete'} className="btn-danger flex-1">
            {busyId === 'delete' ? <Spinner size={15} /> : 'Delete forever'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
