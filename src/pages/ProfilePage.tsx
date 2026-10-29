import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Star, Plus, Trash2, ShieldCheck, Download, Fingerprint, Save, Link2, ChevronRight, CreditCard, Bitcoin, Wallet as WalletIcon, CheckCircle2, Smartphone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api, money, compact, timeAgo } from '../lib/api';
import { Spinner, Field, ErrorNote, Badge, Avatar, Modal } from '../components/ui';
import { PlatformIcon, platformLabel } from '../components/Platform';
import TierBadge from '../components/TierBadge';

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const isOwner = profile?.role === 'owner';

  const [form, setForm] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');
  const [pf, setPf] = useState({ title: '', url: '', platform: 'tiktok', views: '' });
  const [connections, setConnections] = useState<any[]>([]);
  const [tier, setTier] = useState<string | null>(null);

  // plan checkout
  const [checkoutPlan, setCheckoutPlan] = useState<any>(null);
  const [payMethod, setPayMethod] = useState('stripe');
  const [payCrypto, setPayCrypto] = useState('USDC');
  const [payPhone, setPayPhone] = useState('');
  const [payBusy, setPayBusy] = useState(false);
  const [payErr, setPayErr] = useState('');
  const [payOk, setPayOk] = useState('');

  const PLANS = [
    { k: 'starter', t: 'Starter', price: 0, d: '1 campaign · 10% fee' },
    { k: 'professional', t: 'Professional', price: 49, d: '10 campaigns · 5% fee' },
    { k: 'enterprise', t: 'Enterprise', price: 199, d: 'Unlimited · 2% fee' },
  ];

  const choosePlan = (pl: any) => {
    setPayErr(''); setPayOk('');
    if (pl.k === profile.plan) return;
    if (pl.price === 0) {
      // Downgrade to free — no checkout needed
      setPayBusy(true);
      api('billing', { method: 'POST', body: { profile_id: profile.id, plan: 'starter' } })
        .then(() => { setPayOk('Switched to Starter. Paid features end at the close of the cycle.'); refreshProfile(); })
        .catch((e: any) => setPayErr(e.message))
        .finally(() => setPayBusy(false));
      return;
    }
    setPayMethod('stripe');
    setCheckoutPlan(pl);
  };

  const payForPlan = async () => {
    if (!checkoutPlan) return;
    setPayBusy(true); setPayErr('');
    try {
      const d: any = await api('billing', {
        method: 'POST',
        body: { profile_id: profile.id, plan: checkoutPlan.k, method: payMethod, crypto_currency: payCrypto, mpesa_phone: payPhone },
      });
      setCheckoutPlan(null);
      setPayOk(`You\u2019re on ${checkoutPlan.t} — $${d.charged} paid via ${d.method}. Renews monthly, cancel anytime.`);
      await refreshProfile();
    } catch (e: any) {
      setPayErr(e.message);
    }
    setPayBusy(false);
  };

  useEffect(() => {
    if (!profile) return;
    setForm({
      name: profile.name || '', handle: profile.handle || '', bio: profile.bio || '',
      avatar_url: profile.avatar_url || '', plan: profile.plan || 'starter',
      socials: { tiktok: '', youtube: '', instagram: '', followers: '', ...(profile.socials || {}) },
      portfolio: profile.portfolio || [],
    });
    if (profile.role === 'clipper') {
      api(`reviews?clipper_id=${profile.id}`).then(setReviews).catch(() => {});
    }
    api(`connections?profile_id=${profile.id}`).then(setConnections).catch(() => {});
    if (profile.role === 'clipper') {
      api(`tiers?profile_id=${profile.id}`).then((d: any) => setTier(d.tier)).catch(() => {});
    }
  }, [profile]);

  if (!form) return <div className="flex justify-center py-24"><Spinner size={30} /></div>;

  const set = (k: string, v: any) => { setForm((f: any) => ({ ...f, [k]: v })); setSaved(false); };

  const addPortfolio = () => {
    if (!pf.title.trim() || !pf.url.trim()) return;
    set('portfolio', [...form.portfolio, { ...pf, views: Number(pf.views) || 0 }]);
    setPf({ title: '', url: '', platform: 'tiktok', views: '' });
  };

  const save = async () => {
    setErr('');
    if (!form.name.trim()) { setErr('Name is required.'); return; }
    setBusy(true);
    try {
      await api('profiles', { method: 'PUT', body: { id: profile.id, ...form } });
      await refreshProfile();
      setSaved(true);
    } catch (e: any) {
      setErr(e.message);
    }
    setBusy(false);
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ profile, exported_at: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'campaign-clippers-data.json'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header card */}
      <div className="glass rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <Avatar name={form.name} src={form.avatar_url} size={72} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold text-white flex items-center gap-2 flex-wrap">
            {form.name}
            {profile.verified && <BadgeCheck size={19} className="text-cyan" />}
            {!isOwner && tier && <TierBadge tier={tier} />}
          </h1>
          <p className="text-sm text-faint mt-0.5">{form.handle} · {isOwner ? 'Campaign Owner' : 'Clipper'}</p>
          {!isOwner && (
            <div className="flex gap-4 mt-2 text-xs font-mono text-mut">
              <span>{money(profile.total_earnings)} earned</span>
              <span>{compact(profile.total_views)} views</span>
              <span className="flex items-center gap-1"><Star size={11} className="text-amber-300" /> {Number(profile.rating) > 0 ? Number(profile.rating).toFixed(1) : 'New'}</span>
            </div>
          )}
        </div>
        {!profile.verified && (
          !isOwner ? (
            <Link to="/dashboard/verification" className="btn-ghost text-xs shrink-0"><ShieldCheck size={14} className="text-cyan" /> Earn verification</Link>
          ) : <span className="text-xs text-faint">Brand verification is not available yet</span>
        )}
      </div>

      {/* Profile form */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-faint">Profile</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label={isOwner ? 'Brand name' : 'Display name'}>
            <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label="Handle">
            <input className="input" value={form.handle} onChange={(e) => set('handle', e.target.value)} />
          </Field>
        </div>
        <Field label="Avatar URL" hint="Paste a link to your profile image.">
          <input className="input" placeholder="https://…" value={form.avatar_url} onChange={(e) => set('avatar_url', e.target.value)} />
        </Field>
        <Field label="Bio">
          <textarea className="input min-h-24" placeholder={isOwner ? 'Tell clippers about your brand and content style…' : 'Your niche, editing style, and what makes your clips convert…'} value={form.bio} onChange={(e) => set('bio', e.target.value)} />
        </Field>
      </div>

      {/* Connected platforms */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-faint">Connected platforms</p>
          <Link to="/dashboard/connections" className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-1">Manage <ChevronRight size={11} /></Link>
        </div>
        {connections.length === 0 ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl bg-white/4 border border-white/10 px-4 py-4">
            <span className="w-9 h-9 rounded-lg bg-cyan/10 text-cyan grid place-items-center shrink-0"><Link2 size={16} /></span>
            <p className="text-sm text-mut flex-1">Link the platforms where you post clips — brands see your verified reach when reviewing you.</p>
            <Link to="/dashboard/connections" className="btn-ghost text-xs shrink-0">Connect accounts</Link>
          </div>
        ) : (
          <div className="flex gap-2.5 flex-wrap">
            {connections.map((c) => (
              <Link key={c.id} to="/dashboard/connections" className="inline-flex items-center gap-2 rounded-xl bg-white/4 border border-white/10 px-3.5 py-2.5 hover:border-primary/35 transition-colors">
                <PlatformIcon platform={c.platform} size={15} className="text-primary" />
                <span className="text-[13px] font-bold text-white">{c.handle || c.label}</span>
                <span className="text-[11px] font-mono text-mut">{compact(c.followers)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Portfolio (clippers) */}
      {!isOwner && (
        <div className="glass rounded-2xl p-6 space-y-4">
          <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-faint">Portfolio</p>
          {form.portfolio.length > 0 && (
            <div className="space-y-2.5">
              {form.portfolio.map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-white/4 border border-white/8 px-4 py-3">
                  <PlatformIcon platform={item.platform} size={15} className="text-mut shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate">{item.title}</p>
                    <a href={item.url} target="_blank" rel="noreferrer" className="text-[11px] text-cyan hover:underline truncate block">{item.url}</a>
                  </div>
                  <span className="text-xs font-mono text-mut shrink-0">{compact(item.views)} views</span>
                  <button onClick={() => set('portfolio', form.portfolio.filter((_: any, j: number) => j !== i))} className="text-faint hover:text-rose-300 transition-colors"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            <input className="input" placeholder="Clip title" value={pf.title} onChange={(e) => setPf({ ...pf, title: e.target.value })} />
            <input className="input" placeholder="https://link-to-clip" value={pf.url} onChange={(e) => setPf({ ...pf, url: e.target.value })} />
            <select className="input" value={pf.platform} onChange={(e) => setPf({ ...pf, platform: e.target.value })}>
              {['tiktok', 'youtube', 'instagram', 'twitter'].map((p) => <option key={p} value={p}>{platformLabel(p)}</option>)}
            </select>
            <div className="flex gap-2">
              <input type="number" className="input" placeholder="Views" value={pf.views} onChange={(e) => setPf({ ...pf, views: e.target.value })} />
              <button onClick={addPortfolio} className="btn-ghost shrink-0 px-3"><Plus size={15} /></button>
            </div>
          </div>
        </div>
      )}

      {/* Plan & billing (owners) */}
      {isOwner && (
        <div className="glass rounded-2xl p-6 space-y-4">
          <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-faint">Subscription & billing</p>
          {payOk && <div className="rounded-xl border border-primary/25 bg-primary/10 text-primary text-sm px-4 py-3">{payOk}</div>}
          <ErrorNote>{payErr}</ErrorNote>
          <div className="grid sm:grid-cols-3 gap-3">
            {PLANS.map((pl) => {
              const current = profile.plan === pl.k;
              return (
                <button key={pl.k} disabled={payBusy} onClick={() => choosePlan(pl)} className={`rounded-xl border p-4 text-left transition-colors ${current ? 'border-primary/50 bg-primary/8' : 'border-white/10 bg-white/3 hover:border-white/25'}`}>
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-bold ${current ? 'text-primary' : 'text-white'}`}>{pl.t}</p>
                    {current && <Badge tone="lime">Current</Badge>}
                  </div>
                  <p className="font-display font-bold text-white text-lg mt-1">${pl.price}<span className="text-xs text-faint font-body">/mo</span></p>
                  <p className="text-[11px] text-faint mt-1">{pl.d}</p>
                  {!current && <p className="text-[11px] font-bold text-cyan mt-2">{pl.price === 0 ? 'Switch free' : `Stripe · PayPal · crypto · M-Pesa →`}</p>}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-faint">Payments are processed securely. Crypto settles on-chain in minutes; card payments via Stripe are PCI-DSS compliant.</p>
        </div>
      )}

      {/* Plan checkout modal */}
      <Modal open={Boolean(checkoutPlan)} onClose={() => setCheckoutPlan(null)} title={`Upgrade to ${checkoutPlan?.t || ''}`}>
        <div className="space-y-4">
          <div className="rounded-xl bg-white/4 border border-white/10 px-4 py-3.5 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">{checkoutPlan?.t} plan</p>
              <p className="text-[11px] text-faint">{checkoutPlan?.d} · renews monthly · cancel anytime</p>
            </div>
            <p className="font-display text-2xl font-bold text-primary">${checkoutPlan?.price}<span className="text-xs text-faint font-body">/mo</span></p>
          </div>
          <Field label="Pay with">
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { k: 'stripe', l: 'Stripe', icon: CreditCard },
                { k: 'paypal', l: 'PayPal', icon: WalletIcon },
                { k: 'crypto', l: 'Crypto', icon: Bitcoin },
                { k: 'mpesa', l: 'M-Pesa', icon: Smartphone },
              ].map((m) => (
                <button key={m.k} type="button" onClick={() => setPayMethod(m.k)} className={`rounded-xl border px-3 py-3 text-sm font-bold transition-colors flex flex-col items-center gap-1.5 ${payMethod === m.k ? 'border-primary/50 bg-primary/10 text-primary' : 'border-white/10 text-mut hover:text-white'}`}>
                  <m.icon size={17} /> {m.l}
                </button>
              ))}
            </div>
          </Field>
          {payMethod === 'crypto' && (
            <Field label="Currency" hint="Settles on-chain in minutes.">
              <div className="flex gap-2 flex-wrap">
                {['USDC', 'BTC', 'ETH', 'SOL'].map((c) => (
                  <button key={c} type="button" onClick={() => setPayCrypto(c)} className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${payCrypto === c ? 'bg-amber-300 text-ink border-amber-300' : 'text-mut border-white/10 hover:text-white'}`}>{c}</button>
                ))}
              </div>
            </Field>
          )}
          {payMethod === 'mpesa' && (
            <Field label="M-Pesa phone number" hint="Safaricom line — you’ll get an STK push to authorize the charge.">
              <input className="input font-mono" inputMode="tel" placeholder="0712 345 678 or +254 712 345 678" value={payPhone} onChange={(e) => setPayPhone(e.target.value)} />
            </Field>
          )}
          <ErrorNote>{payErr}</ErrorNote>
          <button onClick={payForPlan} disabled={payBusy} className="btn-primary w-full py-3">
            {payBusy ? <Spinner size={15} /> : <><CheckCircle2 size={15} /> Pay ${checkoutPlan?.price} & upgrade</>}
          </button>
          <p className="text-[11px] text-faint text-center">Secure checkout · charged monthly · downgrade or cancel anytime from this page.</p>
        </div>
      </Modal>

      {/* Security */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-faint">Security & privacy</p>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-cyan/10 text-cyan grid place-items-center"><Fingerprint size={17} /></span>
            <div>
              <p className="text-sm font-bold text-white">Two-factor authentication</p>
              <p className="text-[11px] text-faint">Multi-factor sign-in is not configured yet.</p>
            </div>
          </div>
          <span className="text-xs text-faint">Unavailable</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-violet/10 text-violet grid place-items-center"><Download size={17} /></span>
            <div>
              <p className="text-sm font-bold text-white">Export my data</p>
              <p className="text-[11px] text-faint">GDPR-compliant JSON export of your account.</p>
            </div>
          </div>
          <button onClick={exportData} className="btn-ghost text-xs">Export</button>
        </div>
      </div>

      {/* Reviews */}
      {!isOwner && reviews.length > 0 && (
        <div className="glass rounded-2xl p-6 space-y-4">
          <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-faint">Reviews from brands</p>
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-xl bg-white/4 border border-white/8 px-4 py-3.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-white">{r.reviewer_name}</span>
                  <span className="flex gap-0.5 text-amber-300">
                    {[...Array(5)].map((_, i) => <Star key={i} size={12} fill={i < r.rating ? 'currentColor' : 'none'} className={i < r.rating ? '' : 'opacity-30'} />)}
                  </span>
                  <span className="text-[11px] text-faint font-mono ml-auto">{timeAgo(r.created_at)}</span>
                </div>
                <p className="text-sm text-mut mt-1.5 leading-relaxed">{r.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <ErrorNote>{err}</ErrorNote>
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={busy} className="btn-primary">
          {busy ? <Spinner size={15} /> : <><Save size={15} /> Save changes</>}
        </button>
        {saved && <Badge tone="lime">Saved</Badge>}
      </div>
    </div>
  );
}
