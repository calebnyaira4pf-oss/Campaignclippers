# Campaign Clippers

Campaign Clippers is a React and TypeScript marketplace for brands to run short-form video campaigns and clippers to apply, submit work, and manage their profile.

## Stack and layout

- React 19, TypeScript, Vite, React Router, Tailwind CSS, and Framer Motion.
- Supabase Auth for user sessions and Supabase Postgres for application data.
- Vercel serverless functions in `api/` for database operations and integrations.
- `src/pages/` contains public and dashboard screens; `src/components/` and `src/contexts/` contain shared UI and session state.
- `src/lib/api.ts` sends dashboard requests to `/api/*` with the current Supabase access token.

## Local development

1. Install Node.js and npm, then install and start Docker Desktop (or another Docker-compatible runtime).
2. Install the Supabase CLI in the project with `npm install --save-dev supabase`.
3. Start the local Supabase services from this repository root with `npx supabase start`. The first start downloads containers and can take several minutes.
4. Copy `.env.example` to `.env.local`. Use `npx supabase status` to get the local API URL, anon key, and service role key; set `VITE_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL` to the local API URL, and use the matching local anon/service keys.
5. Install dependencies with `npm install` and start Vite with `npm run dev`.

This repository now includes `supabase/config.toml` and an initial schema migration in `supabase/migrations/`. Supabase applies migrations when the local project starts. The local Supabase Studio is available at `http://127.0.0.1:54323` when the stack is healthy.

The previous `.env.local` values pointed to placeholder hosts, so they cannot connect to a hosted or local database. Replace them with the values from `supabase status` after the local stack starts. Do not commit `.env.local` or expose the service role key.

Useful commands:

- `npm run typecheck` — TypeScript project check.
- `npm run lint` — ESLint.
- `npm run build` — production frontend build.

The `api/` functions follow Vercel's serverless function convention. For local API development, use the Vercel CLI or deploy a preview; Vite alone serves the frontend but does not run these functions.

## Supabase setup

The application expects tables referenced by the API handlers, including profiles, campaigns, campaign requirements, applications, submissions, connected accounts, account verifications, transactions, payout methods, notifications, reviews, referrals, referral codes, clipper tiers, platform admins, and user moderation. This repository currently has no schema migration files. Create and review the database schema and row level security policies before deploying. Server routes use the service role key and must keep their authentication and ownership checks in place.

## Current payment limitations

Funding, subscription charges, campaign escrow, approval payouts, and withdrawals are intentionally unavailable until provider settlement and webhook verification are implemented. The API returns an error instead of recording unverified payment input as completed funds. Do not enable real money workflows until provider credentials, idempotent webhooks, ledger transactions, and reconciliation are in place.

Social profile statistics are fetched from public platform endpoints where available. Users must complete account ownership verification before those statistics count toward eligibility and tiers. Public endpoints may change or be rate limited.

## Deployment

Configure the environment variables in `.env.example` in the correct Vercel scopes. Browser variables prefixed with `VITE_` are bundled into the client and must contain public values only. Keep `SUPABASE_SERVICE_ROLE_KEY` and any model or provider secrets server-side. Configure Supabase redirect URLs and Google OAuth settings to match local and deployed origins.
