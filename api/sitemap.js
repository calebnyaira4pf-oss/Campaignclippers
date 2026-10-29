export default function handler(req, res) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'campaign-clippers.vercel.app';
  const base = `https://${host}`;
  const today = new Date().toISOString().slice(0, 10);
  const pages = [
    { path: '/', priority: '1.0', freq: 'weekly' },
    { path: '/pricing', priority: '0.9', freq: 'monthly' },
    { path: '/signup', priority: '0.8', freq: 'monthly' },
    { path: '/login', priority: '0.5', freq: 'monthly' },
    { path: '/legal/privacy', priority: '0.3', freq: 'yearly' },
    { path: '/legal/terms', priority: '0.3', freq: 'yearly' },
    { path: '/legal/gdpr', priority: '0.3', freq: 'yearly' },
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
    .map((p) => `  <url>\n    <loc>${base}${p.path}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${p.freq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`)
    .join('\n')}\n</urlset>\n`;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.status(200).send(xml);
}
