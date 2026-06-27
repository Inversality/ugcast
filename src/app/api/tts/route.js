import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { synthesizeSpeech, ttsCost } from "@/lib/muapi";
import { UserService } from "@/lib/services/user";

// POST — synthesize a standalone voiceover preview from a script. (The talking-
// avatar pipeline in /api/generate calls synthesizeSpeech directly; this route
// is for previewing a voice before generating the full video.)
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { script, voiceId, emotion, language } = await req.json();
    if (!script?.trim()) {
      return NextResponse.json({ error: "script is required" }, { status: 400 });
    }

    const cost = ttsCost();
    const { total } = await UserService.getBalance(session.user.id);
    if (total < cost) {
      return NextResponse.json(
        { error: `Insufficient credits. A voiceover preview costs ${cost} credits.` },
        { status: 403 }
      );
    }

    const audioUrl = await synthesizeSpeech({ script, voiceId, emotion, language });

    await UserService.spend(session.user.id, cost);

    return NextResponse.json({ audioUrl });
  } catch (error) {
    console.error("[TTS_ERROR]", error);
    return NextResponse.json({ error: error.message || "Internal Error" }, { status: 500 });
  }
}
