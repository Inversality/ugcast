# UGCast Monetization Model

A **top-down**, margin-guaranteed credit + subscription model. It is designed so
that **we can never spend more on model/API credits than the subscription pays
us** — by construction, not by luck.

The model lives in code in [`src/lib/pricing.js`](src/lib/pricing.js) (the single
source of truth). Per-model credit costs live in
[`src/lib/muapi.js`](src/lib/muapi.js). Everything below is derived from those.

---

## 1. The core idea (why we can't lose money)

Two constants do all the work:

| Constant | Value | Meaning |
|---|---|---|
| `COGS_PER_CREDIT` | **$0.001** | What **one credit costs us** in real provider spend |
| `RETAIL_PER_CREDIT` | **$0.005** (5×) | What **one credit sells for** |

Every model's credit price is set **proportional to its real provider cost** at
the same $0.001/credit rate (Veo 8s = 4,000 cr ≈ $4 of real cost; Grok 6s = 30 cr
≈ $0.03; a talking-avatar render = 235 cr ≈ $0.235; etc.).

Because **we always collect 5× what a generation costs us**, every single
generation earns **~80% gross margin no matter which model is used**. A user can
dump their entire allowance into the single most expensive model and we still
keep ~80%. That is the guarantee.

> **The rule:** revenue per credit ($0.005) > cost per credit ($0.001) for
> *every* model ⇒ total revenue > total COGS for *every* usage mix.

### Per-model economics (at list price)

| Generation | Credits | Our cost (COGS) | We collect | Margin |
|---|--:|--:|--:|--:|
| Veo 3.1 — 8s / 720p | 4,000 | $4.00 | $20.00 | 80% |
| Veo 3.1 — 8s / 1080p | 5,200 | $5.20 | $26.00 | 80% |
| Veo 3.1 — 8s / 4k | 5,920 | $5.92 | $29.60 | 80% |
| Seedance 2 — 5s | 250 | $0.25 | $1.25 | 80% |
| Happy Horse 1 — 5s | 180 | $0.18 | $0.90 | 80% |
| Grok Video — 6s / 480p | 30 | $0.03 | $0.15 | 80% |
| Grok Video — 6s / 720p | 60 | $0.06 | $0.30 | 80% |
| Talking avatar + voiceover | 235 | $0.235 | $1.18 | 80% |
| Kling avatar (std) + voiceover | 147 | $0.147 | $0.74 | 80% |
| Background music (Suno) | 40 | $0.04 | $0.20 | 80% |
| AI actor face (Flux) | 30 | $0.03 | $0.15 | 80% |
| Voiceover only (TTS) | 15 | $0.015 | $0.075 | 80% |
| AI script / hooks / translate (GPT-5) | 15 | $0.015 | $0.075 | 80% |

To re-baseline when you get exact MUAPI invoices: edit the `creditCost` math in
[`muapi.js`](src/lib/muapi.js) and/or `COGS_PER_CREDIT` in
[`pricing.js`](src/lib/pricing.js). Nothing else needs to change.

---

## 2. Subscriptions (monthly & yearly)

Credits **refresh every cycle and expire** (no rollover) — this keeps the COGS
liability bounded and the guarantee airtight. Yearly = pay for **10 months, get
12** (2 months free); the monthly allowance is still topped up each month.

| Tier | Monthly | Yearly | Effective /mo | Credits / month |
|---|--:|--:|--:|--:|
| **Starter** | $19 | $190 | $15.83 | 4,000 |
| **Pro** ⭐ | $49 | $490 | $40.83 | 10,000 |
| **Studio** | $99 | $990 | $82.50 | 20,000 |

### Worst-case margin (subscriber burns 100% of allowance, after Stripe 2.9%+30¢)

| Tier | Monthly margin | Yearly margin |
|---|--:|--:|
| Starter | **78.0%** | 73.9% |
| Pro | **78.8%** | 74.8% |
| Studio | **79.1%** | 75.0% |

At a realistic **~60% utilization**, monthly margins rise to **~87%**. Even in
the absolute worst case (100% usage on the cheapest-margin path, every month of a
yearly plan), we keep **≥73.9%** — we never approach spending more than revenue.

### What each plan buys (mix examples)

