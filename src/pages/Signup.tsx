import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Clapperboard, Megaphone, ArrowLeft, Check, Gift, CheckCircle2, XCircle } from 'lucide-react';
import supabase from '../lib/supabase';
import { signInWithGoogle } from '../lib/googleAuth';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from '../components/Navbar';
import Seo from '../components/Seo';
import { Spinner, ErrorNote, Field, PasswordInput } from '../components/ui';

type EmailState = { status: 'idle' | 'checking' | 'valid' | 'invalid'; reason?: string; suggestion?: string };

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const [role, setRole] = useState<'clipper' | 'owner' | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [refCode, setRefCode] = useState(() => (searchParams.get('ref') || localStorage.getItem('cc_ref') || '').toUpperCase());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [emailState, setEmailState] = useState<EmailState>({ status: 'idle' });
  const emailTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emailSeq = useRef(0);

  // Live email verification — debounced format + disposable + typo + DNS MX check
  useEffect(() => {
    if (emailTimer.current) clearTimeout(emailTimer.current);
    const em = email.trim();
    if (!em) { setEmailState({ status: 'idle' }); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) {
      setEmailState({ status: 'invalid', reason: 'Enter a complete email address.' });
      return;
    }
    setEmailState({ status: 'checking' });
    const seq = ++emailSeq.current;
    emailTimer.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/validate-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: em }),
        });
        const d = await res.json();
        if (seq !== emailSeq.current) return; // stale response
        if (d.valid) setEmailState({ status: 'valid' });
        else setEmailState({ status: 'invalid', reason: d.reason, suggestion: d.suggestion });
      } catch {
        if (seq === emailSeq.current) setEmailState({ status: 'idle' }); // don't block on validator outage
      }
    }, 550);
    return () => { if (emailTimer.current) clearTimeout(emailTimer.current); };
  }, [email]);

  // Persist referral code from the invite link so it survives OAuth redirects
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) localStorage.setItem('cc_ref', ref.toUpperCase());
  }, [searchParams]);

  useEffect(() => {
    if (!loading && user) navigate('/dashboard', { replace: true });
  }, [user, loading, navigate]);

  const chooseRole = (r: 'clipper' | 'owner') => {
    setRole(r);
    localStorage.setItem('cc_role', r);
  };

  const handleGoogle = () => {
    if (role) localStorage.setItem('cc_role', role);
    if (refCode.trim()) localStorage.setItem('cc_ref', refCode.trim().toUpperCase());
    signInWithGoogle('Campaign Clippers');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Enter your name or brand name.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) { setError('Enter a valid email address.'); return; }
    if (emailState.status === 'invalid') { setError(emailState.reason || 'This email address can\u2019t be used for registration.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setBusy(true);
    try {
      // Final server-side verification: format + disposable blocklist + typo + live DNS MX check
      const check = await fetch('/api/validate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      }).then((r) => r.json()).catch(() => ({ valid: true }));
      if (!check.valid) {
        setEmailState({ status: 'invalid', reason: check.reason, suggestion: check.suggestion });
        setError(check.reason || 'This email address can\u2019t be used for registration.');
        setBusy(false);
        return;
      }
      localStorage.setItem('cc_role', role || 'clipper');
      if (refCode.trim()) localStorage.setItem('cc_ref', refCode.trim().toUpperCase());
      else localStorage.removeItem('cc_ref');
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (err) throw err;
      if (data.session) {
        navigate('/dashboard');
      } else {
        setNotice('Account created! Check your inbox to confirm your email, then log in.');
      }
    } catch (e: any) {
      setError(e.message || 'Sign up failed');
    } finally {
      setBusy(false);
    }
  };

  const roles = [
    {
      key: 'clipper' as const, icon: Clapperboard, title: 'I\u2019m a Clipper',
      desc: 'Creator or editor. I want to clip content for brands and get paid per view.',
      perks: ['Free forever', 'Escrow-backed payouts', 'Leaderboard & reputation'],
      tone: 'primary',
    },
    {
      key: 'owner' as const, icon: Megaphone, title: 'I\u2019m a Brand / Agency',
      desc: 'I want to launch campaigns and hire elite clippers to make my content go viral.',
      perks: ['Launch in minutes', 'AI-scored submissions', 'Pay only for results'],
      tone: 'violet',
    },
  ];

  return (
    <div className="min-h-screen bg-ink hero-glow">
      <Seo title="Create your free account — Campaign Clippers" description="Join Campaign Clippers as a clipper or a brand. Clippers earn escrow-backed payouts per view; brands launch AI-scored clip campaigns in minutes." path="/signup" />
      <div className="absolute inset-0 grid-lines pointer-events-none" />
      <div className="relative max-w-5xl mx-auto px-5 py-10">
        <div className="flex items-center justify-between mb-14">
          <Link to="/"><Logo /></Link>
          <p className="text-sm text-mut">Have an account? <Link to="/login" className="text-primary font-bold hover:underline">Log in</Link></p>
        </div>

        {!role ? (
          <div className="max-w-3xl mx-auto">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-white text-center tracking-tight">How will you use<br />Campaign Clippers?</h1>
            <p className="text-mut text-center mt-4">Pick your side of the marketplace. You can switch later.</p>
            {refCode && (
              <div className="flex justify-center mt-5">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/25 text-primary text-sm font-bold">
                  <Gift size={14} /> Invited with code {refCode} — your referrer earns a bonus when you get active
                </span>
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-5 mt-12">
              {roles.map((r) => (
                <button
                  key={r.key}
                  onClick={() => chooseRole(r.key)}
                  className={`text-left glass rounded-3xl p-7 transition-all hover:-translate-y-1 ${r.tone === 'primary' ? 'hover:border-primary/50' : 'hover:border-violet/50'}`}
                >
                  <span className={`w-12 h-12 rounded-2xl grid place-items-center ${r.tone === 'primary' ? 'bg-primary/12 text-primary' : 'bg-violet/12 text-violet'}`}>
                    <r.icon size={22} />
                  </span>
                  <h2 className="font-display text-2xl font-bold text-white mt-5">{r.title}</h2>
                  <p className="text-sm text-mut mt-2 leading-relaxed">{r.desc}</p>
                  <ul className="mt-5 space-y-2">
                    {r.perks.map((p) => (
                      <li key={p} className="flex items-center gap-2 text-[13px] text-white/75 font-semibold">
                        <Check size={14} className={r.tone === 'primary' ? 'text-primary' : 'text-violet'} /> {p}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-sm mx-auto">
            <button onClick={() => setRole(null)} className="flex items-center gap-1.5 text-sm text-mut hover:text-white font-bold mb-6">
              <ArrowLeft size={15} /> Back
            </button>
            <div className="flex items-center gap-3 mb-6">
              <span className={`w-10 h-10 rounded-xl grid place-items-center ${role === 'clipper' ? 'bg-primary/12 text-primary' : 'bg-violet/12 text-violet'}`}>
                {role === 'clipper' ? <Clapperboard size={19} /> : <Megaphone size={19} />}
              </span>
              <div>
                <h1 className="font-display text-2xl font-bold text-white">Create your account</h1>
                <p className="text-xs text-faint">{role === 'clipper' ? 'Clipper workspace' : 'Brand workspace'}</p>
              </div>
            </div>

            <button onClick={handleGoogle} className="btn-ghost w-full">
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Sign up with Google
            </button>

            <div className="flex items-center gap-3 my-5">
              <div className="h-px flex-1 bg-white/10" /><span className="text-[11px] text-faint font-bold uppercase tracking-wider">or</span><div className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label={role === 'clipper' ? 'Your name' : 'Brand / agency name'}>
                <input className="input" placeholder={role === 'clipper' ? 'Ava Chen' : 'Nova Labs'} value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Email">
                <div className="relative">
                  <input type="email" className={`input pr-10 ${emailState.status === 'invalid' ? '!border-rose-400/50' : emailState.status === 'valid' ? '!border-primary/50' : ''}`} placeholder="you@studio.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    {emailState.status === 'checking' && <Spinner size={14} />}
                    {emailState.status === 'valid' && <CheckCircle2 size={16} className="text-primary" />}
                    {emailState.status === 'invalid' && <XCircle size={16} className="text-rose-300" />}
                  </span>
                </div>
                {emailState.status === 'valid' && (
                  <span className="block text-[11px] text-primary font-bold mt-1">Verified — this domain can receive mail.</span>
                )}
                {emailState.status === 'checking' && (
                  <span className="block text-[11px] text-faint mt-1">Verifying email domain…</span>
                )}
                {emailState.status === 'invalid' && (
                  <span className="block text-[11px] text-rose-300 mt-1">
                    {emailState.reason}
                    {emailState.suggestion && (
                      <>{' '}<button type="button" onClick={() => setEmail(emailState.suggestion!)} className="underline font-bold text-primary">Use {emailState.suggestion}</button></>
                    )}
                  </span>
                )}
                {emailState.status === 'idle' && (
                  <span className="block text-[11px] text-faint mt-1">We verify your email domain is real and can receive mail.</span>
                )}
              </Field>
              <Field label="Password" hint="At least 6 characters">
                <PasswordInput value={password} onChange={setPassword} />
              </Field>
              <Field label="Referral code (optional)">
                <input className="input font-mono uppercase" placeholder="e.g. AVACHE-X4A1" value={refCode} onChange={(e) => setRefCode(e.target.value.toUpperCase())} />
              </Field>
              <ErrorNote>{error}</ErrorNote>
              {notice && <div className="rounded-xl border border-primary/25 bg-primary/10 text-primary text-sm px-4 py-3">{notice}</div>}
              <button type="submit" disabled={busy || emailState.status === 'checking' || emailState.status === 'invalid'} className="btn-primary w-full py-3">
                {busy ? <Spinner size={16} /> : emailState.status === 'checking' ? 'Verifying email…' : 'Create account'}
              </button>
              <p className="text-[11px] text-faint text-center leading-relaxed">
                By signing up you agree to our <Link to="/legal/terms" className="underline">Terms</Link> and <Link to="/legal/privacy" className="underline">Privacy Policy</Link>.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
