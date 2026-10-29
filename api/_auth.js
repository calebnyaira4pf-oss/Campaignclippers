import supabase from './db-client.js';

// API routes use the service role for database work, so every route must verify
// the caller's Supabase access token before reading or changing user data.
export async function requireAuth(req, res) {
  const value = req.headers.authorization || '';
  const token = value.startsWith('Bearer ') ? value.slice(7) : '';
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return null;
    }
    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('*').eq('user_id', data.user.id).maybeSingle();
    if (profileError) throw profileError;
    return { user: data.user, profile };
  } catch (error) {
    console.error('Authentication lookup failed:', error);
    if (!res.headersSent) res.status(503).json({ error: 'Authentication service unavailable' });
    return null;
  }
}

export function requireOwnProfile(ctx, res, profileId) {
  if (!ctx) return false;
  if (!ctx.profile) {
    res.status(403).json({ error: 'No profile is linked to this account' });
    return false;
  }
  if (String(ctx.profile.id) !== String(profileId)) {
    res.status(403).json({ error: 'You can only access your own profile' });
    return false;
  }
  return true;
}

export function requireRole(ctx, res, role) {
  if (!ctx) return false;
  if (!ctx.profile) {
    res.status(403).json({ error: 'No profile is linked to this account' });
    return false;
  }
  if (ctx.profile.role !== role) {
    res.status(403).json({ error: `${role} access required` });
    return false;
  }
  return true;
}
