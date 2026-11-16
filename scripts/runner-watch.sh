#!/usr/bin/env bash
# Runner health watch: is the self-hosted github-runner alive, and does every
# `preview`-labeled open PR have a recent preprod-preview run?
# Host-side (needs docker + gh). Exit 0 = green, 1 = red, 2 = check errored
# (indeterminate — NOT a red, fix access and re-run).
set -euo pipefail
FAIL=0
CHECK_ERR=0
say() { printf '%s\n' "$*"; }
fail() { printf 'RED: %s\n' "$*"; FAIL=1; }
pass() { printf 'GREEN: %s\n' "$*"; }
cerr() { printf 'ERROR: %s\n' "$*"; CHECK_ERR=1; }

if ! command -v docker >/dev/null 2>&1; then cerr "docker not found"; fi
if ! command -v gh >/dev/null 2>&1; then cerr "gh not found"; fi
if [ "$CHECK_ERR" -ne 0 ]; then say "---"; say "runner UNKNOWN (check errored, not a red)"; exit 2; fi

# 1. Runner container alive?
if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "github-runner"; then
  pass "github-runner container running"
else
  fail "github-runner container not running (docker ps)"
fi

# 2. Preview queue: every open `preview` PR needs a run in the last 15 min
#    (or a completed run on its current head SHA).
if ! PRS="$(gh pr list --label preview --state open --json number,headRefName,headRefOid 2>&1)"; then
  cerr "gh pr list failed: $PRS"
else
  COUNT="$(printf '%s' "$PRS" | jq 'length')"
  if [ "$COUNT" -eq 0 ]; then
    say "SKIP queue check (no open preview PRs)"
  else
    NOW="$(date +%s)"
    # Process substitution (not a pipeline) so fail()/pass() inside the
    # loop update FAIL in this shell.
    while read -r pr; do
      NUM="$(printf '%s' "$pr" | jq -r '.number')"
      HEAD="$(printf '%s' "$pr" | jq -r '.headRefName')"
      OID="$(printf '%s' "$pr" | jq -r '.headRefOid')"
      if ! RUN="$(gh run list --branch "$HEAD" --workflow preprod-preview.yml --limit 5 --json headSha,status,conclusion,createdAt 2>&1)"; then
        cerr "gh run list failed for PR #$NUM: $RUN"
        continue
      fi
      MATCH="$(printf '%s' "$RUN" | jq --arg oid "$OID" '[.[] | select(.headSha == $oid)] | first // empty')"
      if [ -z "$MATCH" ]; then
        fail "PR #$NUM ($HEAD) has no preprod-preview run on current head ${OID:0:7}"
        continue
      fi
      CREATED="$(printf '%s' "$MATCH" | jq -r '.createdAt')"
      AGE=$((NOW - $(date -d "$CREATED" +%s)))
      STATUS="$(printf '%s' "$MATCH" | jq -r '.status')"
      if [ "$STATUS" = "completed" ]; then
        pass "PR #$NUM run completed on ${OID:0:7} (age ${AGE}s)"
      elif [ "$AGE" -gt 900 ]; then
        fail "PR #$NUM run on ${OID:0:7} still $STATUS after ${AGE}s (>15m, runner may be stuck)"
      else
        pass "PR #$NUM run $STATUS on ${OID:0:7} (age ${AGE}s)"
      fi
    done < <(printf '%s' "$PRS" | jq -c '.[]')
  fi
fi

say "---"
if [ "$CHECK_ERR" -ne 0 ]; then say "runner UNKNOWN (check errored, not a red)"; exit 2; fi
if [ "$FAIL" -eq 0 ]; then say "runner GREEN"; else say "runner RED"; fi
exit "$FAIL"
