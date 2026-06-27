import { prisma } from "../prisma";

// Add `months` calendar months to a date.
function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export const UserService = {
  // Lazily refresh a subscriber's monthly allowance. Credits EXPIRE each cycle:
  // when the refresh date passes, `credits` is reset to the plan's monthly
  // allowance (unused allowance is forfeited) and the next refresh is scheduled
  // ~1 month out. Works for monthly AND yearly subscribers with no cron — yearly
  // plans bill once a year but still get their allowance topped up each month
  // here. Top-up credits are untouched. Returns the (possibly updated) user.
  async refreshSubscriptionCredits(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true, topupCredits: true, monthlyCredits: true, planStatus: true, creditsRefreshAt: true },
    });
    if (!user) return null;

    const due = user.planStatus === "active" && user.creditsRefreshAt && new Date() >= user.creditsRefreshAt;
    if (!due) return user;

    return prisma.user.update({
      where: { id: userId },
      data: {
        credits: user.monthlyCredits,
        creditsRefreshAt: addMonths(new Date(), 1),
      },
      select: { credits: true, topupCredits: true, monthlyCredits: true, planStatus: true, creditsRefreshAt: true },
    });
  },

  // Spendable balance after applying any due refresh.
  async getBalance(userId) {
    const user = await this.refreshSubscriptionCredits(userId);
    const credits = user?.credits || 0;
    const topupCredits = user?.topupCredits || 0;
    return { credits, topupCredits, total: credits + topupCredits };
  },

  // Total spendable credits (subscription allowance + top-ups). Back-compat name.
  async getCredits(userId) {
    const { total } = await this.getBalance(userId);
    return total;
  },

  // Grant one-time top-up credits (purchased packs). These persist and do not
  // expire. Used by the Stripe webhook for one-time pack purchases.
  async addTopupCredits(userId, amount) {
    if (amount <= 0) return;
    return await prisma.user.update({
      where: { id: userId },
      data: { topupCredits: { increment: amount } },
    });
  },

  // Back-compat alias — one-time grants are top-ups.
  async addCredits(userId, amount) {
    return this.addTopupCredits(userId, amount);
  },

  // Activate or renew a subscription: set plan metadata and (re)fill the monthly
  // allowance. Called from the Stripe webhook on checkout / invoice.paid.
  async applySubscription(userId, { plan, interval, monthlyCredits, periodEnd, stripeCustomerId, stripeSubscriptionId }) {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        plan,
        planInterval: interval,
        planStatus: "active",
        monthlyCredits,
        credits: monthlyCredits, // reset allowance this cycle
        creditsRefreshAt: addMonths(new Date(), 1),
        ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
        ...(stripeCustomerId ? { stripeCustomerId } : {}),
        ...(stripeSubscriptionId ? { stripeSubscriptionId } : {}),
      },
    });
  },

  // Cancel a subscription: stop future refreshes. Remaining allowance + top-ups
  // stay until used.
  async cancelSubscription(userId) {
    return await prisma.user.update({
      where: { id: userId },
      data: { planStatus: "canceled", creditsRefreshAt: null, monthlyCredits: 0 },
    });
  },

  // Spend credits atomically: subscription allowance first, then top-ups.
  // Throws if the combined balance is insufficient.
  async spend(userId, amount) {
    if (amount <= 0) return;
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { credits: true, topupCredits: true },
      });
      const total = (user?.credits || 0) + (user?.topupCredits || 0);
      if (total < amount) throw new Error("Insufficient credits available");

      const fromAllowance = Math.min(user.credits, amount);
      const fromTopup = amount - fromAllowance;
      return tx.user.update({
        where: { id: userId },
        data: {
          credits: { decrement: fromAllowance },
          topupCredits: { decrement: fromTopup },
        },
      });
    });
  },

  // Back-compat alias for the old deduct API.
  async deductCredits(userId, amount) {
    return this.spend(userId, amount);
  },
};

export const getCredits = UserService.getCredits.bind(UserService);
export const getBalance = UserService.getBalance.bind(UserService);
export const addCredits = UserService.addCredits.bind(UserService);
export const addTopupCredits = UserService.addTopupCredits.bind(UserService);
export const applySubscription = UserService.applySubscription.bind(UserService);
export const cancelSubscription = UserService.cancelSubscription.bind(UserService);
export const refreshSubscriptionCredits = UserService.refreshSubscriptionCredits.bind(UserService);
export const spend = UserService.spend.bind(UserService);
export const deductCredits = UserService.deductCredits.bind(UserService);
export default UserService;
