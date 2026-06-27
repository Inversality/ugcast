import { SUBSCRIPTIONS, TOPUPS } from "./pricing";

// Build the legacy `plans` lookup (one-time top-ups, keyed by id) from the
// pricing model so checkout/webhook code keeps working off a single source.
const topupPlans = Object.fromEntries(
  TOPUPS.map((p) => [p.id, { id: p.id, name: p.name, credits: p.credits, price: p.price }])
);

// ── Founder accounts ─────────────────────────────────────────────────────────
// Founders get UNLIMITED usage: they are never charged credits and are never
// blocked by the balance check. Sourced from FOUNDER_EMAILS (comma-separated),
// defaulting to the project owner. Matching is case-insensitive.
const FOUNDER_EMAILS = (process.env.FOUNDER_EMAILS || "christhedevoured@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// True if `email` belongs to a founder account.
export function isFounderEmail(email) {
  return !!email && FOUNDER_EMAILS.includes(email.toLowerCase());
}

// Public, canonical origin of the site — the single source of truth for SEO
// (metadataBase, canonical URLs, sitemap, robots, JSON-LD). Prefer an explicit
// NEXT_PUBLIC_SITE_URL in production; fall back to the auth URL, then the
// deployed default. Always normalized without a trailing slash.
const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXTAUTH_URL ||
  "https://open-ai-ugc.vercel.app"
).replace(/\/+$/, "");

const config = {
  appName: "UGCast",
  tagline: "AI UGC actors that sell.",
  siteUrl,
  founderEmails: FOUNDER_EMAILS,
  auth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    secret: process.env.NEXTAUTH_SECRET,
    url: process.env.NEXTAUTH_URL || "http://localhost:3000",
    webhook_url: process.env.WEBHOOK_URL || process.env.NEXTAUTH_URL || "http://localhost:3000",
  },
  stripe: {
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    // One-time top-up packs (legacy `plans` key, kept for the existing
    // /api/checkout + webhook flow). Sourced from the pricing model.
    plans: topupPlans,
    topups: TOPUPS,
    // Recurring monthly/yearly subscription tiers.
    subscriptions: SUBSCRIPTIONS,
  },
  muapi: {
    apiKey: process.env.UGC_API_KEY,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || "gpt-5",
  },
};

export default config;
