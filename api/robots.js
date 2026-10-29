export default function handler(req, res) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'campaign-clippers.vercel.app';
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /dashboard',
    'Disallow: /api/',
    '',
    `Sitemap: https://${host}/sitemap.xml`,
    '',
  ].join('\n');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.status(200).send(body);
}
