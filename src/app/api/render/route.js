import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ENDPOINTS } from "@/lib/muapi";
import path from "path";
import os from "os";
import { promises as fs } from "fs";

// POST — render a project's timeline to a final MP4 via Remotion, upload it to
// MUAPI for hosting, and store the URL on the project.
//
// NOTE: server-side Remotion rendering drives a headless browser and is heavy /
// long-running. It runs fine on a normal Node host (`npm start`) or a dedicated
// render worker, but NOT on short-timeout serverless functions. @remotion/*
// renderer packages are dynamically imported so they never bundle into the app.
export async function POST(req) {
  let projectId;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    projectId = body.projectId;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== session.user.id) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const timeline = project.timeline || {};
    const scenes = timeline.scenes || [];
    if (!scenes.length) {
      return NextResponse.json({ error: "Add at least one scene before rendering." }, { status: 400 });
    }

    await prisma.project.update({ where: { id: projectId }, data: { status: "rendering", outputUrl: null } });

    // Dynamically load the (externalized) Remotion render toolchain.
    let bundle, renderMedia, selectComposition;
    try {
      ({ bundle } = await import("@remotion/bundler"));
      ({ renderMedia, selectComposition } = await import("@remotion/renderer"));
    } catch {
      await prisma.project.update({ where: { id: projectId }, data: { status: "failed" } });
      return NextResponse.json(
        { error: "Render toolchain unavailable. Install @remotion/renderer and @remotion/bundler on the render host." },
        { status: 501 }
      );
    }

    const entry = path.resolve(process.cwd(), "remotion", "index.js");
    const serveUrl = await bundle({ entryPoint: entry });

    const inputProps = {
      scenes,
      music: timeline.music || null,
      captionStyle: timeline.captionStyle || {},
      width: timeline.width || 1080,
      height: timeline.height || 1920,
    };

    const composition = await selectComposition({ serveUrl, id: "AdComposition", inputProps });

    const outPath = path.join(os.tmpdir(), `ad-${projectId}-${Date.now()}.mp4`);
    await renderMedia({ composition, serveUrl, codec: "h264", outputLocation: outPath, inputProps });

    // Upload the finished MP4 to MUAPI to get a hosted URL.
    const buf = await fs.readFile(outPath);
    const fd = new FormData();
    fd.append("file", new Blob([buf], { type: "video/mp4" }), "ad.mp4");
    const upRes = await fetch(ENDPOINTS.upload, {
      method: "POST",
      headers: { "x-api-key": process.env.UGC_API_KEY },
      body: fd,
    });
    if (!upRes.ok) throw new Error(`Upload of rendered video failed: ${upRes.status}`);
    const upData = await upRes.json();

    await fs.unlink(outPath).catch(() => {});

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: { status: "completed", outputUrl: upData.url },
    });

    return NextResponse.json({ success: true, outputUrl: updated.outputUrl });
  } catch (error) {
    console.error("[RENDER_ERROR]", error);
    if (projectId) {
      await prisma.project.update({ where: { id: projectId }, data: { status: "failed" } }).catch(() => {});
    }
    return NextResponse.json({ error: error.message || "Render failed" }, { status: 500 });
  }
}
