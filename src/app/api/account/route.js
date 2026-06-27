import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { BillingService } from "@/lib/services/billing";
import { UserService } from "@/lib/services/user";

// GET — the signed-in user's account/profile.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

    const account = await UserService.getAccount(session.user.id);
    if (!account) return new NextResponse("Not Found", { status: 404 });
    return NextResponse.json(account);
  } catch (error) {
    console.error("[ACCOUNT_GET_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH — update editable profile fields (display name).
export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

    const { name } = await req.json().catch(() => ({}));
    const account = await UserService.updateProfile(session.user.id, { name });
    return NextResponse.json(account);
  } catch (error) {
    console.error("[ACCOUNT_PATCH_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE — permanently delete the account and all associated data. Best-effort
// cancels any live Stripe subscription first so the user stops being billed.
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

    try {
      await BillingService.cancelAtPeriodEnd(session.user.id);
    } catch {
      // No subscription (or Stripe not configured) — deletion proceeds regardless.
    }

    await UserService.deleteAccount(session.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ACCOUNT_DELETE_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
