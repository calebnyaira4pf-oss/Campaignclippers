import admin from '../server/api/admin.js';
import applications from '../server/api/applications.js';
import assistant from '../server/api/assistant.js';
import billing from '../server/api/billing.js';
import campaigns from '../server/api/campaigns.js';
import connections from '../server/api/connections.js';
import eligibility from '../server/api/eligibility.js';
import funding from '../server/api/funding.js';
import fx from '../server/api/fx.js';
import leaderboard from '../server/api/leaderboard.js';
import notifications from '../server/api/notifications.js';
import payoutMethods from '../server/api/payout-methods.js';
import profiles from '../server/api/profiles.js';
import referrals from '../server/api/referrals.js';
import reviews from '../server/api/reviews.js';
import robots from '../server/api/robots.js';
import sitemap from '../server/api/sitemap.js';
import submissions from '../server/api/submissions.js';
import tiers from '../server/api/tiers.js';
import transactions from '../server/api/transactions.js';
import validateEmail from '../server/api/validate-email.js';

const routes = {
  admin,
  applications,
  assistant,
  billing,
  campaigns,
  connections,
  eligibility,
  funding,
  fx,
  leaderboard,
  notifications,
  'payout-methods': payoutMethods,
  profiles,
  referrals,
  reviews,
  robots,
  sitemap,
  submissions,
  tiers,
  transactions,
  'validate-email': validateEmail,
};

export default async function handler(req, res) {
  const routeValue = req.query?.route;
  const route = String(Array.isArray(routeValue) ? routeValue[0] : routeValue || '')
    .split('/')[0]
    .replace(/\.js$/, '');
  const routeHandler = routes[route];

  if (!routeHandler) {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    return await routeHandler(req, res);
  } catch (error) {
    console.error(`Unhandled API error for ${route}:`, error);
    if (res.headersSent) return res.end();
    return res.status(500).json({ error: 'Internal server error' });
  }
}
