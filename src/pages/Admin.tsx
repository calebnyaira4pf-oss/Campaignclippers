import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import {
  ShieldAlert, Users, Megaphone, Wallet, DollarSign, Eye, BadgeCheck, Ban,
  Pause, Play, Trash2, CreditCard, Clapperboard, Search,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api, money, compact, timeAgo } from '../lib/api';
import { Spinner, Stat, Badge, StatusBadge, Avatar, EmptyState, Modal } from '../components/ui';
import { Bars, Donut } from '../components/Charts';
import TierBadge from '../components/TierBadge';

type Tab = 'overview' | 'users' | 'campaigns' | 'payments';

export default function Admin() {
  const { profile } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('overview');

  useEffect(() => {
    if (!profile?.id) return;
    api(`admin?check=${profile.id}`).then((d: any) => setIsAdmin(d.is_admin)).catch(() => setIsAdmin(false));
  }, [profile?.id]);

  if (isAdmin === null) return <div className="flex justify-center py-24"><Spinner size={30} /></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white flex items-center gap-2.5">
            <ShieldAlert size={26} className="text-rose-300" /> Admin panel
          </h1>
          <p className="text-sm text-mut mt-1">Platform-wide management — users, campaigns, subscriptions, and payments.</p>
        </div>
        <Badge tone="red">Restricted access</Badge>
      </div>

      <div className="flex gap-2 flex-wrap">
        {([
          ['overview', 'Overview'],
          ['users', 'Users'],
          ['campaigns', 'Campaigns'],
          ['payments', 'Payments'],
        ] as [Tab, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${tab === k ? 'bg-primary/12 text-primary border border-primary/30' : 'text-mut hover:text-white border border-white/10'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview adminId={profile.id} />}
      {tab === 'users' && <UsersTab adminId={profile.id} />}
      {tab === 'campaigns' && <CampaignsTab adminId={profile.id} />}
      {tab === 'payments' && <PaymentsTab adminId={profile.id} />}
    </div>
  );
}

function Overview({ adminId }: { adminId: number }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`admin?admin_id=${adminId}&resource=overview`).then(setData).catch((e) => setError(e.message));
  }, [adminId]);

  if (error) return <EmptyState icon={<ShieldAlert size={22} />} title="Failed to load" desc={error} />;
  if (!data) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;
  const s = data.stats;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={<Users size={16} />} label="Total users" value={s.users} sub={`${s.clippers} clippers · ${s.owners} brands`} />
        <Stat icon={<Megaphone size={16} />} label="Campaigns" value={s.campaigns} tone="violet" sub={`${s.active_campaigns} active`} />
        <Stat icon={<Wallet size={16} />} label="Escrow held" value={money(s.escrow_held)} tone="cyan" sub={`${money(s.released)} released`} />
        <Stat icon={<DollarSign size={16} />} label="Platform revenue" value={money(s.platform_revenue)} tone="amber" sub={`+ ${money(s.mrr)}/mo subscriptions`} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={<Clapperboard size={16} />} label="Submissions" value={s.submissions} sub={`${s.pending_submissions} pending review`} />
        <Stat icon={<Eye size={16} />} label="Total views" value={compact(s.total_views)} tone="cyan" sub="across all clips" />
        <Stat icon={<BadgeCheck size={16} />} label="Verified users" value={s.verified} tone="violet" sub={`${Math.round((s.verified / Math.max(1, s.users)) * 100)}% of user base`} />
        <Stat icon={<CreditCard size={16} />} label="Payouts processing" value={s.payouts_processing} tone="amber" sub="via Stripe & PayPal" />
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        <div className="glass rounded-2xl p-6 lg:col-span-3">
          <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-faint mb-5">Escrow released by campaign</p>
          {data.spend_by_campaign.length ? (
            <Bars
              data={data.spend_by_campaign.map((c: any) => ({ label: c.label.length > 10 ? c.label.slice(0, 10) + '…' : c.label, value: c.value }))}
              color="#8b7cff" format={(n) => money(n)}
            />
          ) : <p className="text-sm text-mut py-8 text-center">No spend yet.</p>}
        </div>
        <div className="glass rounded-2xl p-6 lg:col-span-2 space-y-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-faint mb-4">Subscriptions</p>
            <Donut
              segments={[
                { label: 'Starter · $0', value: data.plan_counts.starter || 0, color: '#9096a8' },
                { label: 'Professional · $49', value: data.plan_counts.professional || 0, color: '#cdff4d' },
                { label: 'Enterprise · $199', value: data.plan_counts.enterprise || 0, color: '#8b7cff' },
              ].filter((x) => x.value > 0)}
              centerValue={money(s.mrr)} centerLabel="MRR" size={130}
            />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-faint mb-4">Submission pipeline</p>
            <Donut
              segments={[
                { label: 'Approved', value: data.submission_status.approved, color: '#cdff4d' },
                { label: 'Pending', value: data.submission_status.pending, color: '#fbbf24' },
                { label: 'Rejected', value: data.submission_status.rejected, color: '#fb7185' },
              ].filter((x) => x.value > 0)}
              centerValue={String(s.submissions)} centerLabel="clips" size={130}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function UsersTab({ adminId }: { adminId: number }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchUsers = useCallback(() =>
    api(`admin?admin_id=${adminId}&resource=users`).then(setUsers).catch(console.error), [adminId]);

  useEffect(() => { fetchUsers().finally(() => setLoading(false)); }, [fetchUsers]);

  const act = async (key: string, body: any) => {
    setBusyId(key);
    try { await api('admin', { method: 'PUT', body: { admin_id: adminId, ...body } }); await fetchUsers(); } catch (e) { console.error(e); }
    setBusyId(null);
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;

  const shown = users.filter((u) => !q || `${u.name} ${u.email} ${u.handle}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
        <input className="input pl-10" placeholder="Search users…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="glass rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left">
              {['User', 'Role', 'Tier', 'Plan', 'Earnings', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3.5 text-faint font-bold text-[11px] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((u, i) => (
              <tr key={u.id} className={`border-b border-white/5 last:border-0 ${i % 2 ? '' : 'bg-white/2'} ${u.moderation === 'suspended' ? 'opacity-60' : ''}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} src={u.avatar_url} size={30} />
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate flex items-center gap-1.5">
                        {u.name} {u.verified && <BadgeCheck size={12} className="text-cyan shrink-0" />}
                      </p>
                      <p className="text-[11px] text-faint truncate">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3"><Badge tone={u.role === 'owner' ? 'violet' : 'lime'}>{u.role === 'owner' ? 'Brand' : 'Clipper'}</Badge></td>
                <td className="px-4 py-3">{u.role === 'clipper' ? <TierBadge tier={u.tier} /> : <span className="text-faint">—</span>}</td>
                <td className="px-4 py-3">
                  {u.role === 'owner' ? (
                    <select
                      className="input !py-1.5 !px-2 text-xs !w-auto capitalize"
                      value={u.plan || 'starter'}
                      disabled={busyId === `plan-${u.id}`}
                      onChange={(e) => act(`plan-${u.id}`, { action: 'plan', profile_id: u.id, plan: e.target.value })}
                    >
                      {['starter', 'professional', 'enterprise'].map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  ) : <span className="text-faint">Free</span>}
                </td>
                <td className="px-4 py-3 font-mono text-mut">{money(u.total_earnings)}</td>
                <td className="px-4 py-3">
                  {u.moderation === 'suspended' ? <Badge tone="red">Suspended</Badge> : <Badge tone="green">Active</Badge>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <button
                      disabled={busyId === `verify-${u.id}`}
                      onClick={() => act(`verify-${u.id}`, { action: 'verify', profile_id: u.id, verified: !u.verified })}
                      className="btn-ghost text-[11px] px-2.5 py-1.5"
                      title={u.verified ? 'Remove verified badge' : 'Grant verified badge'}
                    >
                      <BadgeCheck size={12} className={u.verified ? 'text-cyan' : ''} /> {u.verified ? 'Unverify' : 'Verify'}
                    </button>
                    <button
                      disabled={busyId === `mod-${u.id}`}
                      onClick={() => act(`mod-${u.id}`, { action: 'moderation', profile_id: u.id, status: u.moderation === 'suspended' ? 'active' : 'suspended' })}
                      className={`text-[11px] px-2.5 py-1.5 ${u.moderation === 'suspended' ? 'btn-ghost' : 'btn-danger'}`}
                    >
                      <Ban size={12} /> {u.moderation === 'suspended' ? 'Reinstate' : 'Suspend'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CampaignsTab({ adminId }: { adminId: number }) {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);

  const fetchAll = useCallback(() =>
    api(`admin?admin_id=${adminId}&resource=campaigns`).then(setCampaigns).catch(console.error), [adminId]);

  useEffect(() => { fetchAll().finally(() => setLoading(false)); }, [fetchAll]);

  const act = async (key: string, body: any) => {
    setBusyId(key);
    try { await api('admin', { method: 'PUT', body: { admin_id: adminId, ...body } }); await fetchAll(); } catch (e) { console.error(e); }
    setBusyId(null);
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;

  return (
    <div className="space-y-3">
      {campaigns.map((c) => (
        <div key={c.id} className="glass rounded-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-display font-bold text-white truncate">{c.title}</h3>
              <StatusBadge status={c.status} />
            </div>
            <p className="text-xs text-faint mt-1">{c.brand_name} · {c.category} · created {timeAgo(c.created_at)}</p>
            <p className="text-xs font-mono text-mut mt-1.5">{money(c.spent)} released of {money(c.budget)} escrow</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              disabled={busyId === `st-${c.id}`}
              onClick={() => act(`st-${c.id}`, { action: 'campaign_status', campaign_id: c.id, status: c.status === 'active' ? 'paused' : 'active' })}
              className="btn-ghost text-xs px-3 py-2"
            >
              {c.status === 'active' ? <><Pause size={13} /> Pause</> : <><Play size={13} /> Activate</>}
            </button>
            <button onClick={() => setConfirmDelete(c)} className="btn-danger text-xs px-3 py-2"><Trash2 size={13} /> Remove</button>
          </div>
        </div>
      ))}

      <Modal open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} title="Remove campaign?">
        <p className="text-sm text-mut leading-relaxed">
          This permanently removes “{confirmDelete?.title}” along with all applications and submissions. Use for policy violations only.
        </p>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setConfirmDelete(null)} className="btn-ghost flex-1">Cancel</button>
          <button
            disabled={busyId === 'delete'}
            onClick={async () => { await act('delete', { action: 'campaign_delete', campaign_id: confirmDelete.id }); setConfirmDelete(null); }}
            className="btn-danger flex-1"
          >
            {busyId === 'delete' ? <Spinner size={14} /> : 'Remove campaign'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function PaymentsTab({ adminId }: { adminId: number }) {
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api(`admin?admin_id=${adminId}&resource=transactions`).then(setTxns).catch(console.error).finally(() => setLoading(false));
  }, [adminId]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;

  return (
    <div className="glass rounded-2xl overflow-hidden overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left">
            {['User', 'Type', 'Description', 'Status', 'Amount', 'When'].map((h) => (
              <th key={h} className="px-4 py-3.5 text-faint font-bold text-[11px] uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {txns.map((t, i) => (
            <tr key={t.id} className={`border-b border-white/5 last:border-0 ${i % 2 ? '' : 'bg-white/2'}`}>
              <td className="px-4 py-3">
                <p className="font-bold text-white">{t.profile_name}</p>
                <p className="text-[10px] text-faint capitalize">{t.profile_role === 'owner' ? 'Brand' : 'Clipper'}</p>
              </td>
              <td className="px-4 py-3"><Badge tone={t.type === 'earning' ? 'lime' : t.type === 'escrow' ? 'violet' : t.type === 'payout' ? 'red' : t.type === 'referral' ? 'amber' : 'cyan'}>{t.type}</Badge></td>
              <td className="px-4 py-3 text-mut max-w-[280px] truncate">{t.description}</td>
              <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
              <td className={`px-4 py-3 font-mono font-bold ${Number(t.amount) >= 0 ? 'text-primary' : 'text-rose-300'}`}>
                {Number(t.amount) >= 0 ? '+' : ''}{money(t.amount)}
              </td>
              <td className="px-4 py-3 text-[11px] font-mono text-faint">{timeAgo(t.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
