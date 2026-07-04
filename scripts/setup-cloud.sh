#!/usr/bin/env bash
set -euo pipefail

# JoltCheck cloud setup — Turso + Vercel
# Requires: turso CLI (https://docs.turso.tech), optional vercel CLI for env sync
#
# Usage:
#   export VERCEL_TOKEN=...          # from https://vercel.com/account/tokens
#   export VERCEL_URL=https://new-sand-six-69.vercel.app
#   ./scripts/setup-cloud.sh
#
# Or after `turso auth login`:
#   ./scripts/setup-cloud.sh

DB_NAME="${TURSO_DB_NAME:-joltcheck}"
VERCEL_URL="${VERCEL_URL:-https://new-sand-six-69.vercel.app}"
VERCEL_PROJECT="${VERCEL_PROJECT:-new}"

echo "==> JoltCheck cloud setup"
echo "    Database: $DB_NAME"
echo "    App URL:  $VERCEL_URL"
echo

if ! command -v turso >/dev/null 2>&1; then
  echo "Installing Turso CLI..."
  curl -sSfL https://get.tur.so/install.sh | bash
  export PATH="$HOME/.turso:$PATH"
fi

if ! turso auth whoami >/dev/null 2>&1; then
  echo "Not logged in to Turso."
  echo "Run: turso auth login --headless"
  echo "Or sign up: https://api.turso.tech/signup?redirect=false"
  exit 1
fi

echo "==> Turso account: $(turso auth whoami)"

if ! turso db show "$DB_NAME" >/dev/null 2>&1; then
  echo "==> Creating database '$DB_NAME'..."
  turso db create "$DB_NAME"
else
  echo "==> Database '$DB_NAME' already exists"
fi

DATABASE_URL=$(turso db show "$DB_NAME" --url)
TURSO_AUTH_TOKEN=$(turso db tokens create "$DB_NAME")
NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-$(openssl rand -base64 32)}"
SETUP_SECRET="${SETUP_SECRET:-$(openssl rand -base64 24)}"

echo
echo "==> Generated credentials (save these):"
echo "DATABASE_URL=$DATABASE_URL"
echo "TURSO_AUTH_TOKEN=$TURSO_AUTH_TOKEN"
echo "NEXTAUTH_SECRET=$NEXTAUTH_SECRET"
echo "NEXTAUTH_URL=$VERCEL_URL"
echo "SETUP_SECRET=$SETUP_SECRET"
echo

if command -v vercel >/dev/null 2>&1 && [[ -n "${VERCEL_TOKEN:-}" ]]; then
  echo "==> Setting Vercel environment variables..."
  cd "$(dirname "$0")/.."
  for env in production preview development; do
    printf '%s' "$DATABASE_URL" | vercel env add DATABASE_URL "$env" --force --token "$VERCEL_TOKEN" --yes 2>/dev/null || true
    printf '%s' "$TURSO_AUTH_TOKEN" | vercel env add TURSO_AUTH_TOKEN "$env" --force --token "$VERCEL_TOKEN" --yes 2>/dev/null || true
    printf '%s' "$NEXTAUTH_SECRET" | vercel env add NEXTAUTH_SECRET "$env" --force --token "$VERCEL_TOKEN" --yes 2>/dev/null || true
    printf '%s' "$VERCEL_URL" | vercel env add NEXTAUTH_URL "$env" --force --token "$VERCEL_TOKEN" --yes 2>/dev/null || true
    printf '%s' "$SETUP_SECRET" | vercel env add SETUP_SECRET "$env" --force --token "$VERCEL_TOKEN" --yes 2>/dev/null || true
  done
  echo "==> Redeploying..."
  vercel deploy --prod --token "$VERCEL_TOKEN" --yes
else
  echo "==> Add these in Vercel → Project → Settings → Environment Variables:"
  echo "    https://vercel.com/dashboard (project: $VERCEL_PROJECT)"
  echo "    Then redeploy from the Deployments tab."
fi

echo
echo "==> Pushing schema to Turso..."
cd "$(dirname "$0")/.."
export DATABASE_URL
export TURSO_AUTH_TOKEN
npm run db:push

echo "==> Seeding Turso database..."
npm run db:seed

echo
echo "==> Seeding production app (if deployed with env vars)..."
HTTP_CODE=$(curl -sS -o /tmp/setup-response.json -w "%{http_code}" \
  -X POST "$VERCEL_URL/api/setup" \
  -H "x-setup-secret: $SETUP_SECRET" || echo "000")

if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "409" ]]; then
  echo "    Setup API: OK ($HTTP_CODE)"
else
  echo "    Setup API returned $HTTP_CODE (may need redeploy first)"
  cat /tmp/setup-response.json 2>/dev/null || true
fi

HEALTH=$(curl -sS "$VERCEL_URL/api/health" || echo '{"ok":false}')
echo
echo "==> Health check: $HEALTH"
echo
echo "Done! Sign in at $VERCEL_URL/login"
echo "  Admin:    admin@joltcheck.com / admin123"
echo "  Employee: alex@store.com / employee123"
