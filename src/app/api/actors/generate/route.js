import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateActorImage, imageGenCost } from "@/lib/muapi";
import { UserService } from "@/lib/services/user";

// POST — generate a brand-new AI actor face from a persona description and save
// it as one of the user's reusable actors.
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { name, description, gender, ageRange, setting } = await req.json();

    const cost = imageGenCost();
    const { total } = await UserService.getBalance(session.user.id);
    if (total < cost) {
      return NextResponse.json(
        { error: `Insufficient credits. Generating an actor costs ${cost} credits.` },
        { status: 403 }
      );
    }

    const imageUrl = await generateActorImage({ description, gender, ageRange, setting });

    const actor = await prisma.actor.create({
      data: {
        name: name || description?.slice(0, 40) || "Custom Actor",
        description: description || null,
        imageUrl,
        gender: gender || null,
        ageRange: ageRange || null,
        setting: setting || null,
        isStock: false,
        userId: session.user.id,
      },
    });

    await UserService.spend(session.user.id, cost);

    return NextResponse.json(actor);
  } catch (error) {
    console.error("[ACTOR_GENERATE_ERROR]", error);
    return NextResponse.json({ error: error.message || "Internal Error" }, { status: 500 });
  }
}
