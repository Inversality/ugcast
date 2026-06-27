import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { completeJSON } from "@/lib/openai";
import { textGenCost } from "@/lib/muapi";
import { UserService } from "@/lib/services/user";

// POST — generate N scroll-stopping opening hooks for a product (feeds batch
// hook-testing in the studio).
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { product, angle, count = 5 } = await req.json();
    if (!product) {
      return NextResponse.json({ error: "product is required" }, { status: 400 });
    }

    const n = Math.max(1, Math.min(10, Number(count) || 5));

    const cost = textGenCost();
    const { total } = await UserService.getBalance(session.user.id);
    if (total < cost) {
      return NextResponse.json({ error: `Insufficient credits. Generating hooks costs ${cost} credits.` }, { status: 403 });
    }

    const system =
      "You are a direct-response UGC ad strategist. You write first-person spoken HOOKS — the very " +
      "first 1-2 sentences of a TikTok/Reels ad — designed to stop the scroll. Vary the angle across " +
      "hooks (curiosity, problem/agitation, bold claim, relatable confession, before/after, question).";

    const user =
      `Product: ${product}\n` +
      (angle ? `Context: ${angle}\n` : "") +
      `Write ${n} distinct hooks. Return JSON: { "hooks": ["...", "..."] }`;

    const data = await completeJSON({ system, user, temperature: 1.0, maxTokens: 700 });
    const hooks = Array.isArray(data?.hooks) ? data.hooks.slice(0, n) : [];
    await UserService.spend(session.user.id, cost);
    return NextResponse.json({ hooks });
  } catch (error) {
    console.error("[HOOKS_ERROR]", error);
    return NextResponse.json({ error: error.message || "Internal Error" }, { status: 500 });
  }
}
