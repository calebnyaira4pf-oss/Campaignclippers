import { useState, useEffect, useCallback } from 'react';
import {
  Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Lock, TrendingUp, Plus, Landmark,
  Gift, CreditCard, Bitcoin, Trash2, Star, CheckCircle2, Smartphone,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api, money, timeAgo } from '../lib/api';
import { Spinner, StatusBadge, Stat, EmptyState, Modal, Field, ErrorNote, Badge } from '../components/ui';

const TYPE_META: Record<string, { icon: any; cls: string }> = {
  earning: { icon: TrendingUp, cls: 'bg-primary/10 text-primary' },
  payout: { icon: ArrowUpRight, cls: 'bg-rose-400/10 text-rose-300' },
  deposit: { icon: ArrowDownLeft, cls: 'bg-cyan/10 text-cyan' },
  escrow: { icon: Lock, cls: 'bg-violet/10 text-violet' },
  referral: { icon: Gift, cls: 'bg-amber-400/10 text-amber-300' },
  subscription: { icon: CreditCard, cls: 'bg-violet/10 text-violet' },
};

const METHOD_ICON: Record<string, any> = { stripe: CreditCard, paypal: WalletIcon, crypto: Bitcoin, mpesa: Smartphone };
const PAYMENTS_ENABLED = false;
const CRYPTO_CURRENCIES = ['USDC', 'BTC', 'ETH', 'SOL'];
const methodTone = (t: string) =>
  t === 'crypto' ? 'bg-amber-400/10 text-amber-300'
  : t === 'paypal' ? 'bg-cyan/10 text-cyan'
  : t === 'mpesa' ? 'bg-emerald-400/10 text-emerald-300'
  : 'bg-violet/10 text-violet';

function PayPalMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M7.8 21.3H4.9a.6.6 0 0 1-.6-.7L7 3.6a.9.9 0 0 1 .9-.8h6.6c2.2 0 3.8.5 4.7 1.5.8.9 1.1 2.1.8 3.7-.5 3.3-2.6 5-6.2 5h-2.5c-.4 0-.8.3-.9.7l-1 6.4a.9.9 0 0 1-.9.8z" opacity="0.55"/>
      <path d="M19.9 7.2c.5.3.9.8 1.1 1.4.3.8.3 1.7.1 2.8-.5 3.3-2.6 5-6.2 5h-1.6c-.4 0-.8.3-.9.7l-.8 5.1a.75.75 0 0 1-.74.63H8.1a.5.5 0 0 1-.5-.58l.3-2 .8-5.2c.1-.4.5-.7.9-.7h2.5c3.6 0 5.7-1.7 6.2-5 .2-1.1.1-2-.4-2.7z"/>
    </svg>
  );
}

