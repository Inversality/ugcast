// Public API key generation and verification. Keys are random tokens prefixed
// `oau_`; only their SHA-256 hash is persisted (the raw value is returned once
// at creation). Incoming requests authenticate with `x-api-key: oau_...`.
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const PREFIX = "oau_";

export function hashKey(rawKey) {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

// Generate a new raw key plus the fields to persist.
export function generateApiKey() {
  const raw = PREFIX + crypto.randomBytes(24).toString("hex");
  return {
    raw,
    hash: hashKey(raw),
    prefix: raw.slice(0, 12), // e.g. oau_1a2b3c4d
  };
}

// Resolve an incoming raw key to its owning user id, or null. Updates lastUsedAt.
export async function resolveApiKey(rawKey) {
  if (!rawKey || !rawKey.startsWith(PREFIX)) return null;

  const record = await prisma.apiKey.findUnique({ where: { hash: hashKey(rawKey) } });
  if (!record || record.revoked) return null;

  // Best-effort usage timestamp; don't block the request on it.
  prisma.apiKey
    .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return record.userId;
}
