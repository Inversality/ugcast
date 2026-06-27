import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateApiKey } from "@/lib/apiKey";

// GET — list the user's API keys (masked; raw values are never retrievable).
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

    const keys = await prisma.apiKey.findMany({
      where: { userId: session.user.id, revoked: false },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, prefix: true, createdAt: true, lastUsedAt: true },
    });
    return NextResponse.json(keys);
  } catch (error) {
    console.error("[KEYS_GET_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST — create a new API key. The raw key is returned ONCE here.
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

    const { name } = await req.json().catch(() => ({}));
    const { raw, hash, prefix } = generateApiKey();

    const record = await prisma.apiKey.create({
      data: { name: name || "API key", hash, prefix, userId: session.user.id },
      select: { id: true, name: true, prefix: true, createdAt: true },
    });

    // `key` is only present in this response and never stored in plaintext.
    return NextResponse.json({ ...record, key: raw });
  } catch (error) {
    console.error("[KEYS_POST_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
