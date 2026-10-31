// @ts-nocheck
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function localApiPlugin() {
  return {
    name: 'campaignclippers-local-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || '/', 'http://localhost');
        if (!url.pathname.startsWith('/api/')) return next();

        try {
          const query = {};
          for (const [key, value] of url.searchParams.entries()) {
            if (key in query) query[key] = Array.isArray(query[key]) ? [...query[key], value] : [query[key], value];
            else query[key] = value;
          }
          const pathRoute = url.pathname.slice('/api/'.length).split('/')[0];
          if (pathRoute && pathRoute !== 'index' && !query.route) query.route = pathRoute;
          req.query = query;

          if (!['GET', 'HEAD'].includes(req.method || 'GET')) {
            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            const body = Buffer.concat(chunks).toString('utf8');
            if (body) {
              try { req.body = JSON.parse(body); }
              catch { res.statusCode = 400; res.end(JSON.stringify({ error: 'Invalid JSON body' })); return; }
            } else req.body = {};
          }

          res.status = (status) => { res.statusCode = status; return res; };
          res.json = (value) => {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify(value));
            return res;
          };
          res.send = (value) => {
            if (!res.hasHeader('Content-Type')) res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(value);
            return res;
          };

          const { default: handler } = await import('./api/index.js');
          await handler(req, res);
        } catch (error) {
          console.error('[local-api] Request failed:', error);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'Internal server error' }));
          }
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  const plugins = [react(), tailwindcss(), localApiPlugin()];
  try {
    // @ts-ignore
    const m = await import('./.vite-source-tags.js');
    plugins.push(m.sourceTags());
  } catch {}

  const serverEnv = loadEnv(mode, process.cwd(), '');
  for (const [key, value] of Object.entries(serverEnv)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }

  const env = loadEnv(mode, process.cwd(), ['VITE_', 'NEXT_PUBLIC_']);
  const processEnvDefines: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    processEnvDefines[`process.env.${key}`] = JSON.stringify(value);
  }

  return {
    plugins,
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    define: processEnvDefines,
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) return 'motion';
              if (id.includes('@supabase')) return 'supabase';
              if (id.includes('react-router')) return 'router';
              if (id.includes('react') || id.includes('scheduler')) return 'react';
              if (id.includes('lucide')) return 'icons';
            }
          },
        },
      },
    },
  };
})
