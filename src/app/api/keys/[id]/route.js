import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE — revoke one of the user's API keys.
export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await params;
    const key = await prisma.apiKey.findUnique({ where: { id } });
    if (!key || key.userId !== session.user.id) {
      return new NextResponse("Not Found", { status: 404 });
    }

    await prisma.apiKey.update({ where: { id }, data: { revoked: true } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[KEY_DELETE_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
