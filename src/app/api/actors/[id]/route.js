import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE — remove one of the user's own saved actors (stock actors are global
// and cannot be deleted by users).
export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    const actor = await prisma.actor.findUnique({ where: { id } });
    if (!actor || actor.userId !== session.user.id) {
      return new NextResponse("Not Found", { status: 404 });
    }

    await prisma.actor.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ACTOR_DELETE_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