| Tier | Veo 8s/720p | Seedance 5s | Avatar videos | AI scripts |
|---|--:|--:|--:|--:|
| Starter (4,000) | 1 | 16 | 17 | 266 |
| Pro (10,000) | 2–3 | 40 | 42 | 666 |
| Studio (20,000) | 5 | 80 | 85 | 1,333 |

> Why yearly is safe despite the discount: the 2-free-months cut is largely paid
> for by Stripe charging **one** annual fee instead of 12 monthly fees. The net
> effect is only ~4 margin points lower than monthly.

---

## 3. Top-up packs (one-time overage)

For subscribers who burn through their allowance. These **persist (never expire)**
and are spent **only after** the monthly allowance runs out. Flat $0.005/credit.

| Pack | Price | Credits | Our max cost | Margin |
|---|--:|--:|--:|--:|
| Small | $5 | 1,000 | $1.00 | 78.0% |
| Medium | $10 | 2,000 | $2.00 | 78.7% |
| Large | $20 | 4,000 | $4.00 | 79.1% |
| XL | $50 | 10,000 | $10.00 | 79.3% |

---

## 4. How credits are tracked (two buckets)

The `User` row has two credit balances:

- **`credits`** — the subscription allowance. Reset to `monthlyCredits` each
  cycle; **unused is forfeited**.
- **`topupCredits`** — purchased packs. **Persist** across cycles.

Spending always draws **allowance first, then top-ups**
([`UserService.spend`](src/lib/services/user.js)).

### Monthly refresh without a cron job

Refresh is **lazy**: on any balance read/spend,
[`refreshSubscriptionCredits`](src/lib/services/user.js) checks
`creditsRefreshAt`; if the date has passed and the plan is active, it resets the
allowance and schedules the next refresh ~1 month out. This works for **monthly
and yearly** subscribers alike with no scheduled task. The Stripe `invoice.paid`
webhook also resets monthly plans on renewal as a belt-and-suspenders.

---

## 5. Stripe wiring

| Flow | Endpoint | Stripe mode |
|---|---|---|
| Subscribe (monthly/yearly) | `POST /api/checkout/subscription` | `subscription` |
| Buy top-up pack | `POST /api/checkout` | `payment` |
| Provider callbacks | `POST /api/webhook/stripe` | — |

Webhook events handled in [`billing.js`](src/lib/services/billing.js):
`checkout.session.completed` (activate sub or credit top-up), `invoice.paid` /
`invoice.payment_succeeded` (renew → refill allowance),
`customer.subscription.deleted` (cancel → stop refreshes).

Checkout uses inline `price_data` so it works with **zero Stripe dashboard
setup**. To use real Stripe Products/Prices, set the `STRIPE_PRICE_*` env vars
referenced in [`pricing.js`](src/lib/pricing.js) and they'll be used instead.

---

## 6. Deploying these changes

The data model changed (subscription fields + `topupCredits` on `User`). Apply
the migration before deploying:

```bash
npx prisma migrate dev --name add-subscriptions   # or `prisma db push` for a quick sync
npx prisma generate
```

New (optional) env vars — checkout falls back to inline pricing if unset:

```
STRIPE_PRICE_STARTER_MONTHLY=   STRIPE_PRICE_STARTER_YEARLY=
STRIPE_PRICE_PRO_MONTHLY=       STRIPE_PRICE_PRO_YEARLY=
STRIPE_PRICE_STUDIO_MONTHLY=    STRIPE_PRICE_STUDIO_YEARLY=
```

---

## 7. Assumptions to confirm

- **Provider costs.** The $0.001/credit anchor matches MUAPI's published video
  rates (~$0.029/s Kling, ~$0.40–0.75/s Veo, $0.50–2.50 per 10s clip) but
  MUAPI's exact per-model prices aren't machine-readable. Verify against a real
  invoice and adjust `creditCost`. Headroom is large: even if a model truly cost
  **5×** our estimate, we'd still break even (and at 2× we'd still keep ~60%).
- **Stripe fees.** Modeled at US card pricing 2.9% + $0.30. International/Amex
  cards cost slightly more — the 78%+ buffer absorbs it.
- **Free trial.** New users get **100 credits** (was 10) — enough to try the AI
  tools and a voiceover/actor preview, not enough to render full videos for free.
