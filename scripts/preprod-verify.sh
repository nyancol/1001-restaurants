#!/usr/bin/env bash
# Verify preprod green (see spec Requirement: Preprod green definition).
# Read-only: never rebuilds, reseeds, or evicts. Exit 0 = green, 1 = red.
set -euo pipefail
cd "$(dirname "$0")/.."
SUDO="${DOCKER_SUDO-sudo}" # empty DOCKER_SUDO runs docker directly (no sudo)
COMPOSE="$SUDO docker compose --env-file .env.preprod -p places-preprod -f compose.yaml -f compose.preprod.yaml"
FAIL=0
say() { printf '%s\n' "$*"; }
fail() { printf 'RED: %s\n' "$*"; FAIL=1; }
pass() { printf 'GREEN: %s\n' "$*"; }

HOST_PORT="${HOST_PORT:-$(grep -E '^HOST_PORT=' .env.preprod 2>/dev/null | cut -d= -f2)}"
HOST_PORT="${HOST_PORT:-5174}"

STARTED="$($COMPOSE ps --format json places 2>/dev/null | head -n 1 || true)"
if [ -z "$STARTED" ]; then fail "container places-staging is not running"; else pass "container running"; fi

HEALTH="$(curl -fsS -m 10 "http://localhost:${HOST_PORT}/api/health" 2>/dev/null || true)"
if printf '%s' "$HEALTH" | grep -q '"db":"ok"'; then pass "health db:ok ($HEALTH)"; else fail "health not ok: ${HEALTH:-unreachable}"; fi

LOGIN_CODE="$(curl -s -o /dev/null -w '%{http_code}' -m 10 "http://localhost:${HOST_PORT}/api/auth/login" || true)"
if [ "$LOGIN_CODE" = "302" ] || [ "$LOGIN_CODE" = "303" ] || [ "$LOGIN_CODE" = "307" ]; then
  pass "OIDC login redirects ($LOGIN_CODE)"
else
  fail "OIDC login reachable check got HTTP $LOGIN_CODE (want 3xx redirect; 503 = OIDC misconfigured)"
fi

if $COMPOSE logs --no-log-prefix --tail 200 places 2>/dev/null | grep -q "Invalid config"; then
  fail "boot logs contain 'Invalid config'"
else
  pass "boot logs clean of 'Invalid config'"
fi

if [ -f .preprod-slot ]; then
  # shellcheck disable=SC1090
  . ./.preprod-slot
  BRANCH="${SLOT_BRANCH:-unknown}"
  if [ "$BRANCH" != "unknown" ] && [ "$(git rev-parse --abbrev-ref HEAD)" = "$BRANCH" ]; then
    if [ "${SLOT_SHA:-}" = "$(git rev-parse HEAD)" ]; then
      pass "running build matches slot $BRANCH @ ${SLOT_SHA:-} (build-from-checkout)"
    else
      fail "checkout moved since deploy (slot ${SLOT_SHA:-} vs HEAD $(git rev-parse HEAD)); redeploy to refresh"
    fi
  else
    say "SKIP version check: slot branch ($BRANCH) != current checkout (redeploy records it)"
  fi
else
  say "SKIP version check: no .preprod-slot (deploy with scripts/preprod-deploy.sh to record it)"
fi

if [ "${EXPECT_FIXTURE:-0}" = "1" ]; then
  COUNTS="$($COMPOSE exec -T places node -e "const D=require('better-sqlite3');const db=D('/data/app.db',{readonly:true});console.log(JSON.stringify({places:db.prepare('select count(*) c from places').get().c,users:db.prepare('select count(*) c from users').get().c}));db.close()" 2>/dev/null || true)"
  PLACES_N="$(printf '%s' "$COUNTS" | grep -o '"places":[0-9]*' | grep -o '[0-9]*')"
  if [ "${PLACES_N:-}" = "6" ]; then pass "fixture places=6 ($COUNTS)"; else fail "fixture places!=6: ${COUNTS:-unreadable}"; fi
else
  say "SKIP fixture count (set EXPECT_FIXTURE=1 to require the 6-place demo seed)"
fi

say "---"; if [ "$FAIL" -eq 0 ]; then say "preprod GREEN"; else say "preprod RED"; fi
exit "$FAIL"
