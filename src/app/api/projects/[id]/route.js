import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function ownedProject(id, userId) {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== userId) return null;
  return project;
}

// GET — a single project (polled while rendering).
export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await params;
    const project = await ownedProject(id, session.user.id);
    if (!project) return new NextResponse("Not Found", { status: 404 });

    return NextResponse.json(project);
  } catch (error) {
    console.error("[PROJECT_GET_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH — save title / timeline edits.
export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await params;
    const project = await ownedProject(id, session.user.id);
    if (!project) return new NextResponse("Not Found", { status: 404 });

    const { title, timeline } = await req.json();
    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(timeline !== undefined ? { timeline } : {}),
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PROJECT_PATCH_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE — remove a project.
export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await params;
    const project = await ownedProject(id, session.user.id);
    if (!project) return new NextResponse("Not Found", { status: 404 });

    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PROJECT_DELETE_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
