import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { BillingService } from "@/lib/services/billing";

// GET — the user's Stripe invoices (payment history). Returns [] when there's no
// billing account or Stripe isn't configured, so the UI degrades gracefully.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

    const invoices = await BillingService.listInvoices(session.user.id);
    return NextResponse.json(invoices);
  } catch (error) {
    console.error("[BILLING_INVOICES_ERROR]", error);
    // Degrade quietly — an empty history is better than a broken billing page.
    return NextResponse.json([]);
  }
}
