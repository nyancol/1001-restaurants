#!/usr/bin/env bash
# Patching inspection: what does the monthly train have to work with?
# Lists open Dependabot PRs (npm + docker, per .github/dependabot.yml) and
# the latest SAST (sast.yml) run on main. Read-only: merges, rebuilds, and
# deploys nothing; the monthly pass itself (audit + review + rebuild +
# tests/typecheck/SAST + preprod drill, prod via main) stays a human-driven
# drill per the ops-resilience design.
# Host-side (needs gh + jq). Exit 0 = checked ok, 1 = attention needed
# (SAST failed on main, or dependabot.yml missing from the checkout),
# 2 = check errored (indeterminate — NOT a verdict, fix access and re-run).
set -euo pipefail
cd "$(dirname "$0")/../../../.." # repo root (gh resolves the repo from cwd)
FAIL=0
CHECK_ERR=0
say() { printf '%s\n' "$*"; }
fail() { printf 'RED: %s\n' "$*"; FAIL=1; }
pass() { printf 'GREEN: %s\n' "$*"; }
info() { printf 'INFO: %s\n' "$*"; }
cerr() { printf 'ERROR: %s\n' "$*"; CHECK_ERR=1; }

command -v gh >/dev/null 2>&1 || cerr "gh not found"
command -v jq >/dev/null 2>&1 || cerr "jq not found"
if [ "$CHECK_ERR" -ne 0 ]; then say "---"; say "patch UNKNOWN (check errored, not a verdict)"; exit 2; fi

# 1. Dependabot config present in this checkout? Without it no PRs arrive,
#    and "zero open PRs" would read as calm instead of blind.
if [ -f ".github/dependabot.yml" ]; then
  pass "dependabot.yml present"
else
  fail "dependabot.yml missing from checkout (Dependabot sends nothing — restore it)"
fi

# 2. Open Dependabot PRs — routine monthly input, informational (not a red).
if ! PRS="$(gh pr list --author "app/dependabot" --state open --json number,title,headRefName,createdAt,url --limit 20 2>&1)"; then
  cerr "gh pr list failed: $PRS"
else
  COUNT="$(printf '%s' "$PRS" | jq 'length')"
  if [ "$COUNT" -eq 0 ]; then
    info "no open Dependabot PRs"
  else
    info "$COUNT open Dependabot PR(s):"
    printf '%s' "$PRS" | jq -r '.[] | "  - #\(.number) \(.title) [\(.headRefName)] opened \(.createdAt) \(.url)"'
  fi
fi

# 3. Latest SAST run on main — failure here blocks the monthly train.
if ! RUNS="$(gh run list --workflow sast.yml --branch main --limit 1 --json name,headSha,status,conclusion,createdAt,url 2>&1)"; then
  cerr "gh run list failed: $RUNS"
else
  N="$(printf '%s' "$RUNS" | jq 'length')"
  if [ "$N" -eq 0 ]; then
    cerr "no SAST runs found on main"
  else
    STATUS="$(printf '%s' "$RUNS" | jq -r '.[0].status')"
    CONCLUSION="$(printf '%s' "$RUNS" | jq -r '.[0].conclusion')"
    SHA="$(printf '%s' "$RUNS" | jq -r '.[0].headSha[0:7]')"
    CREATED="$(printf '%s' "$RUNS" | jq -r '.[0].createdAt')"
    URL="$(printf '%s' "$RUNS" | jq -r '.[0].url')"
    if [ "$STATUS" = "completed" ] && [ "$CONCLUSION" = "success" ]; then
      pass "SAST success on main @ $SHA ($CREATED)"
    elif [ "$STATUS" = "completed" ]; then
      fail "SAST $CONCLUSION on main @ $SHA ($CREATED) — $URL"
    else
      info "SAST $STATUS on main @ $SHA (conclusion: $CONCLUSION, $CREATED)"
    fi
  fi
fi

say "---"
if [ "$CHECK_ERR" -ne 0 ]; then say "patch UNKNOWN (check errored, not a verdict)"; exit 2; fi
if [ "$FAIL" -eq 0 ]; then say "patch CHECKED OK"; else say "patch ATTENTION"; fi
exit "$FAIL"
