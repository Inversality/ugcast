import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { BillingService } from "@/lib/services/billing";

// Legacy alias for one-time top-up checkout. Kept for backwards compatibility.
// Price and credit amounts are derived SERVER-SIDE from the plan id — never from
// the request body — so a caller cannot mint arbitrary credits. Accepts either
// { planId } or { plan: { id } }.
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const planId = body.planId || body.plan?.id;
    if (!planId) {
      return NextResponse.json({ error: "Missing planId" }, { status: 400 });
    }

    const url = await BillingService.createCheckoutSession(session.user.id, planId);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("[STRIPE_CHECKOUT_ERROR]", error);
    return NextResponse.json({ error: error.message || "Internal Error" }, { status: 500 });
  }
}
