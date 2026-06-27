import { NextResponse } from "next/server";
import { resolveApiKey } from "@/lib/apiKey";
import { runGeneration } from "@/lib/generation";

// Public API — POST /api/v1/generate
// Auth: `x-api-key: oau_...` (an API key created in the dashboard).
// Body: same shape as the studio's /api/generate (modelId, script/prompt,
// actorIds, settings, voiceId, emotion, language, scripts, count, images).
export async function POST(req) {
  try {
    const rawKey = req.headers.get("x-api-key");
    const userId = await resolveApiKey(rawKey);
    if (!userId) {
      return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
    }

    const body = await req.json();
    const { status, body: result } = await runGeneration(userId, body);
    return NextResponse.json(result, { status });
  } catch (error) {
    console.error("[V1_GENERATE_ERROR]", error);
    return NextResponse.json({ error: error.message || "Internal Error" }, { status: 500 });
  }
}
