import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { generateMusic, musicCost } from "@/lib/muapi";
import { UserService } from "@/lib/services/user";

// POST — generate a background music track (Suno via MUAPI) for an ad.
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

    const { prompt, duration } = await req.json().catch(() => ({}));

    const cost = musicCost();
    const { total } = await UserService.getBalance(session.user.id);
    if (total < cost) {
      return NextResponse.json({ error: `Insufficient credits. Music costs ${cost} credits.` }, { status: 403 });
    }

    const url = await generateMusic({ prompt, duration });

    await UserService.spend(session.user.id, cost);

    return NextResponse.json({ url });
  } catch (error) {
    console.error("[MUSIC_ERROR]", error);
    return NextResponse.json({ error: error.message || "Internal Error" }, { status: 500 });
  }
}
