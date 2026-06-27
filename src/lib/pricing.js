// ─────────────────────────────────────────────────────────────────────────────
// MONETIZATION MODEL — single source of truth for all pricing economics.
//
// This file encodes a *top-down*, margin-guaranteed model. The one idea that
// makes it impossible to lose money on usage:
//
//   1 credit  = $0.001 of real provider cost (COGS)   ← the anchor
//   1 credit sells for ~$0.005 (5× markup)            ← the price
//
// Every model's credit cost (see src/lib/muapi.js `creditCost`) is proportional
// to that model's real provider cost at the same $0.001/credit rate. So whatever
// model a user spends on, we collect ~5× what the generation costs us → ~80%
// gross margin on EVERY generation, regardless of model mix. A subscriber can
// burn their entire monthly allowance on the single most expensive model and we
// still profit. That is the "never spend more on credits than the subscription
// pays us" guarantee, by construction.
//
// To re-baseline when you get exact MUAPI invoice data: update COGS_PER_CREDIT
// (and/or the per-model `creditCost` math in muapi.js). Everything else derives.
// ─────────────────────────────────────────────────────────────────────────────

// Real provider cost of one credit, in USD. Anchored so that the existing
// per-model credit costs equal (real $ cost × 1000). Veo 8s/720p = 4000cr ≈ $4,
// Kling avatar ≈ 132cr ≈ $0.13, Grok 6s ≈ 30cr ≈ $0.03 — all consistent with
// MUAPI's published video rates (~$0.029/s Kling, ~$0.40–0.75/s Veo).
export const COGS_PER_CREDIT = 0.001;

// Markup applied to COGS to get the retail price of a credit. 5× ⇒ 80% target
// gross margin before payment fees. (Chosen 2026-06-26.)
export const MARKUP = 5;

// Retail value of one credit, in USD.
export const RETAIL_PER_CREDIT = COGS_PER_CREDIT * MARKUP; // $0.005

// Stripe standard card pricing — used to compute *net* revenue and the true
// worst-case margin after fees.
export const STRIPE_PCT = 0.029;
export const STRIPE_FLAT = 0.3;

// Yearly plans bill 10 months' worth for 12 months of service (2 months free).
export const YEARLY_MONTHS_BILLED = 10;

// ── Helpers ──────────────────────────────────────────────────────────────────

// Real provider cost (USD) of N credits.
export function cogsForCredits(credits) {
  return credits * COGS_PER_CREDIT;
}

// Retail value (USD) of N credits at list price.
export function retailForCredits(credits) {
  return credits * RETAIL_PER_CREDIT;
}

// Stripe fee (USD) for charging `amountUsd`.
export function stripeFee(amountUsd) {
  return amountUsd * STRIPE_PCT + STRIPE_FLAT;
}

// Revenue we keep after Stripe takes its cut.
export function netRevenue(amountUsd) {
  return amountUsd - stripeFee(amountUsd);
}

// Top-down: the maximum credit allowance we can give for `priceUsd` while
// keeping at least `targetMargin` gross margin in the *worst case* (subscriber
// spends 100% of the allowance). credits ≤ netRevenue × (1 − margin) / COGS.
export function maxSafeCredits(priceUsd, targetMargin = 0.8) {
  const budget = netRevenue(priceUsd) * (1 - targetMargin);
  return Math.floor(budget / COGS_PER_CREDIT);
}

// Worst-case gross margin (fraction 0–1) for granting `credits` at `priceUsd`:
// every credit consumed on the lowest-margin model, after Stripe fees.
export function worstCaseMargin(priceUsd, credits) {
  const net = netRevenue(priceUsd);
  if (net <= 0) return 0;
  return (net - cogsForCredits(credits)) / net;
}

// ── Subscription tiers (recurring) ───────────────────────────────────────────
// Prices in cents (Stripe unit_amount). `monthlyCredits` is the allowance that
// refreshes each billing cycle and EXPIRES (does not roll over). Clean credit
// numbers are rounded to map to whole Veo videos; each still clears the
// "net revenue > COGS" bar with ~74–79% worst-case margin (see worstCaseMargin).
export const SUBSCRIPTIONS = [
  {
    id: "starter",
    name: "Starter",
    target: "Solo creators getting started",
    monthlyCredits: 4000,
    monthlyPrice: 1900, // $19/mo
    yearlyPrice: 19000, // $190/yr ($15.83/mo effective)
    // Stripe Price IDs (optional). If set, checkout uses them; otherwise we fall
    // back to inline price_data so the app works with no Stripe dashboard setup.
    stripeMonthlyPriceId: process.env.STRIPE_PRICE_STARTER_MONTHLY,
    stripeYearlyPriceId: process.env.STRIPE_PRICE_STARTER_YEARLY,
    features: [
      "4,000 credits / month",
      "All models incl. Veo 3.1 & Seedance 2",
      "AI script, hooks & 30-language dubbing",
      "HD downloads, no watermark",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    target: "Freelancers & growing brands",
    popular: true,
    monthlyCredits: 10000,
    monthlyPrice: 4900, // $49/mo
    yearlyPrice: 49000, // $490/yr
    stripeMonthlyPriceId: process.env.STRIPE_PRICE_PRO_MONTHLY,
    stripeYearlyPriceId: process.env.STRIPE_PRICE_PRO_YEARLY,
    features: [
      "10,000 credits / month",
      "Everything in Starter",
      "Batch generation (up to 8 at once)",
      "Talking-avatar lip-sync + voiceover",
      "Priority rendering queue",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    target: "Agencies & high-volume teams",
    monthlyCredits: 20000,
    monthlyPrice: 9900, // $99/mo
    yearlyPrice: 99000, // $990/yr
    stripeMonthlyPriceId: process.env.STRIPE_PRICE_STUDIO_MONTHLY,
    stripeYearlyPriceId: process.env.STRIPE_PRICE_STUDIO_YEARLY,
    features: [
      "20,000 credits / month",
      "Everything in Pro",
      "Programmatic API access (/api/v1)",
      "Commercial usage rights",
      "Top-up packs at member rate",
    ],
  },
];

// ── Top-up packs (one-time overage) ──────────────────────────────────────────
// Persist on the account (do NOT expire), spent only after the monthly
// allowance is exhausted. Flat $0.005/credit (5× COGS).
export const TOPUPS = [
  { id: "small",  name: "1,000 Credits",  credits: 1000,  price: 500  }, // $5
  { id: "medium", name: "2,000 Credits",  credits: 2000,  price: 1000 }, // $10
  { id: "large",  name: "4,000 Credits",  credits: 4000,  price: 2000 }, // $20
  { id: "xl",     name: "10,000 Credits", credits: 10000, price: 5000 }, // $50
];

// Look up a subscription tier by id.
export function getSubscription(planId) {
  return SUBSCRIPTIONS.find((p) => p.id === planId) || null;
}

// Look up a top-up pack by id.
export function getTopup(packId) {
  return TOPUPS.find((p) => p.id === packId) || null;
}

// Price (cents) for a subscription at a given interval ("month" | "year").
export function subscriptionPrice(plan, interval) {
  return interval === "year" ? plan.yearlyPrice : plan.monthlyPrice;
}

// Stripe Price ID for a subscription at a given interval, if configured.
export function subscriptionPriceId(plan, interval) {
  return interval === "year" ? plan.stripeYearlyPriceId : plan.stripeMonthlyPriceId;
}
