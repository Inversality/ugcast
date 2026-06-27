// Centralized MUAPI integration: model registry, job submission, and credit
// pricing. This is the single source of truth shared by the studio UI
// (src/app/page.js) and the API routes, so endpoint slugs and prices never
// drift between client and server.
//
// NOTE: exact MUAPI endpoint slugs and param names should be confirmed against
// https://muapi.ai/docs — they're all collected here so a change is one edit.

import { cogsForCredits, retailForCredits } from "./pricing";

const MUAPI_BASE = "https://api.muapi.ai/api/v1";

export const ENDPOINTS = {
  // Raw video models (text/image -> video)
  "grok-video": `${MUAPI_BASE}/grok-imagine-image-to-video`,
  "veo-3-1": `${MUAPI_BASE}/veo3.1-image-to-video`,
  "happy-horse": `${MUAPI_BASE}/happy-horse-1-image-to-video-720p`,
  "seedance-2": `${MUAPI_BASE}/seedance-2-image-to-video`,

  // Talking-avatar models (image + audio -> lip-synced talking head)
  "ai-avatar-v2-pro": `${MUAPI_BASE}/ai-avatar-v2-pro`,
  "kling-avatar-std": `${MUAPI_BASE}/kling-ai-avatar-standard`,
  "kling-avatar-pro": `${MUAPI_BASE}/kling-ai-avatar-pro`,

  // Supporting tools
  lipsync: `${MUAPI_BASE}/sync-lipsync`,
  tts: `${MUAPI_BASE}/tts`, // text-to-speech / audio-from-text
  music: `${MUAPI_BASE}/suno`,
  "image-flux": `${MUAPI_BASE}/flux.1-dev`,
  "image-sdxl": `${MUAPI_BASE}/sdxl`,

  // Shared
  upload: `${MUAPI_BASE}/upload_file`,
  result: (requestId) => `${MUAPI_BASE}/predictions/${requestId}/result`,
};

