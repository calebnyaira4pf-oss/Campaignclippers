import {
  Youtube, Instagram, Twitter, Twitch, Facebook, Linkedin, Ghost, Pin, AtSign,
  MessageCircle, Gamepad2, Globe, Music2, Video,
} from 'lucide-react';

const ICONS: Record<string, any> = {
  tiktok: Music2,
  youtube: Youtube,
  instagram: Instagram,
  twitter: Twitter,
  x: Twitter,
  twitch: Twitch,
  facebook: Facebook,
  linkedin: Linkedin,
  snapchat: Ghost,
  pinterest: Pin,
  threads: AtSign,
  reddit: MessageCircle,
  kick: Gamepad2,
  rumble: Video,
};

const LABELS: Record<string, string> = {
  tiktok: 'TikTok',
  youtube: 'YouTube',
  instagram: 'Instagram',
  twitter: 'X / Twitter',
  x: 'X / Twitter',
  twitch: 'Twitch',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  snapchat: 'Snapchat',
  pinterest: 'Pinterest',
  threads: 'Threads',
  reddit: 'Reddit',
  kick: 'Kick',
  rumble: 'Rumble',
};

export function PlatformIcon({ platform, size = 14, className = '' }: { platform: string; size?: number; className?: string }) {
  const p = (platform || '').toLowerCase();
  const Icon = ICONS[p] || Globe;
  return <Icon size={size} className={className} />;
}

export const platformLabel = (p: string) => {
  const key = (p || '').toLowerCase();
  if (LABELS[key]) return LABELS[key];
  return p ? p.charAt(0).toUpperCase() + p.slice(1) : '';
};

// Presets shown in the "connect a platform" picker — users can also add any
// custom platform beyond these.
export const PLATFORM_PRESETS = [
  'tiktok', 'youtube', 'instagram', 'twitter', 'twitch', 'facebook',
  'snapchat', 'linkedin', 'threads', 'reddit', 'pinterest', 'kick', 'rumble',
];

// Canonical web URL for a user's real profile on each platform — mirror of the
// server-side helper so "View profile" always opens their actual account.
export function profileUrl(platform: string, handle: string): string {
  const h = String(handle || '').trim().replace(/^@/, '').replace(/\s+/g, '');
  if (!h) return '';
  const p = String(platform || '').toLowerCase();
  const map: Record<string, string> = {
    youtube: `https://www.youtube.com/@${h}`,
    tiktok: `https://www.tiktok.com/@${h}`,
    instagram: `https://www.instagram.com/${h}`,
    twitter: `https://x.com/${h}`,
    x: `https://x.com/${h}`,
    twitch: `https://www.twitch.tv/${h}`,
    facebook: `https://www.facebook.com/${h}`,
    linkedin: `https://www.linkedin.com/in/${h}`,
    snapchat: `https://www.snapchat.com/add/${h}`,
    pinterest: `https://www.pinterest.com/${h}`,
    threads: `https://www.threads.net/@${h}`,
    reddit: `https://www.reddit.com/user/${h.replace(/^u\//, '')}`,
    kick: `https://kick.com/${h}`,
    rumble: `https://rumble.com/user/${h}`,
  };
  return map[p] || '';
}
