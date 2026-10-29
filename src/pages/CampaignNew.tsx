import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Rocket, X, Check, ShieldCheck, Users2, BadgeCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { money, CATEGORIES, PLATFORMS, CATEGORY_THUMBS } from '../lib/api';
import { Field, ErrorNote, Badge } from '../components/ui';
import { platformLabel, PlatformIcon } from '../components/Platform';

const STEPS = ['Basics', 'Budget & rewards', 'Rules & targeting', 'Review'];

export default function CampaignNew() {
  const { profile } = useAuth();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');

  const [form, setForm] = useState<any>({
    title: '', brand_name: profile?.name || '', category: 'Gaming', description: '',
    budget: 2000, reward_model: 'cpm', cpm_rate: 5, fixed_rate: 50, max_clippers: 10,
    deadline: '', platforms: ['tiktok', 'youtube'], keywords: [] as string[], rules: '',
    min_followers: 0, min_tier: 'any', verified_only: false,
  });

  const FOLLOWER_STEPS = [
    { v: 0, l: 'Anyone' }, { v: 1000, l: '1K+' }, { v: 10000, l: '10K+' }, { v: 50000, l: '50K+' }, { v: 100000, l: '100K+' },
  ];
  const TIER_STEPS = [
    { v: 'any', l: 'Any tier' }, { v: 'bronze', l: 'Bronze+' }, { v: 'silver', l: 'Silver+' }, { v: 'gold', l: 'Gold+' }, { v: 'elite', l: 'Elite only' },
  ];
  const [kwInput, setKwInput] = useState('');

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const togglePlatform = (p: string) => {
    set('platforms', form.platforms.includes(p) ? form.platforms.filter((x: string) => x !== p) : [...form.platforms, p]);
  };

  const addKeyword = () => {
    const k = kwInput.trim().toLowerCase();
    if (k && !form.keywords.includes(k)) set('keywords', [...form.keywords, k]);
    setKwInput('');
  };

  const validate = (s: number) => {
    if (s === 0) {
      if (!form.title.trim()) return 'Give your campaign a title.';
      if (!form.brand_name.trim()) return 'Enter your brand name.';
      if (!form.description.trim()) return 'Add a short description so clippers know what to make.';
    }
    if (s === 1) {
      if (Number(form.budget) < 100) return 'Minimum campaign budget is $100.';
      if (form.reward_model !== 'fixed' && Number(form.cpm_rate) <= 0) return 'Set a CPM rate greater than 0.';
      if (form.reward_model !== 'cpm' && Number(form.fixed_rate) <= 0) return 'Set a fixed rate greater than 0.';
    }
    if (s === 2) {
      if (form.platforms.length === 0) return 'Pick at least one target platform.';
    }
    return '';
  };

  const next = () => {
    const err = validate(step);
    if (err) { setError(err); return; }
    setError('');
    setStep(step + 1);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-7">
      <div>
        <Link to="/dashboard/campaigns" className="flex items-center gap-1.5 text-sm text-mut hover:text-white font-bold mb-4"><ArrowLeft size={15} /> Back to campaigns</Link>
        <h1 className="font-display text-3xl font-bold text-white">Create campaign</h1>
        <p className="text-sm text-mut mt-1">Set up the campaign details and reward model.</p>
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 text-amber-200 text-sm px-4 py-3 mt-4">Campaign launch is paused until escrow funding can be verified. No campaign or payment will be created.</div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1 min-w-0">
            <span className={`w-7 h-7 rounded-full grid place-items-center text-[11px] font-black shrink-0 ${i < step ? 'bg-primary text-ink' : i === step ? 'bg-primary/15 text-primary border border-primary/40' : 'bg-white/6 text-faint'}`}>
              {i < step ? <Check size={13} /> : i + 1}
            </span>
            <span className={`text-xs font-bold truncate hidden sm:block ${i === step ? 'text-white' : 'text-faint'}`}>{s}</span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-white/10" />}
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-6 md:p-8 space-y-5">
        {step === 0 && (
          <>
            <Field label="Campaign title">
              <input className="input" placeholder="e.g. Clip our new roguelike launch trailer" value={form.title} onChange={(e) => set('title', e.target.value)} />
            </Field>
            <Field label="Brand name">
              <input className="input" value={form.brand_name} onChange={(e) => set('brand_name', e.target.value)} />
            </Field>
            <Field label="Category">
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map((c) => (
                  <button key={c} type="button" onClick={() => set('category', c)} className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${form.category === c ? 'bg-primary text-ink border-primary' : 'text-mut border-white/10 hover:text-white'}`}>{c}</button>
                ))}
              </div>
            </Field>
            <Field label="Description" hint="What content should clippers work from? Where are the source assets?">
              <textarea className="input min-h-28" placeholder="Describe the campaign, the source content, and what a winning clip looks like…" value={form.description} onChange={(e) => set('description', e.target.value)} />
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <Field label="Total budget (USD)" hint="Held in escrow. Unused budget is refundable.">
              <input type="number" min={100} className="input" value={form.budget} onChange={(e) => set('budget', e.target.value)} />
            </Field>
            <Field label="Reward model">
              <div className="grid sm:grid-cols-3 gap-2.5">
                {[
                  { k: 'cpm', t: 'CPM', d: 'Pay per 1,000 views' },
                  { k: 'fixed', t: 'Fixed', d: 'Flat fee per approved clip' },
                  { k: 'hybrid', t: 'Hybrid', d: 'Base fee + CPM bonus' },
                ].map((m) => (
                  <button key={m.k} type="button" onClick={() => set('reward_model', m.k)} className={`rounded-xl border p-3.5 text-left transition-colors ${form.reward_model === m.k ? 'border-primary/50 bg-primary/8' : 'border-white/10 bg-white/3 hover:border-white/25'}`}>
                    <p className={`text-sm font-bold ${form.reward_model === m.k ? 'text-primary' : 'text-white'}`}>{m.t}</p>
                    <p className="text-[11px] text-faint mt-0.5">{m.d}</p>
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              {form.reward_model !== 'fixed' && (
                <Field label="CPM rate ($ per 1K views)">
                  <input type="number" min={0} step={0.5} className="input" value={form.cpm_rate} onChange={(e) => set('cpm_rate', e.target.value)} />
                </Field>
              )}
              {form.reward_model !== 'cpm' && (
                <Field label="Fixed rate ($ per clip)">
                  <input type="number" min={0} step={5} className="input" value={form.fixed_rate} onChange={(e) => set('fixed_rate', e.target.value)} />
                </Field>
              )}
              <Field label="Max approved clippers">
                <input type="number" min={1} max={500} className="input" value={form.max_clippers} onChange={(e) => set('max_clippers', e.target.value)} />
              </Field>
              <Field label="Deadline (optional)">
                <input type="date" className="input" value={form.deadline} onChange={(e) => set('deadline', e.target.value)} />
              </Field>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <Field label="Target platforms">
              <div className="flex gap-2.5 flex-wrap">
                {PLATFORMS.map((p) => (
                  <button key={p} type="button" onClick={() => togglePlatform(p)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-colors ${form.platforms.includes(p) ? 'border-primary/50 bg-primary/10 text-primary' : 'border-white/10 text-mut hover:text-white'}`}>
                    <PlatformIcon platform={p} size={15} /> {platformLabel(p)}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Keywords" hint="Used for search, targeting, and AI caption generation.">
              <div className="flex gap-2">
                <input className="input" placeholder="Type a keyword and press Enter" value={kwInput}
                  onChange={(e) => setKwInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }} />
                <button type="button" onClick={addKeyword} className="btn-ghost shrink-0">Add</button>
              </div>
              {form.keywords.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-3">
                  {form.keywords.map((k: string) => (
                    <span key={k} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet/10 text-violet border border-violet/25 text-xs font-bold">
                      #{k}
                      <button type="button" onClick={() => set('keywords', form.keywords.filter((x: string) => x !== k))}><X size={11} /></button>
                    </span>
                  ))}
                </div>
              )}
            </Field>
            <Field label="Campaign rules" hint="Content guidelines, banned claims, required tags, watermark rules…">
              <textarea className="input min-h-28" placeholder="e.g. Clips must be 15-60s, include #ad, no misleading thumbnails, keep brand logo visible…" value={form.rules} onChange={(e) => set('rules', e.target.value)} />
            </Field>

            {/* Clipper eligibility — three one-tap controls */}
            <div className="rounded-2xl border border-cyan/20 bg-cyan/4 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-cyan" />
                <p className="text-sm font-bold text-white">Who can apply? <span className="text-faint font-semibold">(optional)</span></p>
              </div>
              <p className="text-xs text-mut -mt-2">Set the bar once — we check every applicant's live connected-account stats and verification tier automatically. Clippers who don't qualify see exactly what they're missing.</p>
              <Field label="Minimum followers on target platforms">
                <div className="flex gap-2 flex-wrap">
                  {FOLLOWER_STEPS.map((f) => (
                    <button key={f.v} type="button" onClick={() => set('min_followers', f.v)} className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${form.min_followers === f.v ? 'bg-cyan text-ink border-cyan' : 'text-mut border-white/10 hover:text-white'}`}>
                      <Users2 size={11} className="inline mr-1 -mt-0.5" />{f.l}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Minimum verification tier">
                <div className="flex gap-2 flex-wrap">
                  {TIER_STEPS.map((t) => (
                    <button key={t.v} type="button" onClick={() => set('min_tier', t.v)} className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${form.min_tier === t.v ? 'bg-cyan text-ink border-cyan' : 'text-mut border-white/10 hover:text-white'}`}>
                      {t.l}
                    </button>
                  ))}
                </div>
              </Field>
              <button type="button" onClick={() => set('verified_only', !form.verified_only)} className="flex items-center gap-3 w-full text-left">
                <span className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${form.verified_only ? 'bg-cyan' : 'bg-white/12'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${form.verified_only ? 'left-[22px]' : 'left-0.5'}`} />
                </span>
                <span className="text-sm font-bold text-white flex items-center gap-1.5"><BadgeCheck size={14} className="text-cyan" /> Verified clippers only</span>
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="rounded-xl overflow-hidden h-40 relative bg-elev">
              <img src={CATEGORY_THUMBS[form.category] || '/campaigns/tech.jpg'} alt={`${form.category} campaign cover preview`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/90 to-transparent" />
              <div className="absolute bottom-4 left-5">
                <p className="text-[11px] uppercase tracking-[0.12em] font-bold text-white/70">{form.brand_name}</p>
                <p className="font-display text-xl font-bold text-white">{form.title}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              {[
                ['Budget (escrow)', money(form.budget)],
                ['Reward model', form.reward_model.toUpperCase()],
                ['CPM rate', form.reward_model === 'fixed' ? '—' : money(form.cpm_rate) + ' / 1K'],
                ['Fixed rate', form.reward_model === 'cpm' ? '—' : money(form.fixed_rate) + ' / clip'],
                ['Max clippers', form.max_clippers],
                ['Deadline', form.deadline || 'Open-ended'],
                ['Category', form.category],
                ['Platforms', form.platforms.map(platformLabel).join(', ')],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <p className="text-[11px] uppercase tracking-wider font-bold text-faint">{k}</p>
                  <p className="text-white font-bold mt-0.5">{v}</p>
                </div>
              ))}
            </div>
            {form.keywords.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {form.keywords.map((k: string) => <Badge key={k} tone="violet">#{k}</Badge>)}
              </div>
            )}
            {(form.min_followers > 0 || form.min_tier !== 'any' || form.verified_only) && (
              <div>
                <p className="text-[11px] uppercase tracking-wider font-bold text-faint mb-2">Clipper eligibility</p>
                <div className="flex gap-2 flex-wrap">
                  {form.min_followers > 0 && <Badge tone="cyan"><Users2 size={10} /> {form.min_followers >= 1000 ? `${form.min_followers / 1000}K+` : `${form.min_followers}+`} followers</Badge>}
                  {form.min_tier !== 'any' && <Badge tone="cyan"><ShieldCheck size={10} /> {form.min_tier.charAt(0).toUpperCase() + form.min_tier.slice(1)}+ tier</Badge>}
                  {form.verified_only && <Badge tone="cyan"><BadgeCheck size={10} /> Verified only</Badge>}
                </div>
              </div>
            )}
            <div className="rounded-xl bg-primary/8 border border-primary/25 px-4 py-3 text-sm text-primary font-semibold">
              {money(form.budget)} is the planned budget. Verified escrow funding is not currently available.
            </div>
          </div>
        )}

        <ErrorNote>{error}</ErrorNote>

        <div className="flex items-center justify-between pt-2">
          {step > 0 ? (
            <button onClick={() => { setError(''); setStep(step - 1); }} className="btn-ghost"><ArrowLeft size={15} /> Back</button>
          ) : <span />}
          {step < 3 ? (
            <button onClick={next} className="btn-primary">Continue <ArrowRight size={15} /></button>
          ) : (
            <button disabled className="btn-primary opacity-50 cursor-not-allowed" title="Campaign launch is unavailable until escrow funding is configured">
              <Rocket size={15} /> Launch unavailable
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
