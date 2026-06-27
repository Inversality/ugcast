#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
#  deploy.sh — Run once after setting real environment variables.
#  Works locally (against a remote DB) or inside a CI/CD pipeline.
#
#  Usage:
#    1. Fill in .env.production (or export vars from your host panel)
#    2. Run:  bash scripts/deploy.sh
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

echo "▶ Loading environment..."
# Load .env.production if it exists and vars aren't already set
if [ -f ".env.production" ] && [ -z "${DATABASE_URL:-}" ]; then
  export $(grep -v '^#' .env.production | grep -v '^$' | xargs)
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set. Fill in .env.production first." >&2
  exit 1
fi

echo "▶ Generating Prisma client..."
npx prisma generate

echo "▶ Running database migrations..."
# Uses DIRECT_URL (set in prisma.config.ts) for the direct connection
npx prisma migrate deploy

echo "▶ Seeding stock actors (safe to re-run — skips existing)..."
node --env-file=.env.production scripts/seed-actors.mjs 2>/dev/null || \
  node -e "require('dotenv').config({path:'.env.production'})" scripts/seed-actors.mjs 2>/dev/null || \
  echo "  (seed skipped — run manually if needed: npm run seed:actors)"

echo ""
echo "✅ Database ready. Next steps:"
echo "   1. Push this repo to GitHub"
echo "   2. Connect repo to Railway at https://railway.app"
echo "   3. Add all env vars from .env.production into Railway's Variables panel"
echo "   4. Railway will build + deploy automatically via the Dockerfile"
echo "   5. After deploy, add Stripe webhook: https://YOUR_DOMAIN/api/webhook/stripe"
echo "   6. MUAPI callback is auto-set via WEBHOOK_URL — no extra step needed"
