import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { complete } from "@/lib/openai";
import { textGenCost } from "@/lib/muapi";
import { UserService } from "@/lib/services/user";

// POST — generate a UGC ad script from a product + angle using GPT-5.
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { product, angle, tone = "authentic", length = "short" } = await req.json();
    if (!product) {
      return NextResponse.json({ error: "product is required" }, { status: 400 });
    }

    const cost = textGenCost();
    const { total } = await UserService.getBalance(session.user.id);
    if (total < cost) {
      return NextResponse.json({ error: `Insufficient credits. AI script writing costs ${cost} credits.` }, { status: 403 });
    }

    const seconds = length === "long" ? "30-45" : length === "medium" ? "20-30" : "12-20";

    const system =
      "You are an expert UGC ad copywriter. You write short, punchy, first-person spoken scripts " +
      "for TikTok / Reels / Shorts that sound like a real person talking to camera — natural, " +
      "conversational, no stage directions, no emojis, no hashtags. Open with a scroll-stopping hook " +
      "in the first line, build desire, and end with a clear call to action.";

    const user =
      `Product: ${product}\n` +
      (angle ? `Angle / hook idea: ${angle}\n` : "") +
      `Tone: ${tone}\n` +
      `Target spoken length: about ${seconds} seconds.\n\n` +
      "Write ONLY the words the actor speaks, as a single flowing script.";

    const script = await complete({ system, user, temperature: 0.9, maxTokens: 600 });
    await UserService.spend(session.user.id, cost);
    return NextResponse.json({ script });
  } catch (error) {
    console.error("[SCRIPT_ERROR]", error);
    return NextResponse.json({ error: error.message || "Internal Error" }, { status: 500 });
  }
}