// Model registry consumed by the studio. `category` drives which pipeline a
// generation uses; `params` drives the dynamic parameter controls in the UI.
export const MODELS = [
  {
    id: "ai-avatar-v2-pro",
    name: "AI Avatar v2 Pro",
    category: "talking-avatar",
    type: "AVATAR",
    icon: "FiUser",
    description:
      "Realistic talking-head: feed an actor image + spoken script, get accurate lip-sync, head motion and expressions.",
    needsActor: true,
    params: {
      aspect_ratio: { options: ["9:16", "16:9", "1:1"], default: "9:16" },
      resolution: { options: ["480p", "720p"], default: "720p" },
    },
  },
  {
    id: "kling-avatar-pro",
    name: "Kling Avatar Pro",
    category: "talking-avatar",
    type: "AVATAR",
    icon: "FiUser",
    description:
      "Premium talking-avatar tier — high-quality lip-synced video from a character image + audio.",
    needsActor: true,
    params: {
      aspect_ratio: { options: ["9:16", "16:9", "1:1"], default: "9:16" },
    },
  },
  {
    id: "kling-avatar-std",
    name: "Kling Avatar Std",
    category: "talking-avatar",
    type: "AVATAR",
    icon: "FiUser",
    description:
      "Fast, affordable talking avatars from a single image + audio. Great for batch hook testing.",
    needsActor: true,
    params: {
      aspect_ratio: { options: ["9:16", "16:9", "1:1"], default: "9:16" },
    },
  },
  {
    id: "grok-video",
    name: "Grok Video",
    category: "video",
    type: "MODEL",
    icon: "FiVideo",
    description:
      "xAI's Grok video generation model with text-to-video and image-to-video modes.",
    params: {
      aspect_ratio: { options: ["9:16", "16:9", "2:3", "3:2", "1:1"], default: "2:3" },
      mode: { options: ["fun", "normal", "spicy"], default: "normal" },
      resolution: { options: ["480p", "720p"], default: "480p" },
      duration: { min: 6, max: 30, default: 6 },
    },
  },
  {
    id: "veo-3-1",
    name: "Veo 3.1",
    category: "video",
    type: "MODEL",
    icon: "FiVideo",
    description:
      "Google's high-fidelity video generation model with realistic movement.",
    params: {
      aspect_ratio: { options: ["16:9", "9:16"], default: "16:9" },
      duration: { options: [8], default: 8 },
      resolution: { options: ["720p", "1080p", "4k"], default: "720p" },
    },
  },
  {
    id: "happy-horse",
    name: "Happy Horse 1",
    category: "video",
    type: "MODEL",
    icon: "FiZap",
    description: "Fast and expressive animation model for lifelike motion.",
    params: {
      aspect_ratio: { options: ["16:9", "9:16", "1:1", "4:3", "3:4"], default: "16:9" },
      duration: { min: 3, max: 15, default: 5 },
    },
  },
  {
    id: "seedance-2",
    name: "Seedance 2",
    category: "video",
    type: "MODEL",
    icon: "FiVideo",
    description: "Advanced video animation with character reference support.",
    params: {
      aspect_ratio: { options: ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"], default: "16:9" },
      duration: { min: 4, max: 15, default: 5 },
    },
  },
];

export function getModel(modelId) {
  return MODELS.find((m) => m.id === modelId) || null;
}

// Default settings for a model (mirrors the UI's default selection so server
// and client agree on price even before the user touches a control).
export function defaultSettings(modelId) {
  const model = getModel(modelId);
  if (!model?.params) return {};
  const out = {};
  for (const key of Object.keys(model.params)) {
    out[key] = model.params[key].default;
  }
  return out;
}

// Voices offered for TTS. Ids are placeholders to be matched to MUAPI's voice
// catalog during implementation.
export const VOICES = [
  { id: "olivia", name: "Olivia", description: "Warm female, conversational" },
  { id: "liam", name: "Liam", description: "Confident male, energetic" },
  { id: "ava", name: "Ava", description: "Friendly female, upbeat" },
  { id: "noah", name: "Noah", description: "Calm male, trustworthy" },
];

export const EMOTIONS = ["neutral", "excited", "friendly", "serious", "empathetic", "urgent"];

// Languages offered for one-click localization in the studio.
export const LANGUAGES = [
  "Spanish", "French", "German", "Italian", "Portuguese", "Dutch", "Polish",
  "Russian", "Turkish", "Arabic", "Hindi", "Japanese", "Korean",
  "Chinese (Simplified)", "Indonesian", "Vietnamese", "Thai", "Swedish",
  "Norwegian", "Danish", "Finnish", "Greek", "Czech", "Romanian", "Hungarian",
  "Ukrainian", "Hebrew", "Filipino", "Malay", "Tagalog",
];

// One-click ad/platform presets. Applying a template sets the compatible
// generation settings (aspect ratio, duration, resolution) and suggests a tone.
export const TEMPLATES = [
  { id: "tiktok", name: "TikTok", aspect_ratio: "9:16", duration: 15, resolution: "720p", tone: "fast, punchy, Gen-Z", description: "Vertical, hook-first 15s ad." },
  { id: "reels", name: "Instagram Reels", aspect_ratio: "9:16", duration: 20, resolution: "1080p", tone: "polished, aspirational", description: "Vertical 20s lifestyle ad." },
  { id: "shorts", name: "YouTube Shorts", aspect_ratio: "9:16", duration: 25, resolution: "1080p", tone: "informative, energetic", description: "Vertical 25s explainer ad." },
  { id: "feed", name: "Square Feed", aspect_ratio: "1:1", duration: 15, resolution: "720p", tone: "clean, direct", description: "Square 1:1 feed ad." },
  { id: "youtube", name: "YouTube In-Stream", aspect_ratio: "16:9", duration: 15, resolution: "1080p", tone: "broadcast, confident", description: "Widescreen 16:9 pre-roll ad." },
];

// Merge a template's settings into a model's settings, keeping only the keys the
// model actually supports (and clamping duration / snapping options).
export function applyTemplate(modelId, template, current = {}) {
  const model = getModel(modelId);
  if (!model?.params) return current;
  const next = { ...current };

  for (const key of ["aspect_ratio", "resolution", "duration"]) {
    const param = model.params[key];
    const value = template[key];
    if (!param || value == null) continue;

    if (param.options) {
      if (param.options.includes(value)) next[key] = value;
    } else if (param.min != null && param.max != null) {
      next[key] = Math.max(param.min, Math.min(param.max, value));
    }
  }
  return next;
}

// ── Credit pricing ─────────────────────────────────────────────────────────
// One place for all pricing math. `creditCost` returns the cost of the *video*
// step; talking-avatar generations add TTS on top via `ttsCost`.
//
// IMPORTANT — these credit costs ARE the real provider cost, expressed at the
// anchor rate of 1 credit = $0.001 COGS (see src/lib/pricing.js). i.e. a credit
// cost of N means the generation costs us ≈ $N/1000 from MUAPI. We sell those
// same credits at 5× (~$0.005), so each generation nets ~80% margin no matter
// which model is used. Keep these proportional to real MUAPI rates so the
// margin guarantee holds. Numbers match MUAPI's published video pricing:
//   Veo 8s/720p   4000cr ≈ $4.00   (~$0.50/s)
//   Seedance 5s    250cr ≈ $0.25   (~$0.05/s)
//   Grok 6s/480p    30cr ≈ $0.03   (~$0.005/s)
//   Kling avatar   132cr ≈ $0.13   (~$0.029/s)

const TTS_COST = 15;        // per voiceover synthesis   ≈ $0.015
const AVATAR_COST = 220;    // per talking-avatar render ≈ $0.22
const IMAGE_GEN_COST = 30;  // per AI actor face         ≈ $0.03
const MUSIC_COST = 40;      // per Suno track            ≈ $0.04
const TEXT_GEN_COST = 15;   // per GPT-5 script/hook/translate call ≈ $0.013 COGS

export function ttsCost() {
  return TTS_COST;
}

// Cost of one OpenAI (GPT-5) text generation — script, hooks, or translation.
// Charged so the OpenAI spend is always covered by credit revenue.
export function textGenCost() {
  return TEXT_GEN_COST;
}

export function imageGenCost() {
  return IMAGE_GEN_COST;
}

export function musicCost() {
  return MUSIC_COST;
}

// Cost of the primary generation for a model + settings.
export function creditCost(modelId, settings = {}) {
  const duration = typeof settings.duration === "number" ? settings.duration : 5;
  const resolution = settings.resolution || "";

  if (modelId === "grok-video") {
    const d = typeof settings.duration === "number" ? settings.duration : 6;
    const rate = resolution === "720p" ? 10 : 5;
    return d * rate;
  }
  if (modelId === "veo-3-1") {
    const d = typeof settings.duration === "number" ? settings.duration : 8;
    let rate = 500;
    if (resolution === "1080p") rate = 650;
    else if (resolution === "4k") rate = 740;
    return d * rate;
  }
  if (modelId === "happy-horse") return duration * 36;
  if (modelId === "seedance-2") return duration * 50;

  // Talking avatars are flat-rate; the spoken voiceover is billed separately.
  if (modelId === "ai-avatar-v2-pro") return AVATAR_COST;
  if (modelId === "kling-avatar-pro") return AVATAR_COST;
  if (modelId === "kling-avatar-std") return Math.round(AVATAR_COST * 0.6);

  return 10;
}

// Total cost for one generation including voiceover when it's a talking avatar.
export function totalGenerationCost(modelId, settings = {}) {
  const base = creditCost(modelId, settings);
  const model = getModel(modelId);
  if (model?.category === "talking-avatar") {
    return base + ttsCost();
  }
  return base;
}

// Full economics of a single generation: credits charged to the user, our real
// provider cost (COGS), the retail value we collect, and the resulting margin.
// Useful for dashboards/admin and for verifying the margin guarantee per model.
export function generationEconomics(modelId, settings = {}) {
  const credits = totalGenerationCost(modelId, settings);
  const cogsUsd = cogsForCredits(credits);
  const retailUsd = retailForCredits(credits);
  return {
    credits,
    cogsUsd,
    retailUsd,
    grossProfitUsd: retailUsd - cogsUsd,
    marginPct: retailUsd > 0 ? (retailUsd - cogsUsd) / retailUsd : 0,
  };
}

// ── Job submission ──────────────────────────────────────────────────────────

function apiKey() {
  const key = process.env.UGC_API_KEY;
  if (!key) throw new Error("UGC_API_KEY not configured");
  return key;
}

export function webhookUrl() {
  const base = process.env.WEBHOOK_URL || process.env.NEXTAUTH_URL || "";
  return base ? `${base}/api/webhook/muapi` : undefined;
}

// Submit a job to a MUAPI endpoint. Returns the upstream request id.
export async function submitJob(endpoint, payload) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey(),
    },
    body: JSON.stringify({ webhook_url: webhookUrl(), ...payload }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MUAPI request failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return { requestId: data.request_id || data.id, raw: data };
}