export default function Wallet() {
  const { profile, refreshProfile } = useAuth();
  const isOwner = profile?.role === 'owner';
  const [txns, setTxns] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [ok, setOk] = useState('');
  const [pageErr, setPageErr] = useState('');

  // withdraw / add-funds modal
  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [selMethodId, setSelMethodId] = useState<number | null>(null);
  const [depositMethod, setDepositMethod] = useState('stripe');
  const [depositCrypto, setDepositCrypto] = useState('USDC');
  const [err, setErr] = useState('');
  // real deposit credentials (validated server-side, never stored)
  const [cardNumber, setCardNumber] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [ppEmail, setPpEmail] = useState('');
  const [cryptoFrom, setCryptoFrom] = useState('');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [mpesaStage, setMpesaStage] = useState<'input' | 'confirm'>('input');
  const [mpesaMasked, setMpesaMasked] = useState('');
  const [kesRate, setKesRate] = useState<number | null>(null);

  // Live USD -> KES rate for M-Pesa amounts (real market data, fetched once)
  useEffect(() => {
    api('fx').then((d: any) => { if (d.ok) setKesRate(Number(d.rate)); }).catch(() => {});
  }, []);

  const kes = (usd: number) => {
    if (!kesRate || !usd) return null;
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(usd * kesRate);
  };

  // add payout method modal
  const [addOpen, setAddOpen] = useState(false);
  const [addStep, setAddStep] = useState<'pick' | 'details'>('pick');
  const [addType, setAddType] = useState<'stripe' | 'paypal' | 'crypto' | 'mpesa'>('stripe');
  const [addEmail, setAddEmail] = useState('');
  const [addAddress, setAddAddress] = useState('');
  const [addCurrency, setAddCurrency] = useState('USDC');
  const [addPhone, setAddPhone] = useState('');
  const [addErr, setAddErr] = useState('');

  const fetchAll = useCallback(async () => {
    if (!profile?.id) return;
    const [t, c, m] = await Promise.all([
      api(`transactions?profile_id=${profile.id}`),
      isOwner ? api(`campaigns?owner_id=${profile.id}`) : Promise.resolve([]),
      api(`payout-methods?profile_id=${profile.id}`).catch(() => []),
    ]);
    setTxns(t); setCampaigns(c); setMethods(m);
  }, [profile?.id, isOwner]);

  useEffect(() => { fetchAll().catch((e) => setPageErr(e.message)).finally(() => setLoading(false)); }, [fetchAll]);

  if (loading) return <div className="flex justify-center py-24"><Spinner size={30} /></div>;

  const pendingPayouts = txns.filter((t) => t.type === 'payout' && t.status === 'processing').reduce((a, t) => a + Math.abs(Number(t.amount)), 0);
  const totalDeposited = txns.filter((t) => t.type === 'deposit').reduce((a, t) => a + Number(t.amount), 0);
  const inEscrow = campaigns.reduce((a, c) => a + Math.max(0, Number(c.budget) - Number(c.spent)), 0);
  const totalSpent = campaigns.reduce((a, c) => a + Number(c.spent || 0), 0);
  const defaultMethod = methods.find((m) => m.is_default);

  const openMoneyModal = () => {
    setErr(''); setAmount('');
    setSelMethodId(defaultMethod?.id ?? methods[0]?.id ?? null);
    setMpesaStage('input'); setMpesaMasked('');
    setModalOpen(true);
  };

  const openAdd = () => {
    setAddErr(''); setAddStep('pick'); setAddEmail(''); setAddAddress(''); setAddCurrency('USDC'); setAddPhone('');
    setAddOpen(true);
  };

  const addMethod = async () => {
    setAddErr('');
    setBusy('add');
    try {
      await api('payout-methods', {
        method: 'POST',
        body: {
          profile_id: profile.id,
          type: addType,
          email: addEmail,
          address: addAddress,
          currency: addCurrency,
          phone: addPhone,
        },
      });
      setAddOpen(false);
      setOk('Payout method added — you\u2019re ready to get paid.');
      await fetchAll();
    } catch (e: any) {
      setAddErr(e.message);
    }
    setBusy(null);
  };

  const setDefault = async (m: any) => {
    setBusy(`def-${m.id}`);
    try { await api('payout-methods', { method: 'PUT', body: { action: 'set_default', id: m.id, profile_id: profile.id } }); await fetchAll(); } catch (e: any) { setPageErr(e.message); }
    setBusy(null);
  };

  const removeMethod = async (m: any) => {
    setBusy(`del-${m.id}`);
    try { await api('payout-methods', { method: 'DELETE', body: { id: m.id, profile_id: profile.id } }); await fetchAll(); } catch (e: any) { setPageErr(e.message); }
    setBusy(null);
  };

  const submit = async () => {
    setErr(''); setOk('');
    const amt = Number(amount);
    if (!amt || amt <= 0) { setErr('Enter a valid amount.'); return; }
    if (!isOwner && amt > Number(profile.balance)) { setErr('Amount exceeds your available balance.'); return; }
    if (!isOwner && !selMethodId) { setErr('Pick a payout method — or add one first.'); return; }
    setBusy('money');
    try {
      if (isOwner) {
        // M-Pesa is a two-step flow: validate number → STK push → confirm PIN entry
        if (depositMethod === 'mpesa' && mpesaStage === 'input') {
          const v: any = await api('funding', { method: 'POST', body: { action: 'validate', method: 'mpesa', phone: mpesaPhone } });
          setMpesaMasked(v.masked);
          setMpesaStage('confirm');
          setBusy(null);
          return;
        }
        await api('funding', {
          method: 'POST',
          body: {
            profile_id: profile.id, amount: amt, method: depositMethod,
            card_number: cardNumber, exp: cardExp, cvc: cardCvc,
            email: ppEmail, currency: depositCrypto, from_address: cryptoFrom, phone: mpesaPhone,
          },
        });
        setModalOpen(false); setAmount('');
        setCardNumber(''); setCardExp(''); setCardCvc(''); setPpEmail(''); setCryptoFrom(''); setMpesaPhone(''); setMpesaStage('input');
        setOk(`${money(amt)} added via ${depositMethod === 'mpesa' ? 'M-Pesa' : depositMethod === 'stripe' ? 'Stripe' : depositMethod === 'paypal' ? 'PayPal' : depositCrypto} — ready to fund campaign escrow.`);
      } else {
        await api('transactions', {
          method: 'POST',
          body: { profile_id: profile.id, type: 'payout', amount: amt, method_id: selMethodId },
        });
        setModalOpen(false); setAmount('');
        const pm = methods.find((m) => m.id === selMethodId);
        setOk(`${money(amt)} payout initiated to ${pm?.label}. ${pm?.type === 'crypto' ? 'Arrives on-chain in minutes.' : pm?.type === 'mpesa' ? 'Arrives on M-Pesa in seconds.' : 'Arrives in 1\u20132 business days.'}`);
      }
      await Promise.all([fetchAll(), refreshProfile()]);
    } catch (e: any) {
      setErr(e.message);
    }
    setBusy(null);
  };

  const ADD_OPTIONS = [
    { key: 'stripe' as const, title: 'Stripe', desc: 'Bank card & local bank transfer', icon: CreditCard, tone: 'text-violet bg-violet/10' },
    { key: 'paypal' as const, title: 'PayPal', desc: 'Straight to your PayPal balance', icon: PayPalMark, tone: 'text-cyan bg-cyan/10' },
    { key: 'crypto' as const, title: 'Crypto', desc: 'BTC, ETH, USDC or SOL wallet', icon: Bitcoin, tone: 'text-amber-300 bg-amber-400/10' },
    { key: 'mpesa' as const, title: 'M-Pesa', desc: 'Instant to your Safaricom line', icon: Smartphone, tone: 'text-emerald-300 bg-emerald-400/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">{isOwner ? 'Payments' : 'Wallet'}</h1>
          <p className="text-sm text-mut mt-1">{isOwner ? 'Escrow, deposits, and released payouts — Stripe, PayPal, crypto & M-Pesa.' : 'Escrow-backed earnings — paid out via Stripe, PayPal, crypto or M-Pesa.'}</p>
        </div>
        <button onClick={openMoneyModal} disabled={!PAYMENTS_ENABLED} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
          {isOwner ? <><Plus size={15} /> Add funds</> : <><ArrowUpRight size={15} /> Withdraw</>}
        </button>
      </div>

      {!PAYMENTS_ENABLED && <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 text-amber-200 text-sm px-4 py-3">Funding and withdrawals are temporarily unavailable while payment providers are configured. No payment will be recorded as complete.</div>}

      {ok && <div className="rounded-xl border border-primary/25 bg-primary/10 text-primary text-sm px-4 py-3">{ok}</div>}
      <ErrorNote>{pageErr}</ErrorNote>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isOwner ? (
          <>
            <Stat icon={<Lock size={16} />} label="Recorded budget remaining" value={money(inEscrow)} tone="violet" sub="not verified escrow" />
            <Stat icon={<TrendingUp size={16} />} label="Recorded campaign spend" value={money(totalSpent)} sub="database totals" />
            <Stat icon={<Landmark size={16} />} label="Recorded deposits" value={money(totalDeposited)} tone="cyan" sub="not provider-confirmed" />
          </>
        ) : (
          <>
            <Stat icon={<WalletIcon size={16} />} label="Recorded balance" value={money(profile.balance)} sub="withdrawals unavailable" />
            <Stat icon={<ArrowUpRight size={16} />} label="Recorded pending payouts" value={money(pendingPayouts)} tone="cyan" sub="provider status unverified" />
            <Stat icon={<TrendingUp size={16} />} label="Recorded lifetime earnings" value={money(profile.total_earnings)} tone="violet" sub="settlement unverified" />
          </>
        )}
      </div>

      {/* Payout methods (clippers) */}
      {!isOwner && (
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-faint">Payout methods</p>
              <p className="text-sm text-mut mt-1">Where your money goes. Add once — withdraw in two clicks forever.</p>
            </div>
            <button onClick={openAdd} disabled={!PAYMENTS_ENABLED} className="btn-ghost text-xs disabled:opacity-50"><Plus size={13} /> Add method</button>
          </div>

          {methods.length === 0 ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {ADD_OPTIONS.map((o) => (
                <button key={o.key} disabled={!PAYMENTS_ENABLED} onClick={() => { openAdd(); setAddType(o.key); setAddStep('details'); }} className="rounded-2xl border border-dashed border-white/15 hover:border-primary/40 p-5 text-left transition-all hover:-translate-y-0.5 disabled:opacity-50">
                  <span className={`w-10 h-10 rounded-xl grid place-items-center ${o.tone}`}><o.icon size={18} /></span>
                  <p className="font-bold text-white mt-3">{o.title}</p>
                  <p className="text-xs text-mut mt-1">{o.desc}</p>
                  <p className="text-[11px] text-primary font-bold mt-2">Set up in 10 seconds →</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
              {methods.map((m) => {
                const Icon = METHOD_ICON[m.type] || CreditCard;
                return (
                  <div key={m.id} className={`flex items-center gap-3.5 rounded-xl border px-4 py-3.5 ${m.is_default ? 'border-primary/30 bg-primary/5' : 'border-white/8 bg-white/3'}`}>
                    <span className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${methodTone(m.type)}`}>
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white truncate">{m.label}</p>
                      <p className="text-[11px] text-faint capitalize">{m.type === 'crypto' ? `${m.details?.currency} wallet · arrives in minutes` : m.type === 'mpesa' ? 'M-Pesa · arrives in seconds' : `${m.type} · 1–2 business days`}</p>
                    </div>
                    {m.is_default ? (
                      <Badge tone="lime"><Star size={9} /> Default</Badge>
                    ) : (
                      <button disabled={busy === `def-${m.id}`} onClick={() => setDefault(m)} className="text-[11px] font-bold text-mut hover:text-primary transition-colors">Make default</button>
                    )}
                    <button disabled={busy === `del-${m.id}`} onClick={() => removeMethod(m)} className="text-faint hover:text-rose-300 transition-colors p-1" title="Remove">
                      {busy === `del-${m.id}` ? <Spinner size={13} /> : <Trash2 size={14} />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Transactions */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-faint">Transaction history</p>
          <p className="text-[11px] text-faint font-mono">{txns.length} records</p>
        </div>
        {txns.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={<WalletIcon size={22} />} title="No transactions yet" desc={isOwner ? 'Deposits and escrow releases will appear here.' : 'Earnings land here the moment a clip is approved.'} />
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {txns.map((t) => {
              const meta = TYPE_META[t.type] || TYPE_META.earning;
              const amt = Number(t.amount);
              return (
                <div key={t.id} className="flex items-center gap-4 px-6 py-4">
                  <span className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${meta.cls}`}><meta.icon size={16} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate">{t.description || t.type}</p>
                    <p className="text-[11px] text-faint font-mono mt-0.5">{timeAgo(t.created_at)} · {t.type}</p>
                  </div>
                  <StatusBadge status={t.status} />
                  <span className={`font-mono font-bold text-sm ${amt >= 0 ? 'text-primary' : 'text-rose-300'}`}>
                    {amt >= 0 ? '+' : ''}{money(amt)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Withdraw / Add funds modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={isOwner ? 'Add funds' : 'Withdraw earnings'}>
        <div className="space-y-4">
          {!isOwner && (
            <div className="rounded-xl bg-white/4 border border-white/10 px-4 py-3 flex justify-between items-center text-sm">
              <span className="text-mut">Available</span>
              <div className="flex items-center gap-2.5">
                <span className="font-mono font-bold text-primary">{money(profile.balance)}</span>
                <button type="button" onClick={() => setAmount(String(Number(profile.balance) || 0))} className="text-[11px] font-bold text-cyan hover:underline">Max</button>
              </div>
            </div>
          )}
          <Field label="Amount (USD)">
            <input type="number" min={1} step={1} className="input" placeholder="250" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>

          {isOwner ? (
            <>
              <Field label="Payment method">
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { k: 'stripe', l: 'Stripe', icon: CreditCard },
                    { k: 'paypal', l: 'PayPal', icon: WalletIcon },
                    { k: 'crypto', l: 'Crypto', icon: Bitcoin },
                    { k: 'mpesa', l: 'M-Pesa', icon: Smartphone },
                  ].map((m) => (
                    <button key={m.k} type="button" onClick={() => { setDepositMethod(m.k); setErr(''); setMpesaStage('input'); }} className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${depositMethod === m.k ? 'border-primary/50 bg-primary/10 text-primary' : 'border-white/10 text-mut hover:text-white'}`}>
                      <m.icon size={15} /> {m.l}
                    </button>
                  ))}
                </div>
              </Field>

              {depositMethod === 'stripe' && (
                <>
                  <Field label="Card number" hint="Validated in real time — card details are never stored.">
                    <input className="input font-mono" inputMode="numeric" placeholder="4242 4242 4242 4242" value={cardNumber} onChange={(e) => setCardNumber(e.target.value.replace(/[^\d\s]/g, ''))} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Expiry">
                      <input className="input font-mono" placeholder="MM/YY" maxLength={7} value={cardExp} onChange={(e) => setCardExp(e.target.value)} />
                    </Field>
                    <Field label="CVC">
                      <input className="input font-mono" inputMode="numeric" placeholder="123" maxLength={4} value={cardCvc} onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))} />
                    </Field>
                  </div>
                </>
              )}

              {depositMethod === 'paypal' && (
                <Field label="PayPal account email" hint="We charge the PayPal account on this email.">
                  <input type="email" className="input" placeholder="you@studio.com" value={ppEmail} onChange={(e) => setPpEmail(e.target.value)} />
                </Field>
              )}

              {depositMethod === 'crypto' && (
                <>
                  <Field label="Currency">
                    <div className="flex gap-2 flex-wrap">
                      {CRYPTO_CURRENCIES.map((c) => (
                        <button key={c} type="button" onClick={() => setDepositCrypto(c)} className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${depositCrypto === c ? 'bg-amber-300 text-ink border-amber-300' : 'text-mut border-white/10 hover:text-white'}`}>{c}</button>
                      ))}
                    </div>
                  </Field>
                  <Field label={`Your ${depositCrypto} wallet (sending from)`} hint="Address format is validated before the transfer is credited.">
                    <input className="input font-mono text-[13px]" placeholder={depositCrypto === 'BTC' ? 'bc1q…' : depositCrypto === 'SOL' ? 'Base58 address' : '0x…'} value={cryptoFrom} onChange={(e) => setCryptoFrom(e.target.value)} />
                  </Field>
                </>
              )}

              {depositMethod === 'mpesa' && (
                mpesaStage === 'input' ? (
                  <>
                    <Field label="M-Pesa phone number" hint="Safaricom line — we send an STK push to this number.">
                      <input className="input font-mono" inputMode="tel" placeholder="0712 345 678 or +254 712 345 678" value={mpesaPhone} onChange={(e) => setMpesaPhone(e.target.value)} />
                    </Field>
                    {Number(amount) > 0 && kes(Number(amount)) && (
                      <div className="rounded-xl bg-emerald-400/8 border border-emerald-400/20 px-4 py-2.5 flex items-center justify-between text-sm">
                        <span className="text-mut">You’ll be charged</span>
                        <span className="font-mono font-bold text-emerald-300">≈ {kes(Number(amount))}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-4">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-emerald-400/15 text-emerald-300 grid place-items-center shrink-0 animate-pulse"><Smartphone size={17} /></span>
                      <div>
                        <p className="text-sm font-bold text-emerald-300">STK push sent to {mpesaMasked}</p>
                        <p className="text-xs text-mut mt-0.5">Check your phone and enter your M-Pesa PIN to authorize {money(Number(amount) || 0)}{kes(Number(amount)) ? ` (≈ ${kes(Number(amount))})` : ''}.</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setMpesaStage('input')} className="text-[11px] font-bold text-mut hover:text-white mt-2.5 underline">Wrong number? Go back</button>
                  </div>
                )
              )}
            </>
          ) : methods.length === 0 ? (
            <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3.5">
              <p className="text-sm text-amber-300 font-bold">No payout method yet</p>
              <p className="text-xs text-mut mt-1">Add Stripe, PayPal, crypto or M-Pesa first — it takes 10 seconds.</p>
              <button onClick={() => { setModalOpen(false); openAdd(); }} className="btn-primary text-xs mt-3"><Plus size={13} /> Add payout method</button>
            </div>
          ) : (
            <Field label="Send to">
              <div className="space-y-2">
                {methods.map((m) => {
                  const Icon = METHOD_ICON[m.type] || CreditCard;
                  const sel = selMethodId === m.id;
                  return (
                    <button key={m.id} type="button" onClick={() => setSelMethodId(m.id)} className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${sel ? 'border-primary/50 bg-primary/8' : 'border-white/10 bg-white/3 hover:border-white/25'}`}>
                      <span className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${methodTone(m.type)}`}><Icon size={15} /></span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-bold truncate ${sel ? 'text-primary' : 'text-white'}`}>{m.label}</p>
                        <p className="text-[11px] text-faint">
                          {m.type === 'crypto' ? 'Arrives in minutes' : m.type === 'mpesa' ? `Arrives in seconds${Number(amount) > 0 && kes(Number(amount)) ? ` · ≈ ${kes(Number(amount))}` : ''}` : 'Arrives in 1–2 business days'}
                        </p>
                      </div>
                      {sel && <CheckCircle2 size={16} className="text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </Field>
          )}

          <ErrorNote>{err}</ErrorNote>
          <button onClick={submit} disabled={busy === 'money' || (!isOwner && methods.length === 0)} className="btn-primary w-full">
            {busy === 'money' ? <Spinner size={15} /> : isOwner
              ? (depositMethod === 'mpesa' ? (mpesaStage === 'input' ? <><Smartphone size={15} /> Send M-Pesa prompt</> : <><CheckCircle2 size={15} /> I’ve entered my PIN</>) : 'Add funds')
              : 'Request payout'}
          </button>
          <p className="text-[11px] text-faint text-center">Processed securely {isOwner ? `by ${depositMethod === 'crypto' ? 'on-chain settlement' : depositMethod === 'mpesa' ? 'Safaricom M-Pesa' : depositMethod === 'stripe' ? 'Stripe' : 'PayPal'}. Funds are available immediately.` : '— M-Pesa in seconds, crypto in minutes, Stripe & PayPal in 1–2 business days.'}</p>
        </div>
      </Modal>

      {/* Add payout method modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={addStep === 'pick' ? 'How do you want to get paid?' : `Set up ${addType === 'crypto' ? 'crypto payouts' : addType === 'mpesa' ? 'M-Pesa payouts' : addType === 'stripe' ? 'Stripe payouts' : 'PayPal payouts'}`}>
        {addStep === 'pick' ? (
          <div className="space-y-2.5">
            {ADD_OPTIONS.map((o) => (
              <button key={o.key} onClick={() => { setAddType(o.key); setAddStep('details'); setAddErr(''); }} className="w-full flex items-center gap-4 rounded-2xl border border-white/10 bg-white/3 hover:border-primary/40 p-4 text-left transition-all">
                <span className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${o.tone}`}><o.icon size={20} /></span>
                <div className="flex-1">
                  <p className="font-bold text-white">{o.title}</p>
                  <p className="text-xs text-mut mt-0.5">{o.desc}</p>
                </div>
                <ArrowUpRight size={16} className="text-faint rotate-45" />
              </button>
            ))}
            <p className="text-[11px] text-faint text-center pt-1">One field. That's all we need.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {addType === 'crypto' ? (
              <>
                <Field label="Currency">
                  <div className="flex gap-2 flex-wrap">
                    {CRYPTO_CURRENCIES.map((c) => (
                      <button key={c} type="button" onClick={() => setAddCurrency(c)} className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${addCurrency === c ? 'bg-amber-300 text-ink border-amber-300' : 'text-mut border-white/10 hover:text-white'}`}>{c}</button>
                    ))}
                  </div>
                </Field>
                <Field label={`Your ${addCurrency} wallet address`} hint="We validate the address format before saving — no typos, no lost funds.">
                  <input className="input font-mono text-[13px]" placeholder={addCurrency === 'BTC' ? 'bc1q…' : addCurrency === 'SOL' ? 'Base58 address' : '0x…'} value={addAddress} onChange={(e) => setAddAddress(e.target.value)} />
                </Field>
              </>
            ) : addType === 'mpesa' ? (
              <>
                <Field label="M-Pesa phone number" hint="Safaricom line — payouts land in seconds, validated before saving.">
                  <input className="input font-mono" inputMode="tel" placeholder="0712 345 678 or +254 712 345 678" value={addPhone} onChange={(e) => setAddPhone(e.target.value)} />
                </Field>
                {kesRate && (
                  <p className="text-[11px] text-faint">Payouts convert at the live market rate — currently $1 ≈ KSh {Math.round(kesRate)}.</p>
                )}
              </>
            ) : (
              <Field label={`Email on your ${addType === 'stripe' ? 'Stripe' : 'PayPal'} account`} hint="That's it — payouts route to this account automatically.">
                <input type="email" className="input" placeholder="you@studio.com" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} />
              </Field>
            )}
            <ErrorNote>{addErr}</ErrorNote>
            <div className="flex gap-2.5">
              <button onClick={() => setAddStep('pick')} className="btn-ghost">Back</button>
              <button onClick={addMethod} disabled={busy === 'add'} className="btn-primary flex-1">
                {busy === 'add' ? <Spinner size={15} /> : <><CheckCircle2 size={15} /> Save payout method</>}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
