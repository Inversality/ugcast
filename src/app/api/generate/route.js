import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { runGeneration } from "@/lib/generation";

// POST — kick off one or more UGC video generations for the signed-in user.
// Two pipelines (talking-avatar / raw-video) and batch support live in the
// shared core (src/lib/generation.js), reused by the public API at /api/v1.
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { status, body: result } = await runGeneration(session.user.id, body);
    return NextResponse.json(result, { status });
  } catch (error) {
    console.error("[GENERATE_ERROR]", error);
    return NextResponse.json({ error: error.message || "Internal Error" }, { status: 500 });
  }
}
