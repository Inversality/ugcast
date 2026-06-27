import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — global stock actors + the signed-in user's saved personas.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const actors = await prisma.actor.findMany({
      where: {
        OR: [{ isStock: true }, { userId: session.user.id }],
      },
      orderBy: [{ isStock: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(actors);
  } catch (error) {
    console.error("[ACTORS_GET_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST — save an already-uploaded image as a reusable persona.
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { name, imageUrl, description, gender, ageRange, setting } = await req.json();

    if (!name || !imageUrl) {
      return NextResponse.json({ error: "name and imageUrl are required" }, { status: 400 });
    }

    const actor = await prisma.actor.create({
      data: {
        name,
        imageUrl,
        description: description || null,
        gender: gender || null,
        ageRange: ageRange || null,
        setting: setting || null,
        isStock: false,
        userId: session.user.id,
      },
    });

    return NextResponse.json(actor);
  } catch (error) {
    console.error("[ACTORS_POST_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
