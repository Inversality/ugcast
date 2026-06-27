import { NextResponse } from "next/server";
import { resolveApiKey } from "@/lib/apiKey";
import { prisma } from "@/lib/prisma";

// Public API — GET /api/v1/actors
// Auth: `x-api-key: oau_...`. Returns stock actors + the key owner's actors,
// so API consumers can discover actorIds to pass to /api/v1/generate.
export async function GET(req) {
  try {
    const rawKey = req.headers.get("x-api-key");
    const userId = await resolveApiKey(rawKey);
    if (!userId) {
      return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
    }

    const actors = await prisma.actor.findMany({
      where: { OR: [{ isStock: true }, { userId }] },
      orderBy: [{ isStock: "desc" }, { createdAt: "desc" }],
      select: { id: true, name: true, imageUrl: true, gender: true, ageRange: true, setting: true, isStock: true },
    });
    return NextResponse.json(actors);
  } catch (error) {
    console.error("[V1_ACTORS_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
