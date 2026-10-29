import supabase from './supabase';

export async function api<T = any>(path: string, options: { method?: string; body?: any } = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`/api/${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
  return data as T;
}

export const money = (n: number | string) => {
  const v = Number(n) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: v % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(v);
};

export const compact = (n: number | string) =>
  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(n) || 0);

export const timeAgo = (d: string) => {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const CATEGORIES = ['Gaming', 'Fitness', 'Tech', 'Fashion', 'Music', 'Food', 'Finance', 'Education', 'Entertainment'];
export const PLATFORMS = ['tiktok', 'youtube', 'instagram', 'twitter'];

export const CATEGORY_THUMBS: Record<string, string> = {
  Gaming: '/campaigns/gaming.jpg',
  Fitness: '/campaigns/fitness.jpg',
  Tech: '/campaigns/tech.jpg',
  Fashion: '/campaigns/fashion.jpg',
  Music: '/campaigns/music.jpg',
  Food: '/campaigns/food.jpg',
  Finance: '/campaigns/tech.jpg',
  Education: '/campaigns/tech.jpg',
  Entertainment: '/campaigns/music.jpg',
};

export function calcEarnings(campaign: any, views: number) {
  const v = Number(views) || 0;
  const cpm = Number(campaign?.cpm_rate) || 0;
  const fixed = Number(campaign?.fixed_rate) || 0;
  if (campaign?.reward_model === 'fixed') return fixed;
  if (campaign?.reward_model === 'hybrid') return fixed + (v / 1000) * cpm;
  return (v / 1000) * cpm;
}

export function rewardLabel(c: any) {
  if (!c) return '';
  if (c.reward_model === 'fixed') return `${money(c.fixed_rate)} / clip`;
  if (c.reward_model === 'hybrid') return `${money(c.fixed_rate)} + ${money(c.cpm_rate)} CPM`;
  return `${money(c.cpm_rate)} / 1K views`;
}
