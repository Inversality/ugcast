import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { UserService } from "@/lib/services/user";

// GET — billing summary for the signed-in user: plan, status, renewal date and
// credit balance (allowance + top-ups). Applies any due monthly refresh.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

    const summary = await UserService.getBillingSummary(session.user.id);
    if (!summary) return new NextResponse("Not Found", { status: 404 });
    return NextResponse.json(summary);
  } catch (error) {
    console.error("[BILLING_GET_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
