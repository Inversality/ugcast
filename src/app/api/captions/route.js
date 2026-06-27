import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { scriptToCaptions } from "@/lib/captions";

// POST — generate timed captions for a scene from its (known) script and the
// clip's frame duration. Returns [{ text, fromFrame, toFrame }].
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

    const { script, durationInFrames, wordsPerChunk } = await req.json();
    if (!script?.trim() || !durationInFrames) {
      return NextResponse.json({ error: "script and durationInFrames are required" }, { status: 400 });
    }

    const captions = scriptToCaptions(script, durationInFrames, wordsPerChunk || 4);
    return NextResponse.json({ captions });
  } catch (error) {
    console.error("[CAPTIONS_ERROR]", error);
    return NextResponse.json({ error: error.message || "Internal Error" }, { status: 500 });
  }
}
