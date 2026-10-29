import { useState, useEffect } from 'react';
import { Trophy, BadgeCheck, Star, Eye, Crown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api, money, compact } from '../lib/api';
import { Spinner, Avatar, Badge, EmptyState } from '../components/ui';
import TierBadge from '../components/TierBadge';

export default function Leaderboard() {
  const { profile } = useAuth();
  const [clippers, setClippers] = useState<any[]>([]);
  const [tiers, setTiers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api('leaderboard').then(setClippers).catch((e) => setError(e.message)).finally(() => setLoading(false));
    api('tiers?all=1').then((rows: any[]) => {
      const map: Record<number, string> = {};
      for (const r of rows) map[r.profile_id] = r.tier;
      setTiers(map);
    }).catch(() => {});
  }, []);

  if (loading) return <div className="flex justify-center py-24"><Spinner size={30} /></div>;
  if (error) return <EmptyState icon={<Trophy size={22} />} title="Couldn't load leaderboard" desc={error} />;

  const podium = clippers.slice(0, 3);
  const rest = clippers.slice(3);
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-white flex items-center justify-center gap-2"><Trophy size={26} className="text-primary" /> Clipper leaderboard</h1>
        <p className="text-sm text-mut mt-1">Ranked by lifetime escrow-released earnings.</p>
      </div>

      {/* Podium */}
      <div className="flex items-end justify-center gap-3 md:gap-5">
        {podiumOrder.map((c) => {
          const rank = clippers.indexOf(c) + 1;
          const isFirst = rank === 1;
          return (
            <div key={c.id} className={`glass rounded-2xl px-4 md:px-7 pt-6 pb-5 text-center flex-1 max-w-[220px] ${isFirst ? 'border-primary/40 bg-primary/5 -translate-y-3' : ''}`}>
              {isFirst && <Crown size={20} className="text-primary mx-auto mb-2" />}
              <div className="relative inline-block">
                <Avatar name={c.name} src={c.avatar_url} size={isFirst ? 64 : 52} />
                <span className={`absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full grid place-items-center text-[11px] font-black ${isFirst ? 'bg-primary text-ink' : 'bg-elev text-white border border-white/15'}`}>{rank}</span>
              </div>
              <p className="font-bold text-white mt-3 text-sm truncate flex items-center justify-center gap-1">
                {c.name} {c.verified && <BadgeCheck size={13} className="text-cyan shrink-0" />}
              </p>
              <p className="text-[11px] text-faint truncate">{c.handle}</p>
              <div className="mt-1.5"><TierBadge tier={tiers[c.id]} /></div>
              <p className={`font-display font-bold mt-2 ${isFirst ? 'text-primary text-xl' : 'text-white text-lg'}`}>{money(c.total_earnings)}</p>
              <p className="text-[10px] text-faint font-mono mt-0.5">{compact(c.total_views)} views</p>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left">
              <th className="px-5 py-3.5 text-faint font-bold text-[11px] uppercase tracking-wider w-14">Rank</th>
              <th className="px-5 py-3.5 text-faint font-bold text-[11px] uppercase tracking-wider">Clipper</th>
              <th className="px-5 py-3.5 text-faint font-bold text-[11px] uppercase tracking-wider">Verification tier</th>
              <th className="px-5 py-3.5 text-faint font-bold text-[11px] uppercase tracking-wider text-right">Views</th>
              <th className="px-5 py-3.5 text-faint font-bold text-[11px] uppercase tracking-wider text-right">Rating</th>
              <th className="px-5 py-3.5 text-faint font-bold text-[11px] uppercase tracking-wider text-right">Earnings</th>
            </tr>
          </thead>
          <tbody>
            {rest.map((c, i) => {
              const rank = i + 4;
              const me = c.id === profile?.id;
              return (
                <tr key={c.id} className={`border-b border-white/5 last:border-0 ${me ? 'bg-primary/6' : i % 2 ? '' : 'bg-white/2'}`}>
                  <td className="px-5 py-3.5 font-mono text-faint">#{rank}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={c.name} src={c.avatar_url} size={30} />
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate flex items-center gap-1">
                          {c.name} {c.verified && <BadgeCheck size={12} className="text-cyan shrink-0" />}
                          {me && <Badge tone="lime" className="ml-1">You</Badge>}
                        </p>
                        <p className="text-[11px] text-faint truncate">{c.handle}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5"><TierBadge tier={tiers[c.id]} /></td>
                  <td className="px-5 py-3.5 text-right font-mono text-mut"><span className="inline-flex items-center gap-1"><Eye size={11} /> {compact(c.total_views)}</span></td>
                  <td className="px-5 py-3.5 text-right font-mono text-mut"><span className="inline-flex items-center gap-1"><Star size={11} className="text-amber-300" /> {Number(c.rating) > 0 ? Number(c.rating).toFixed(1) : '—'}</span></td>
                  <td className="px-5 py-3.5 text-right font-mono font-bold text-primary">{money(c.total_earnings)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
