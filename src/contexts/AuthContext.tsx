import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import supabase from '../lib/supabase';
import { api } from '../lib/api';

interface AuthState {
  user: any;
  session: any;
  profile: any;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null, session: null, profile: null, loading: true,
  refreshProfile: async () => {}, signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (u: any) => {
    if (!u) { setProfile(null); return; }
    try {
      const p = await api(`profiles?user_id=${encodeURIComponent(u.id)}&email=${encodeURIComponent(u.email || '')}`);
      setProfile(p);
    } catch {
      // No profile yet -> create one using the role chosen at signup
      const role = localStorage.getItem('cc_role') || 'clipper';
      const name = u.user_metadata?.full_name || u.user_metadata?.name || (u.email || 'creator').split('@')[0];
      try {
        const p = await api('profiles', {
          method: 'POST',
          body: {
            user_id: u.id,
            email: u.email,
            name,
            role,
            avatar_url: u.user_metadata?.avatar_url || u.user_metadata?.picture || '',
          },
        });
        setProfile(p);
        localStorage.removeItem('cc_role');
        // Redeem referral code captured at signup (if any)
        const ref = localStorage.getItem('cc_ref');
        if (ref) {
          try {
            await api('referrals', { method: 'POST', body: { action: 'redeem', code: ref, profile_id: p.id } });
          } catch (e2) {
            console.warn('Referral redeem skipped:', e2);
          }
          localStorage.removeItem('cc_ref');
        }
      } catch (e) {
        console.error('Profile creation failed:', e);
      }
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    try {
      const p = await api(`profiles?user_id=${encodeURIComponent(user.id)}&email=${encodeURIComponent(user.email || '')}`);
      setProfile(p);
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  useEffect(() => {
    let mounted = true;
    const init = async (s: any) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) await loadProfile(s.user);
      else setProfile(null);
      if (mounted) setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session: s } }) => init(s));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => { init(s); });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
