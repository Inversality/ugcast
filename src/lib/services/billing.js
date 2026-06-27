import { stripe } from "../stripe";
import { prisma } from "../prisma";
import config from "../config";
import { UserService } from "./user";
import { getSubscription, subscriptionPrice, subscriptionPriceId } from "../pricing";

export const BillingService = {
  // ── One-time top-up pack checkout (mode: payment) ──────────────────────────
  async createCheckoutSession(userId, planId) {
    const plan = config.stripe.plans[planId];
    if (!plan) throw new Error("Invalid plan selected");

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${plan.name}`,
              description: `Purchase ${plan.credits} top-up credits for AI generations.`,
            },
            unit_amount: plan.price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${config.auth.url}/pricing?success=true`,
      cancel_url: `${config.auth.url}/pricing?canceled=true`,
      metadata: { type: "topup", userId, credits: plan.credits.toString() },
    });

    return session.url;
  },

  // ── Recurring subscription checkout (mode: subscription) ───────────────────
  // `interval` is "month" or "year". Uses a configured Stripe Price ID when
  // present, otherwise falls back to inline recurring price_data so the app
  // works with zero Stripe dashboard setup.
  async createSubscriptionCheckout(userId, planId, interval = "month") {
    const plan = getSubscription(planId);
    if (!plan) throw new Error("Invalid subscription plan selected");
    if (interval !== "month" && interval !== "year") throw new Error("Invalid billing interval");

    const priceId = subscriptionPriceId(plan, interval);
    const lineItem = priceId
      ? { price: priceId, quantity: 1 }
      : {
          price_data: {
            currency: "usd",
            product_data: {
              name: `UGCast ${plan.name} (${interval === "year" ? "Yearly" : "Monthly"})`,
              description: `${plan.monthlyCredits.toLocaleString()} credits per month.`,
            },
            unit_amount: subscriptionPrice(plan, interval),
            recurring: { interval },
          },
          quantity: 1,
        };

    const metadata = {
      type: "subscription",
      userId,
      plan: plan.id,
      interval,
      monthlyCredits: plan.monthlyCredits.toString(),
    };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [lineItem],
      mode: "subscription",
      success_url: `${config.auth.url}/pricing?success=true`,
      cancel_url: `${config.auth.url}/pricing?canceled=true`,
      metadata,
      subscription_data: { metadata }, // so renewal invoices carry plan info
    });

    return session.url;
  },

  // ── Stripe customer portal ─────────────────────────────────────────────────
  // Hosted page where a user can update their payment method, download invoices,
  // change or cancel their subscription. Requires a Stripe customer (created on
  // first subscription checkout) and the portal to be enabled in the dashboard.
  async createPortalSession(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });
    if (!user?.stripeCustomerId) {
      throw new Error("No billing account yet — subscribe to a plan first.");
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${config.auth.url}/billing`,
    });
    return session.url;
  },

  // Schedule the active subscription to stop at the end of the current period.
  // The plan stays usable (and credits keep refreshing) until Stripe emits
  // `customer.subscription.deleted`, which our webhook turns into a cancel.
  async cancelAtPeriodEnd(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeSubscriptionId: true },
    });
    if (!user?.stripeSubscriptionId) {
      throw new Error("No active subscription to cancel.");
    }

    const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    return {
      success: true,
      cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
    };
  },

  // ── Invoices / payment history ─────────────────────────────────────────────
  // Returns the user's Stripe invoices (subscription charges), newest first, in a
  // trimmed shape safe to send to the client. Returns [] when there is no Stripe
  // customer yet. Note: one-time top-up purchases use payment-mode checkout and
  // therefore don't create invoices — they won't appear here.
  async listInvoices(userId, limit = 12) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });
    if (!user?.stripeCustomerId) return [];

    const res = await stripe.invoices.list({ customer: user.stripeCustomerId, limit });
    return res.data.map((inv) => ({
      id: inv.id,
      number: inv.number,
      created: inv.created ? new Date(inv.created * 1000).toISOString() : null,
      amount: inv.amount_paid ?? inv.amount_due ?? 0,
      currency: inv.currency || "usd",
      status: inv.status, // paid | open | void | uncollectible | draft
      hostedUrl: inv.hosted_invoice_url || null,
      pdf: inv.invoice_pdf || null,
      description: inv.lines?.data?.[0]?.description || null,
    }));
  },

  // ── Webhook dispatch ───────────────────────────────────────────────────────
  async handleWebhook(body, signature) {
    const event = stripe.webhooks.constructEvent(body, signature, config.stripe.webhookSecret);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription") {
          return this._activateSubscription(session);
        }
        return this._creditTopup(session);
      }

      // Renewal (and first) payment on a subscription — refill the allowance.
      case "invoice.paid":
      case "invoice.payment_succeeded": {
        return this._renewSubscription(event.data.object);
      }

      case "customer.subscription.deleted": {
        return this._cancelSubscription(event.data.object);
      }
    }

    return { success: false, ignored: event.type };
  },

  async _creditTopup(session) {
    const userId = session.metadata?.userId;
    const credits = parseInt(session.metadata?.credits || "0", 10);
    if (userId && credits > 0) {
      await UserService.addTopupCredits(userId, credits);
      return { success: true, type: "topup", userId, credits };
    }
    return { success: false };
  },

  async _activateSubscription(session) {
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan;
    const interval = session.metadata?.interval || "month";
    const monthlyCredits = parseInt(session.metadata?.monthlyCredits || "0", 10);
    if (!userId || !plan || monthlyCredits <= 0) return { success: false };

    await UserService.applySubscription(userId, {
      plan,
      interval,
      monthlyCredits,
      stripeCustomerId: session.customer || undefined,
      stripeSubscriptionId: session.subscription || undefined,
    });
    return { success: true, type: "subscription", userId, plan, interval };
  },

  // On a renewal invoice, reset the monthly allowance for the matching user.
  async _renewSubscription(invoice) {
    const subscriptionId = invoice.subscription;
    if (!subscriptionId) return { success: false };

    // Skip the very first invoice — activation is handled by checkout.session.completed.
    if (invoice.billing_reason && invoice.billing_reason === "subscription_create") {
      return { success: true, type: "subscription-create-ignored" };
    }

    const user = await prisma.user.findUnique({ where: { stripeSubscriptionId: subscriptionId } });
    if (!user || user.planStatus !== "active") return { success: false };

    await UserService.applySubscription(user.id, {
      plan: user.plan,
      interval: user.planInterval || "month",
      monthlyCredits: user.monthlyCredits,
      stripeSubscriptionId: subscriptionId,
    });
    return { success: true, type: "renewal", userId: user.id, plan: user.plan };
  },

  async _cancelSubscription(subscription) {
    const user = await prisma.user.findUnique({ where: { stripeSubscriptionId: subscription.id } });
    if (!user) return { success: false };
    await UserService.cancelSubscription(user.id);
    return { success: true, type: "canceled", userId: user.id };
  },
};

export const createCheckoutSession = BillingService.createCheckoutSession.bind(BillingService);
export const createSubscriptionCheckout = BillingService.createSubscriptionCheckout.bind(BillingService);
export const createPortalSession = BillingService.createPortalSession.bind(BillingService);
export const cancelAtPeriodEnd = BillingService.cancelAtPeriodEnd.bind(BillingService);
export const listInvoices = BillingService.listInvoices.bind(BillingService);
export const handleWebhook = BillingService.handleWebhook.bind(BillingService);
export default BillingService;
