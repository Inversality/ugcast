import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { BillingService } from "@/lib/services/billing";

// POST — schedule the active subscription to cancel at the end of the current
// billing period. The user keeps access (and credit refreshes) until then.
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

    const result = await BillingService.cancelAtPeriodEnd(session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[BILLING_CANCEL_ERROR]", error);
    return NextResponse.json({ error: error.message || "Internal Error" }, { status: 500 });
  }
}
