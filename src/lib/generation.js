// Shared generation core used by both the session-authenticated studio route
// (/api/generate) and the public API (/api/v1/generate). Given a resolved user
// id and a request body, it builds the variant list, checks credits, submits
// the MUAPI jobs, persists Creation rows, and decrements credits.
//
// Returns { status, body } — the caller turns it into an HTTP response.
import { prisma } from "@/lib/prisma";
import { ENDPOINTS, getModel, creditCost, ttsCost, synthesizeSpeech, submitJob } from "@/lib/muapi";
import { UserService } from "@/lib/services/user";

export async function runGeneration(userId, input) {
  const {
    modelId, prompt, script, settings = {}, images = [],
    actorId, actorIds, scripts, voiceId, emotion, language, count = 1,
  } = input || {};

  const model = getModel(modelId);
  if (!model || !ENDPOINTS[modelId]) {
    return { status: 400, body: { error: "Invalid model selected" } };
  }
  const isAvatar = model.category === "talking-avatar";

  // ── Build variants ─────────────────────────────────────────────────────────
  let variants = [];

  if (isAvatar) {
    const actorIdList = (actorIds?.length ? actorIds : actorId ? [actorId] : []).filter(Boolean);
    const scriptList = (scripts?.length ? scripts : script ? [script] : []).filter((s) => s && s.trim());

    if (!scriptList.length) {
      return { status: 400, body: { error: "A script is required for talking-avatar generation." } };
    }

    let actorRecords = [];
    if (actorIdList.length) {
      actorRecords = await prisma.actor.findMany({
        where: { id: { in: actorIdList }, OR: [{ isStock: true }, { userId }] },
      });
      if (!actorRecords.length) {
        return { status: 400, body: { error: "Selected actor not found." } };
      }
    } else if (images.length) {
      actorRecords = [{ id: null, imageUrl: images[0] }];
    } else {
      return { status: 400, body: { error: "Select an actor or provide a face image." } };
    }

    for (const actor of actorRecords) {
      for (const s of scriptList) variants.push({ actor, script: s });
    }
  } else {
    const promptList = scripts?.length ? scripts : [prompt];
    if (!promptList[0]?.trim()) {
      return { status: 400, body: { error: "A prompt is required." } };
    }
    const repeats = Math.max(1, Math.min(8, Number(count) || 1));
    for (const p of promptList) {
      for (let i = 0; i < repeats; i++) variants.push({ prompt: p });
    }
  }

  variants = variants.slice(0, 8);
  const isBatch = variants.length > 1;
  const batchId = isBatch ? `batch_${Math.random().toString(36).slice(2, 10)}` : null;

  // ── Credit check ───────────────────────────────────────────────────────────
  const perVariantCost = creditCost(modelId, settings) + (isAvatar ? ttsCost() : 0);
  const totalCost = perVariantCost * variants.length;

  // Applies any due monthly refresh, then returns subscription + top-up balance.
  const { total: available } = await UserService.getBalance(userId);
  if (available < totalCost) {
    return {
      status: 403,
      body: { error: `Insufficient credits. This requires ${totalCost} but you have ${available}.` },
    };
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  const endpoint = ENDPOINTS[modelId];

  const results = await Promise.allSettled(
    variants.map(async (v) => {
      let payload;
      let creationData;

      if (isAvatar) {
        const audioUrl = await synthesizeSpeech({ script: v.script, voiceId, emotion, language });
        payload = { image_url: v.actor.imageUrl, images_list: [v.actor.imageUrl], audio_url: audioUrl, ...settings };
        creationData = {
          kind: "talking-avatar", actorId: v.actor.id, script: v.script, audioUrl,
          voiceId: voiceId || null, emotion: emotion || null, language: language || null,
          title: v.script.substring(0, 50), prompt: v.script,
          inputImages: JSON.stringify([v.actor.imageUrl]),
        };
      } else {
        payload = { prompt: v.prompt, images_list: images, image_url: images.length ? images[0] : undefined, ...settings };
        creationData = {
          kind: "raw-video", prompt: v.prompt, title: v.prompt.substring(0, 50),
          inputImages: images.length ? JSON.stringify(images) : null,
        };
      }

      const { requestId } = await submitJob(endpoint, payload);

      return prisma.creation.create({
        data: {
          userId, type: "video", requestId, status: "processing", modelId,
          aspectRatio: settings.aspect_ratio || null,
          resolution: settings.resolution || null,
          duration: typeof settings.duration === "number" ? settings.duration : null,
          mode: settings.mode || null, batchId, ...creationData,
        },
      });
    })
  );

  const creations = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
  const failures = results.filter((r) => r.status === "rejected");

  if (!creations.length) {
    return { status: 500, body: { error: failures[0]?.reason?.message || "All generations failed" } };
  }

  // Charge only for variants that actually submitted; allowance first, then top-ups.
  await UserService.spend(userId, perVariantCost * creations.length);

  return {
    status: 200,
    body: {
      success: true,
      batchId,
      creationId: creations[0].id,
      creations: creations.map((c) => ({ id: c.id, requestId: c.requestId })),
      failed: failures.length,
    },
  };
}
