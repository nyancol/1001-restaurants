#!/usr/bin/env bash
# Verify preprod green (see spec Requirement: Preprod green definition).
# Read-only: never rebuilds, reseeds, or evicts.
# Exit 0 = green, 1 = red, 2 = check errored (docker unreachable, indeterminate
# — NOT a red: do not alert as down, fix access and re-run).
set -euo pipefail
cd "$(dirname "$0")/../../.."
# shellcheck disable=SC1091
. ./skills/ops/scripts/lib-docker.sh # sets SUDO/COMPOSE, auto-detecting docker access
FAIL=0
CHECK_ERR=0
say() { printf '%s\n' "$*"; }
fail() { printf 'RED: %s\n' "$*"; FAIL=1; }
pass() { printf 'GREEN: %s\n' "$*"; }
cerr() { printf 'ERROR: %s\n' "$*"; CHECK_ERR=1; }

HOST_PORT="${HOST_PORT:-$(grep -E '^HOST_PORT=' .env.preprod 2>/dev/null | cut -d= -f2)}"
HOST_PORT="${HOST_PORT:-5174}"

# shellcheck disable=SC2086
if PS_OUT="$($COMPOSE ps --format json places 2>&1)"; then PS_RC=0; else PS_RC=$?; fi
DOWN=0
if [ "$PS_RC" -ne 0 ]; then
  cerr "docker check failed (exit $PS_RC): $PS_OUT"
  cerr "container state unknown — fix docker access (see DOCKER_SUDO) and re-run; not a red"
elif [ -z "$PS_OUT" ]; then
  fail "container places-staging is not running"
  DOWN=1
else
  pass "container running"
fi

if http_get /api/health 2>/dev/null && printf '%s' "$HTTP_BODY" | grep -q '"db":"ok"'; then pass "health db:ok ($HTTP_BODY)"; else fail "health not ok (code ${HTTP_CODE:-?}): ${HTTP_BODY:-unreachable}"; fi

if http_get /api/auth/login 2>/dev/null; then LOGIN_CODE="$HTTP_CODE"; else LOGIN_CODE="000"; fi
if [ "$LOGIN_CODE" = "302" ] || [ "$LOGIN_CODE" = "303" ] || [ "$LOGIN_CODE" = "307" ]; then
  pass "OIDC login redirects ($LOGIN_CODE)"
else
  fail "OIDC login reachable check got HTTP $LOGIN_CODE (want 3xx redirect; 503 = OIDC misconfigured)"
fi

# shellcheck disable=SC2086
if LOGS="$($COMPOSE logs --no-log-prefix --tail 200 places 2>&1)"; then LOGS_RC=0; else LOGS_RC=$?; fi
if [ "$LOGS_RC" -ne 0 ]; then
  cerr "docker logs check failed (exit $LOGS_RC): $LOGS"
elif printf '%s' "$LOGS" | grep -q "Invalid config"; then
  fail "boot logs contain 'Invalid config'"
else
  pass "boot logs clean of 'Invalid config'"
fi

if [ -f "$SLOT_FILE" ]; then
  # shellcheck disable=SC1090
  . "$SLOT_FILE"
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
  say "SKIP version check: no slot record (deploy with skills/ops/scripts/preprod-deploy.sh to record it)"
fi

if [ "${EXPECT_FIXTURE:-0}" = "1" ]; then
  # shellcheck disable=SC2086
  if COUNTS="$($COMPOSE exec -T places node -e "const D=require('better-sqlite3');const db=D('/data/app.db',{readonly:true});console.log(JSON.stringify({places:db.prepare('select count(*) c from places').get().c,users:db.prepare('select count(*) c from users').get().c}));db.close()" 2>&1)"; then EXEC_RC=0; else EXEC_RC=$?; fi
  if [ "$EXEC_RC" -ne 0 ]; then
    if [ "$DOWN" -eq 1 ]; then
      say "SKIP fixture count (container is down; query expectedly failed)"
    else
      cerr "fixture query failed (exit $EXEC_RC): $COUNTS"
    fi
  else
    PLACES_N="$(printf '%s' "$COUNTS" | grep -o '"places":[0-9]*' | grep -o '[0-9]*')"
    if [ "${PLACES_N:-}" = "6" ]; then pass "fixture places=6 ($COUNTS)"; else fail "fixture places!=6: ${COUNTS:-unreadable}"; fi
  fi
else
  say "SKIP fixture count (set EXPECT_FIXTURE=1 to require the 6-place demo seed)"
fi

say "---"
if [ "$CHECK_ERR" -ne 0 ]; then say "preprod UNKNOWN (check errored, not a red)"; exit 2; fi
if [ "$FAIL" -eq 0 ]; then say "preprod GREEN"; else say "preprod RED"; fi
exit "$FAIL"
