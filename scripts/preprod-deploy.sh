#!/usr/bin/env bash
# Deploy a branch to the single preprod preview slot (B1).
# Reuses compose.preprod.yaml; refuses to evict another branch's preview
# without --evict. Never touches prod (project places-preprod, own volume).
#
# Usage:
#   scripts/preprod-deploy.sh --branch <name> [--fresh-db] [--evict]
set -euo pipefail

BRANCH=""
FRESH_DB=0
EVICT=0
while [ $# -gt 0 ]; do
  case "$1" in
    --branch) BRANCH="${2:?--branch needs a value}"; shift 2 ;;
    --fresh-db) FRESH_DB=1; shift ;;
    --evict) EVICT=1; shift ;;
    *) echo "Unknown arg: $1" >&2; echo "Usage: $0 --branch <name> [--fresh-db] [--evict]" >&2; exit 2 ;;
  esac
done
[ -n "$BRANCH" ] || { echo "Missing --branch" >&2; exit 2; }

cd "$(dirname "$0")/.."
SUDO="${DOCKER_SUDO:-sudo}"
COMPOSE="$SUDO docker compose --env-file .env.preprod -p places-preprod -f compose.yaml -f compose.preprod.yaml"
SLOT_FILE=".preprod-slot"

CURRENT="$(git rev-parse --abbrev-ref HEAD)"
if [ "$CURRENT" != "$BRANCH" ]; then
  echo "Refusing: current checkout is '$CURRENT', requested '$BRANCH'." >&2
  echo "Check out the branch first (this wrapper never switches branches for you)." >&2
  exit 1
fi
HEAD_SHA="$(git rev-parse HEAD)"

if [ -f "$SLOT_FILE" ]; then
  # shellcheck disable=SC1090
  . "$SLOT_FILE" # sets SLOT_BRANCH, SLOT_SINCE, SLOT_SHA
  if [ "${SLOT_BRANCH:-}" != "$BRANCH" ] && [ "$EVICT" -ne 1 ]; then
    echo "Slot busy: owned by branch '${SLOT_BRANCH:-unknown}' since ${SLOT_SINCE:-unknown} (last validation: ${SLOT_VALIDATED:-unknown})." >&2
    echo "Re-run with --evict to replace it, or wait for the owner." >&2
    exit 1
  fi
  if [ "${SLOT_BRANCH:-}" != "$BRANCH" ]; then
    echo "Evicting preview of '${SLOT_BRANCH:-unknown}' for '$BRANCH' (confirmed via --evict)."
  fi
fi

echo "Building + starting preprod for branch $BRANCH ($HEAD_SHA)..."
$COMPOSE up -d --build

HOST_PORT="${HOST_PORT:-$(grep -E '^HOST_PORT=' .env.preprod 2>/dev/null | cut -d= -f2)}"
HOST_PORT="${HOST_PORT:-5174}"
echo "Waiting for health on http://localhost:${HOST_PORT}/api/health ..."
for _ in $(seq 1 30); do
  if curl -fsS -m 5 "http://localhost:${HOST_PORT}/api/health" >/dev/null 2>&1; then
    break
  fi
  sleep 2
  if [ "$_ " = "30 " ]; then
    echo "Timed out waiting for preprod health." >&2
    $COMPOSE logs --tail 50 places >&2 || true
    exit 1
  fi
done

if [ "$FRESH_DB" -eq 1 ]; then
  echo "Reseeding demo DB inside the staging container..."
  # shellcheck disable=SC2086
  $COMPOSE exec -T -e PREPROD_RESEED=1 places node dist/scripts/seed-demo.js
fi

HEALTH="$(curl -fsS -m 10 "http://localhost:${HOST_PORT}/api/health")"
APP_ORIGIN="$(grep -E '^APP_ORIGIN=' .env.preprod 2>/dev/null | cut -d= -f2-)"
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
{
  echo "SLOT_BRANCH=$BRANCH"
  echo "SLOT_SHA=$HEAD_SHA"
  echo "SLOT_SINCE=${SLOT_SINCE:-$NOW}"
  echo "SLOT_VALIDATED=$NOW"
} > "$SLOT_FILE"

echo "--- preprod evidence ---"
echo "branch: $BRANCH"
echo "sha: $HEAD_SHA"
echo "health(direct): $HEALTH"
echo "url: ${APP_ORIGIN:-http://localhost:$HOST_PORT}"
echo "slot: recorded in $SLOT_FILE"
