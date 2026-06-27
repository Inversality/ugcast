import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — list the user's multi-scene ad projects.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

    const projects = await prisma.project.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(projects);
  } catch (error) {
    console.error("[PROJECTS_GET_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST — create a new (draft) project, optionally seeded with a timeline.
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

    const { title, timeline } = await req.json().catch(() => ({}));

    const project = await prisma.project.create({
      data: {
        userId: session.user.id,
        title: title || "Untitled ad",
        timeline: timeline || { scenes: [], music: null, captionStyle: {} },
        status: "draft",
      },
    });
    return NextResponse.json(project);
  } catch (error) {
    console.error("[PROJECTS_POST_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