// Build an image-generation prompt for a UGC actor face from persona traits.
export function actorPrompt({ description, gender, ageRange, setting }) {
  const traits = [
    ageRange ? `${ageRange}` : null,
    gender ? `${gender}` : null,
    "person",
    setting ? `in a ${setting} setting` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return [
    `Photorealistic portrait of a ${traits}.`,
    description ? description : "",
    "Natural lighting, candid UGC selfie style, looking at camera, shot on phone,",
    "authentic, high detail, vertical framing.",
  ]
    .filter(Boolean)
    .join(" ");
}

// Synthesize spoken audio from a script and return the hosted audio URL.
export async function synthesizeSpeech({ script, voiceId, emotion, language }) {
  const { outputs } = await submitAndWait(ENDPOINTS.tts, {
    text: script,
    voice: voiceId || VOICES[0].id,
    emotion: emotion || "neutral",
    language: language || "English",
  });
  if (!outputs?.length) throw new Error("TTS returned no audio");
  return outputs[0];
}

// Generate a background music track (Suno) from a text prompt and return the
// hosted audio URL.
export async function generateMusic({ prompt, duration }) {
  const { outputs } = await submitAndWait(ENDPOINTS.music, {
    prompt: prompt || "upbeat, modern, energetic background music for a short social ad, no vocals",
    duration: duration || 20,
  });
  if (!outputs?.length) throw new Error("Music generation returned no audio");
  return outputs[0];
}

// Generate an AI actor face and return its hosted image URL.
export async function generateActorImage(opts) {
  const prompt = actorPrompt(opts);
  const { outputs } = await submitAndWait(ENDPOINTS["image-flux"], {
    prompt,
    aspect_ratio: "3:4",
    num_images: 1,
  });
  if (!outputs?.length) throw new Error("Image generation returned no output");
  return outputs[0];
}

// Submit a synchronous-ish job and poll for its result (used for short steps
// like TTS / image generation where we want the URL inline rather than via the
// shared video webhook). Polls the result endpoint until completion.
export async function submitAndWait(endpoint, payload, { timeoutMs = 120000, intervalMs = 2500 } = {}) {
  const { requestId, raw } = await submitJob(endpoint, payload);

  // Some endpoints return outputs immediately.
  if (raw?.outputs?.length) return { requestId, outputs: raw.outputs };

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const res = await fetch(ENDPOINTS.result(requestId), {
      headers: { "x-api-key": apiKey() },
    });
    if (!res.ok) continue;
    const data = await res.json();
    if (data.status === "failed") {
      throw new Error(data.error || "MUAPI job failed");
    }
    if (data.status === "completed" || data.outputs?.length) {
      return { requestId, outputs: data.outputs || [] };
    }
  }
  throw new Error("MUAPI job timed out");
}
