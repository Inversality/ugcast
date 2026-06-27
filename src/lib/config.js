import { SUBSCRIPTIONS, TOPUPS } from "./pricing";

// Build the legacy `plans` lookup (one-time top-ups, keyed by id) from the
// pricing model so checkout/webhook code keeps working off a single source.
const topupPlans = Object.fromEntries(
  TOPUPS.map((p) => [p.id, { id: p.id, name: p.name, credits: p.credits, price: p.price }])
);

const config = {
  appName: "UGCast",
  tagline: "AI UGC actors that sell.",
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
