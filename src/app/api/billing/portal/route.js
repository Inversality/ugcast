import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { BillingService } from "@/lib/services/billing";

// POST — open the Stripe customer portal (manage payment method, invoices,
// upgrade/downgrade or cancel). Returns a one-time hosted URL to redirect to.
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

    const url = await BillingService.createPortalSession(session.user.id);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("[BILLING_PORTAL_ERROR]", error);
    return NextResponse.json({ error: error.message || "Internal Error" }, { status: 500 });
  }
}
