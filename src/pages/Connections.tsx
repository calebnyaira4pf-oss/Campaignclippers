import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Link2, Globe, RefreshCw, Unlink, Plus, Users, Activity, Share2, ExternalLink, Check, Target, ArrowRight,
  ShieldCheck, Copy, Fingerprint,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api, compact, timeAgo } from '../lib/api';
import { Spinner, Stat, Badge, EmptyState, Modal, Field, ErrorNote } from '../components/ui';
import { PlatformIcon, platformLabel, PLATFORM_PRESETS, profileUrl } from '../components/Platform';

export default function Connections() {
  const { profile } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  // connect modal
  const [modalOpen, setModalOpen] = useState(false);
  const [isCustom, setIsCustom] = useState(false);
  const [form, setForm] = useState({ platform: '', customName: '', handle: '', url: '', followers: '' });
  const [formErr, setFormErr] = useState('');

  // ownership verification modal
  const [ownAcc, setOwnAcc] = useState<any>(null);
  const [ownCode, setOwnCode] = useState('');
  const [ownBusy, setOwnBusy] = useState(false);
  const [ownMsg, setOwnMsg] = useState('');
  const [ownDone, setOwnDone] = useState(false);
  const [ownCopied, setOwnCopied] = useState(false);

  const startOwnership = async (acc: any) => {
    setOwnAcc(acc); setOwnMsg(''); setOwnDone(false); setOwnCode(''); setOwnCopied(false); setOwnBusy(true);
    try {
      const d: any = await api('connections', { method: 'PUT', body: { id: acc.id, action: 'start_ownership' } });
      setOwnCode(d.code);
      if (d.status === 'verified') setOwnDone(true);
    } catch (e: any) {
      setOwnMsg(e.message);
    }
    setOwnBusy(false);
  };

  const checkOwnership = async () => {
    if (!ownAcc) return;
    setOwnBusy(true); setOwnMsg('');
    try {
      const d: any = await api('connections', { method: 'PUT', body: { id: ownAcc.id, action: 'check_ownership' } });
      if (d.verified) {
        setOwnDone(true);
        setNotice(`${ownAcc.label} ownership verified — code found in your real ${d.where || 'bio'}.`);
        await fetchAccounts();
      } else {
        setOwnMsg(d.reason || 'Code not found yet — save your bio and try again.');
      }
    } catch (e: any) {
      setOwnMsg(e.message);
    }
    setOwnBusy(false);
  };

  const copyOwnCode = async () => {
    try {
      await navigator.clipboard.writeText(ownCode);
      setOwnCopied(true);
      setTimeout(() => setOwnCopied(false), 1800);
    } catch { /* clipboard unavailable */ }
  };

  const fetchAccounts = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const data = await api(`connections?profile_id=${profile.id}`);
      setAccounts(data);
    } catch (e: any) {
      setError(e.message);
    }
  }, [profile?.id]);

  useEffect(() => { fetchAccounts().finally(() => setLoading(false)); }, [fetchAccounts]);

  if (loading) return <div className="flex justify-center py-24"><Spinner size={30} /></div>;

  const countByPlatform: Record<string, number> = {};
  for (const a of accounts) countByPlatform[a.platform] = (countByPlatform[a.platform] || 0) + 1;
  const uniquePlatforms = Object.keys(countByPlatform).length;
  const totalReach = accounts.reduce((a, c) => a + Number(c.followers || 0), 0);
  const avgEngagement = accounts.length
    ? Math.round((accounts.reduce((a, c) => a + Number(c.engagement || 0), 0) / accounts.length) * 10) / 10
    : 0;
  const accountUrl = (acc: any) => (acc.url && String(acc.url).startsWith('http') ? acc.url : profileUrl(acc.platform, acc.handle));

  const openConnect = (platform?: string) => {
    setFormErr('');
    if (platform) {
      setIsCustom(false);
      setForm({ platform, customName: '', handle: '', url: '', followers: '' });
    } else {
      setIsCustom(true);
      setForm({ platform: '', customName: '', handle: '', url: '', followers: '' });
    }
    setModalOpen(true);
  };

  const connect = async () => {
    setFormErr('');
    const platformName = isCustom ? form.customName.trim() : form.platform;
    if (!platformName) { setFormErr('Enter the platform name.'); return; }
    if (!form.handle.trim()) { setFormErr('Enter your handle or username on this platform.'); return; }
    if (form.url && !form.url.trim().startsWith('http')) { setFormErr('Profile URL must start with https://'); return; }
    setBusyId('connect');
    try {
      const created: any = await api('connections', {
        method: 'POST',
        body: {
          profile_id: profile.id,
          platform: platformName,
          label: isCustom ? form.customName.trim() : platformLabel(form.platform),
          handle: form.handle.trim(),
          url: form.url.trim(),
          followers: Number(form.followers) || 0,
        },
      });
      setModalOpen(false);
      setNotice(created.live
        ? `${created.label} verified — ${compact(created.followers)} followers pulled live via ${created.api}.`
        : `${created.label} connected. ${created.reason || 'Automatic verification unavailable'} — stats saved as self-reported.`);
      await fetchAccounts();
    } catch (e: any) {
      setFormErr(e.message);
    }
    setBusyId(null);
  };

  const sync = async (acc: any) => {
    setBusyId(`sync-${acc.id}`);
    setNotice('');
    try {
      const updated: any = await api('connections', { method: 'PUT', body: { id: acc.id, action: 'sync' } });
      if (updated.sync_failed) {
        setNotice(`${acc.label}: ${updated.reason || 'live sync unavailable right now'} — existing stats kept.`);
      } else {
        const g = Number(updated.growth || 0);
        setNotice(`${acc.label} synced live via ${updated.api} — ${compact(updated.followers)} followers (${g >= 0 ? '+' : ''}${compact(g)} since last sync).`);
      }
      await fetchAccounts();
    } catch (e: any) {
      setError(e.message);
    }
    setBusyId(null);
  };

  const disconnect = async (acc: any) => {
    setBusyId(`del-${acc.id}`);
    try {
      await api('connections', { method: 'DELETE', body: { id: acc.id } });
      setNotice(`${acc.label} disconnected.`);
      await fetchAccounts();
    } catch (e: any) {
      setError(e.message);
    }
    setBusyId(null);
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Connections</h1>
          <p className="text-sm text-mut mt-1">Link every platform where you post clips — verified reach gets you approved faster.</p>
        </div>
        <button onClick={() => openConnect()} className="btn-primary"><Plus size={15} /> Add custom platform</button>
      </div>

      {notice && <div className="rounded-xl border border-primary/25 bg-primary/10 text-primary text-sm px-4 py-3">{notice}</div>}
      <ErrorNote>{error}</ErrorNote>

      {profile?.role === 'clipper' && (
        <div className="rounded-2xl border border-violet/25 bg-gradient-to-r from-violet/10 to-transparent px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <span className="w-10 h-10 rounded-xl bg-violet/15 text-violet grid place-items-center shrink-0"><Target size={18} /></span>
          <div className="flex-1">
            <p className="text-sm font-bold text-white">See which campaigns you qualify for</p>
            <p className="text-xs text-mut mt-0.5">Our analyzer scores your connected reach against every live campaign and tells you exactly how to qualify.</p>
          </div>
          <Link to="/dashboard/eligibility" className="btn-primary text-xs shrink-0">Run analysis <ArrowRight size={13} /></Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat icon={<Users size={16} />} label="Total reach" value={compact(totalReach)} sub="combined followers" />
        <Stat icon={<Share2 size={16} />} label="Connected accounts" value={accounts.length} tone="violet" sub={accounts.length ? `across ${uniquePlatforms} platform${uniquePlatforms === 1 ? '' : 's'}` : 'none yet'} />
        <Stat icon={<Activity size={16} />} label="Avg engagement" value={accounts.length ? `${avgEngagement}%` : '—'} tone="cyan" sub="across connected accounts" />
      </div>

      {/* Connected accounts */}
      <div className="space-y-3">
        <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-faint">Connected accounts</p>
        {accounts.length === 0 ? (
          <EmptyState
            icon={<Link2 size={22} />}
            title="No platforms connected"
            desc="Connect the accounts where you post clips. Brands see your verified reach when reviewing applications."
          />
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {accounts.map((acc, i) => (
              <motion.div
                key={acc.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="glass rounded-2xl p-5"
              >
                <div className="flex items-start gap-3.5">
                  <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                    <PlatformIcon platform={acc.platform} size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-display font-bold text-white">{acc.label}</p>
                      {acc.status === 'live'
                        ? <Badge tone="green"><Check size={10} /> Live data</Badge>
                        : <Badge tone="amber">Self-reported</Badge>}
                      {acc.ownership === 'verified' && <Badge tone="cyan"><ShieldCheck size={10} /> Owner verified</Badge>}
                    </div>
                    <p className="text-[13px] text-mut mt-0.5 truncate">{acc.handle}</p>
                    {accountUrl(acc) && (
                      <a href={accountUrl(acc)} target="_blank" rel="noreferrer" className="text-[11px] text-cyan hover:underline inline-flex items-center gap-1 mt-1">
                        <ExternalLink size={10} /> View profile on the web
                      </a>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="rounded-xl bg-white/4 border border-white/8 px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-faint font-bold">Followers</p>
                    <p className="font-display font-bold text-white text-lg">{compact(acc.followers)}</p>
                  </div>
                  <div className="rounded-xl bg-white/4 border border-white/8 px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-faint font-bold">Engagement</p>
                    <p className="font-display font-bold text-white text-lg">{Number(acc.engagement) > 0 ? `${Number(acc.engagement).toFixed(1)}%` : '—'}</p>
                  </div>
                  <div className="rounded-xl bg-white/4 border border-white/8 px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-faint font-bold">Synced</p>
                    <p className="font-bold text-white text-[13px] mt-1">{timeAgo(acc.last_synced)}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4 flex-wrap">
                  <button disabled={busyId === `sync-${acc.id}`} onClick={() => sync(acc)} className="btn-ghost text-xs px-3 py-2 flex-1">
                    {busyId === `sync-${acc.id}` ? <Spinner size={13} /> : <><RefreshCw size={13} /> Sync stats</>}
                  </button>
                  {acc.ownership !== 'verified' && (
                    <button onClick={() => startOwnership(acc)} className="btn-ghost text-xs px-3 py-2 flex-1 !border-cyan/30 !text-cyan">
                      <Fingerprint size={13} /> Verify ownership
                    </button>
                  )}
                  <button disabled={busyId === `del-${acc.id}`} onClick={() => disconnect(acc)} className="btn-danger text-xs px-3 py-2">
                    {busyId === `del-${acc.id}` ? <Spinner size={13} /> : <><Unlink size={13} /> Disconnect</>}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Platform picker */}
      <div className="glass rounded-2xl p-6">
        <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-faint mb-1">Connect a platform</p>
        <p className="text-sm text-mut mb-5">Pick a platform below — you can link multiple accounts on the same platform (e.g. a main and a clips page).</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {PLATFORM_PRESETS.map((p) => {
            const count = countByPlatform[p] || 0;
            return (
              <button
                key={p}
                onClick={() => openConnect(p)}
                className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-bold transition-all hover:-translate-y-0.5 ${
                  count > 0
                    ? 'border-primary/30 bg-primary/6 text-primary hover:border-primary/50'
                    : 'border-white/10 bg-white/3 text-mut hover:text-white hover:border-white/25'
                }`}
                title={count > 0 ? `${count} account${count === 1 ? '' : 's'} connected — click to add another` : `Connect ${platformLabel(p)}`}
              >
                <PlatformIcon platform={p} size={16} />
                <span className="truncate">{platformLabel(p)}</span>
                {count > 0 ? (
                  <span className="ml-auto shrink-0 inline-flex items-center gap-1 text-[10px] font-black">
                    <Check size={12} /> {count > 1 ? `×${count}` : ''}
                  </span>
                ) : (
                  <Plus size={13} className="ml-auto shrink-0 opacity-60" />
                )}
              </button>
            );
          })}
          <button
            onClick={() => openConnect()}
            className="flex items-center gap-2.5 rounded-xl border border-dashed border-white/20 px-4 py-3 text-sm font-bold text-mut hover:text-white hover:border-primary/40 transition-all hover:-translate-y-0.5"
          >
            <Globe size={16} />
            Other…
          </button>
        </div>
      </div>

      {/* Ownership verification modal */}
      <Modal open={Boolean(ownAcc)} onClose={() => setOwnAcc(null)} title={`Verify you own ${ownAcc?.label || ''}`}>
        {ownDone ? (
          <div className="text-center py-4">
            <span className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-cyan/12 text-cyan mb-4"><ShieldCheck size={26} /></span>
            <h3 className="font-display font-bold text-white text-lg">Ownership verified</h3>
            <p className="text-sm text-mut mt-2 leading-relaxed">We found your code in your real {ownAcc?.label} bio. This account is proven yours — you can now remove the code from your bio.</p>
            <button onClick={() => setOwnAcc(null)} className="btn-primary w-full mt-6">Done</button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-mut leading-relaxed">
              Prove this is really your account — the same way Google Search Console verifies domains. We check your <span className="text-white font-bold">real, live {ownAcc?.label} bio</span> for a one-time code.
            </p>
            <div className="space-y-3">
              <div className="flex gap-3 items-start">
                <span className="font-mono text-cyan text-sm font-bold pt-2">1</span>
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-white mb-1.5">Copy your verification code</p>
                  <button onClick={copyOwnCode} disabled={!ownCode} className="w-full flex items-center justify-between gap-2 rounded-xl bg-white/5 border border-cyan/30 px-4 py-3 font-mono text-base font-bold text-cyan hover:bg-white/8 transition-colors">
                    {ownCode || <Spinner size={14} />}
                    {ownCopied ? <Check size={15} /> : <Copy size={15} className="text-mut" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="font-mono text-cyan text-sm font-bold pt-0.5">2</span>
                <p className="text-[13px] text-mut leading-relaxed flex-1">
                  Paste it anywhere in your <span className="text-white font-bold">{ownAcc?.label} bio</span>
                  {ownAcc && accountUrl(ownAcc) && <> (<a href={accountUrl(ownAcc)} target="_blank" rel="noreferrer" className="text-cyan hover:underline">open your profile</a>)</>} and save.
                </p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="font-mono text-cyan text-sm font-bold pt-0.5">3</span>
                <p className="text-[13px] text-mut leading-relaxed flex-1">Come back and hit the button below — we’ll read your live bio straight from {ownAcc?.label}.</p>
              </div>
            </div>
            {ownMsg && <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 text-amber-300 text-sm px-4 py-3 leading-relaxed">{ownMsg}</div>}
            <button onClick={checkOwnership} disabled={ownBusy || !ownCode} className="btn-primary w-full">
              {ownBusy ? <><Spinner size={15} /> Reading your live bio…</> : <><Fingerprint size={15} /> Check my bio now</>}
            </button>
            <p className="text-[11px] text-faint text-center leading-relaxed">Works for YouTube, TikTok, Instagram and Reddit (X with API token). You can delete the code from your bio after verification.</p>
          </div>
        )}
      </Modal>

      {/* Connect modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={isCustom ? 'Connect a custom platform' : `Connect ${platformLabel(form.platform)}`}>
        <div className="space-y-4">
          {!isCustom && (
            <div className="flex items-center gap-3 rounded-xl bg-white/4 border border-white/10 px-4 py-3">
              <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary grid place-items-center"><PlatformIcon platform={form.platform} size={17} /></span>
              <div>
                <p className="text-sm font-bold text-white">{platformLabel(form.platform)}</p>
                <p className="text-[11px] text-faint">Live public-stats verification</p>
              </div>
            </div>
          )}
          {isCustom && (
            <Field label="Platform name" hint="Any platform where you post clips — e.g. Vimeo, Bilibili, VK, Dailymotion…">
              <input className="input" placeholder="e.g. Vimeo" value={form.customName} onChange={(e) => setForm({ ...form, customName: e.target.value })} />
            </Field>
          )}
          <Field label="Handle / username" hint={!isCustom && (countByPlatform[form.platform] || 0) > 0 ? `You already have ${countByPlatform[form.platform]} ${platformLabel(form.platform)} account${countByPlatform[form.platform] === 1 ? '' : 's'} linked — enter a different handle to add another.` : undefined}>
            <input className="input" placeholder="@yourhandle" value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} />
          </Field>
          <Field label="Profile URL (optional)" hint={!isCustom ? 'Leave blank — we build the correct web link from your handle automatically.' : 'For custom platforms, paste the full link to your profile.'}>
            <input className="input" placeholder="https://…" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          </Field>
          <Field label="Followers (fallback only)" hint="We verify your handle and pull live follower counts directly from the platform. This number is only used if live verification is unavailable.">
            <input type="number" min={0} className="input" placeholder="12000" value={form.followers} onChange={(e) => setForm({ ...form, followers: e.target.value })} />
          </Field>
          <ErrorNote>{formErr}</ErrorNote>
          <button onClick={connect} disabled={busyId === 'connect'} className="btn-primary w-full">
            {busyId === 'connect' ? <><Spinner size={15} /> Verifying with {isCustom ? 'platform' : platformLabel(form.platform)}…</> : <><Link2 size={15} /> Verify & connect</>}
          </button>
          <p className="text-[11px] text-faint text-center leading-relaxed">We read live public stats straight from the platform (YouTube, TikTok, Instagram, Twitch, Reddit supported keylessly; X via API token). No posting permissions are ever requested.</p>
        </div>
      </Modal>
    </div>
  );
}
