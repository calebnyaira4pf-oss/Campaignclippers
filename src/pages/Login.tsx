import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clapperboard, Megaphone, ShieldCheck, Fingerprint } from 'lucide-react';
import supabase from '../lib/supabase';
import { signInWithGoogle } from '../lib/googleAuth';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from '../components/Navbar';
import Seo from '../components/Seo';
import { Spinner, ErrorNote, Field, PasswordInput } from '../components/ui';

export default function Login() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    if (!loading && user) navigate('/dashboard', { replace: true });
  }, [user, loading, navigate]);

  const signIn = async (em: string, pw: string) => {
    setError(''); setInfo(''); setBusy(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email: em, password: pw });
      if (err) throw err;
      navigate('/dashboard');
    } catch (e: any) {
      setError(e.message || 'Sign in failed');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Enter your email and password.'); return; }
    signIn(email, password);
  };

  const comingSoon = (provider: string) => {
    setError('');
    setInfo(`${provider} sign-in is being provisioned for this workspace. Use Google or email for now.`);
  };

  return (
    <div className="min-h-screen bg-ink grid lg:grid-cols-2">
      <Seo title="Log in — Campaign Clippers" description="Sign in to your Campaign Clippers workspace with email or Google. Manage campaigns, clips, escrow payments and payouts." path="/login" />
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 hero-glow border-r border-white/8 relative">
        <div className="absolute inset-0 grid-lines pointer-events-none" />
        <Link to="/" className="relative"><Logo /></Link>
        <div className="relative">
          <p className="font-display text-5xl font-bold text-white tracking-tight leading-tight">Welcome back to the clip economy.</p>
          <p className="text-mut mt-4 max-w-md leading-relaxed">Campaigns are live, escrow is loaded, and the leaderboard resets Monday. Let’s get you paid.</p>
          <div className="flex gap-6 mt-10">
            <div className="flex items-center gap-2 text-sm text-mut"><ShieldCheck size={16} className="text-primary" /> Escrow protected</div>
            <div className="flex items-center gap-2 text-sm text-mut"><Fingerprint size={16} className="text-primary" /> 2FA ready</div>
          </div>
        </div>
        <p className="text-xs text-faint relative">SOC2 · GDPR · Payments by Stripe & PayPal</p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="lg:hidden inline-block mb-8"><Logo /></Link>
          <h1 className="font-display text-3xl font-bold text-white">Log in</h1>
          <p className="text-sm text-mut mt-2">New here? <Link to="/signup" className="text-primary font-bold hover:underline">Create an account</Link></p>

          <div className="grid grid-cols-1 gap-2.5 mt-8">
            <button onClick={() => signInWithGoogle('Campaign Clippers')} className="btn-ghost w-full">
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={() => comingSoon('Apple')} className="btn-ghost">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                Apple
              </button>
              <button onClick={() => comingSoon('Discord')} className="btn-ghost">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#5865F2"><path d="M20.32 4.37a19.8 19.8 0 0 0-4.89-1.52.07.07 0 0 0-.08.04c-.21.38-.44.87-.6 1.25a18.3 18.3 0 0 0-5.5 0 12.6 12.6 0 0 0-.61-1.25.08.08 0 0 0-.08-.04 19.7 19.7 0 0 0-4.88 1.52.07.07 0 0 0-.04.03A20.3 20.3 0 0 0 .1 18.06a.08.08 0 0 0 .03.05 19.9 19.9 0 0 0 6 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.22-2a.08.08 0 0 0-.04-.1 13 13 0 0 1-1.87-.9.08.08 0 0 1 0-.12l.36-.29a.07.07 0 0 1 .08 0 14.2 14.2 0 0 0 12.06 0 .07.07 0 0 1 .08 0l.37.28a.08.08 0 0 1 0 .13c-.6.35-1.22.64-1.87.89a.08.08 0 0 0-.04.11c.36.7.77 1.36 1.22 1.99a.08.08 0 0 0 .08.03 19.8 19.8 0 0 0 6.02-3.03.08.08 0 0 0 .03-.05 20.1 20.1 0 0 0-3.56-13.66.06.06 0 0 0-.03-.03zM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.96 2.42-2.16 2.42zm7.97 0c-1.18 0-2.15-1.08-2.15-2.42 0-1.33.95-2.42 2.15-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.95 2.42-2.16 2.42z"/></svg>
                Discord
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-white/10" /><span className="text-[11px] text-faint font-bold uppercase tracking-wider">or with email</span><div className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Email">
              <input type="email" className="input" placeholder="you@studio.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Password">
              <PasswordInput value={password} onChange={setPassword} />
            </Field>
            <ErrorNote>{error}</ErrorNote>
            {info && <div className="rounded-xl border border-cyan/25 bg-cyan/10 text-cyan text-sm px-4 py-3">{info}</div>}
            <button type="submit" disabled={busy} className="btn-primary w-full py-3">
              {busy ? <Spinner size={16} /> : 'Log in'}
            </button>
          </form>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/3 p-4">
            <p className="text-[11px] uppercase tracking-[0.12em] font-bold text-faint mb-3">Try a demo account</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button disabled={busy} onClick={() => signIn('demo-clipper@campaignclippers.com', 'password123')} className="btn-ghost text-xs py-2.5">
                <Clapperboard size={14} className="text-primary" /> Demo Clipper
              </button>
              <button disabled={busy} onClick={() => signIn('demo-brand@campaignclippers.com', 'password123')} className="btn-ghost text-xs py-2.5">
                <Megaphone size={14} className="text-violet" /> Demo Brand
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
