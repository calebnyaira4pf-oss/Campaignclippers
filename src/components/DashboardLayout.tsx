import { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Compass, Clapperboard, Wallet, Trophy, BarChart3, Settings,
  Bell, Menu, X, LogOut, Megaphone, PlusCircle, BadgeCheck, ChevronRight, Share2, Target, Gift, ShieldCheck, ShieldAlert,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { api, timeAgo } from '../lib/api';
import { Logo } from './Navbar';
import Seo from './Seo';
import { Avatar, Badge } from './ui';

export default function DashboardLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const isOwner = profile?.role === 'owner';

  useEffect(() => {
    if (!profile?.id) return;
    api(`admin?check=${profile.id}`).then((d: any) => setIsAdmin(Boolean(d.is_admin))).catch(() => {});
  }, [profile?.id]);

  const nav = isOwner
    ? [
        { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
        { to: '/dashboard/campaigns', label: 'My Campaigns', icon: Megaphone, end: true },
        { to: '/dashboard/campaigns/new', label: 'Create Campaign', icon: PlusCircle },
        { to: '/dashboard/wallet', label: 'Payments', icon: Wallet },
        { to: '/dashboard/leaderboard', label: 'Top Clippers', icon: Trophy },
        { to: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
        { to: '/dashboard/connections', label: 'Connections', icon: Share2 },
        { to: '/dashboard/referrals', label: 'Referrals', icon: Gift },
        { to: '/dashboard/profile', label: 'Settings', icon: Settings },
      ]
    : [
        { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
        { to: '/dashboard/campaigns', label: 'Browse Campaigns', icon: Compass },
        { to: '/dashboard/eligibility', label: 'Campaign Match', icon: Target },
        { to: '/dashboard/verification', label: 'Verification', icon: ShieldCheck },
        { to: '/dashboard/work', label: 'My Work', icon: Clapperboard },
        { to: '/dashboard/wallet', label: 'Wallet', icon: Wallet },
        { to: '/dashboard/leaderboard', label: 'Leaderboard', icon: Trophy },
        { to: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
        { to: '/dashboard/connections', label: 'Connections', icon: Share2 },
        { to: '/dashboard/referrals', label: 'Referrals', icon: Gift },
        { to: '/dashboard/profile', label: 'Profile', icon: Settings },
      ];

  const loadNotifications = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const data = await api(`notifications?profile_id=${profile.id}`);
      setNotifications(data);
    } catch { /* silent */ }
  }, [profile?.id]);

  useEffect(() => { loadNotifications(); }, [loadNotifications, location.pathname]);
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const unread = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    try {
      await api('notifications', { method: 'PUT', body: { profile_id: profile.id, all: true } });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch { /* silent */ }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const activeNav = [...nav].reverse().find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)));
  const pageTitle = `${activeNav?.label || 'Dashboard'} — Campaign Clippers`;

  const SidebarInner = (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-5 pb-6">
        <Link to="/"><Logo size={32} /></Link>
      </div>
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {[...nav, ...(isAdmin ? [{ to: '/dashboard/admin', label: 'Admin Panel', icon: ShieldAlert }] : [])].map((item: any) => (
          <NavLink
            key={item.to + item.label}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                isActive ? 'bg-primary/12 text-primary' : 'text-mut hover:text-white hover:bg-white/5'
              }`
            }
          >
            <item.icon size={17} strokeWidth={2.2} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 space-y-3">
        {isOwner && (
          <div className="rounded-xl border border-violet/25 bg-violet/8 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.12em] font-bold text-violet">Plan</p>
            <p className="text-sm font-bold text-white capitalize mt-0.5">{profile?.plan || 'starter'}</p>
            <Link to="/pricing" className="text-[11px] font-bold text-violet hover:text-white transition-colors inline-flex items-center gap-1 mt-1">
              Upgrade <ChevronRight size={11} />
            </Link>
          </div>
        )}
        <div className="flex items-center gap-3 rounded-xl bg-white/4 border border-white/8 px-3 py-3">
          <Avatar name={profile?.name} src={profile?.avatar_url} size={34} />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-white truncate flex items-center gap-1">
              {profile?.name}
              {profile?.verified && <BadgeCheck size={13} className="text-cyan shrink-0" />}
            </p>
            <p className="text-[11px] text-faint capitalize">{isOwner ? 'Campaign Owner' : 'Clipper'}</p>
          </div>
          <button onClick={handleSignOut} title="Sign out" className="text-faint hover:text-rose-300 transition-colors p-1">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink">
      <Seo title={pageTitle} noindex />
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[256px] bg-surface border-r border-white/8 flex-col z-30">
        {SidebarInner}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-40 lg:hidden" onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 w-[256px] bg-surface border-r border-white/8 z-50 lg:hidden"
            >
              {SidebarInner}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="lg:pl-[256px]">
        <header className="sticky top-0 z-20 glass-strong">
          <div className="flex items-center gap-3 px-4 md:px-8 h-16">
            <button className="lg:hidden text-white p-1.5" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <Menu size={20} />
            </button>
            <div className="hidden sm:block">
              <Badge tone={isOwner ? 'violet' : 'lime'}>{isOwner ? 'Brand workspace' : 'Creator workspace'}</Badge>
            </div>
            <div className="flex-1" />
            <div className="relative">
              <button
                onClick={() => { setBellOpen(!bellOpen); if (!bellOpen) loadNotifications(); }}
                className="relative w-9 h-9 rounded-xl grid place-items-center text-mut hover:text-white hover:bg-white/6 transition-colors"
                aria-label="Notifications"
              >
                <Bell size={18} />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-primary text-ink text-[10px] font-black grid place-items-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {bellOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    className="absolute right-0 top-12 w-[340px] max-w-[86vw] bg-panel border border-white/10 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
                      <span className="text-sm font-bold text-white">Notifications</span>
                      {unread > 0 && (
                        <button onClick={markAllRead} className="text-[11px] font-bold text-primary hover:underline">Mark all read</button>
                      )}
                    </div>
                    <div className="max-h-[380px] overflow-y-auto">
                      {notifications.length === 0 && (
                        <p className="text-sm text-mut text-center py-10">No notifications yet</p>
                      )}
                      {notifications.map((n) => (
                        <div key={n.id} className={`px-4 py-3 border-b border-white/5 last:border-0 ${n.read ? 'opacity-55' : ''}`}>
                          <div className="flex items-start gap-2.5">
                            {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                            <div className="min-w-0">
                              <p className="text-[13px] font-bold text-white leading-snug">{n.title}</p>
                              <p className="text-xs text-mut mt-0.5 leading-relaxed">{n.message}</p>
                              <p className="text-[10px] text-faint mt-1 font-mono">{timeAgo(n.created_at)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Link to="/dashboard/profile" className="flex items-center gap-2.5 pl-1">
              <Avatar name={profile?.name} src={profile?.avatar_url} size={32} />
              <span className="hidden md:block text-sm font-bold text-white">{profile?.name?.split(' ')[0]}</span>
            </Link>
          </div>
        </header>
        {bellOpen && <div className="fixed inset-0 z-10" onClick={() => setBellOpen(false)} />}
        <main className="px-4 md:px-8 py-7 max-w-[1200px] mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
