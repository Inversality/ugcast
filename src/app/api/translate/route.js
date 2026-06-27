import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { complete } from "@/lib/openai";
import { textGenCost } from "@/lib/muapi";
import { UserService } from "@/lib/services/user";

// POST — translate a UGC script while preserving its spoken, conversational
// tone (not a literal/robotic translation).
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { script, targetLanguage } = await req.json();
    if (!script || !targetLanguage) {
      return NextResponse.json({ error: "script and targetLanguage are required" }, { status: 400 });
    }

    const cost = textGenCost();
    const { total } = await UserService.getBalance(session.user.id);
    if (total < cost) {
      return NextResponse.json({ error: `Insufficient credits. Translation costs ${cost} credits.` }, { status: 403 });
    }

    const system =
      "You are a native-speaker UGC ad localizer. Translate the script into the target language so it " +
      "sounds natural and persuasive to a native speaker — adapt idioms and slang rather than translating " +
      "literally. Keep the spoken, first-person ad tone. Output ONLY the translated script.";

    const user = `Target language: ${targetLanguage}\n\nScript:\n${script}`;

    const translated = await complete({ system, user, temperature: 0.6, maxTokens: 800 });
    await UserService.spend(session.user.id, cost);
    return NextResponse.json({ script: translated, language: targetLanguage });
  } catch (error) {
    console.error("[TRANSLATE_ERROR]", error);
    return NextResponse.json({ error: error.message || "Internal Error" }, { status: 500 });
  }
}
