#!/usr/bin/env bash
# Query the homelab LGTM stack over HTTP — no `docker exec`, no container attach.
#
# Stack: ~/Documents/selfhosted-deployments/lgtm (grafana/otel-lgtm),
#   Grafana  http://localhost:3001  (host port 3001 -> container 3000)
#   OTLP     http://localhost:4318  (app endpoint, not a query path)
# Backends (Mimir/Prometheus :9090, Loki :3100, Tempo :3200) are loopback-only
# inside the lgtm container — reach them through the Grafana datasource proxy.
#
# Auth: Grafana service account `places-ops` (Viewer role). The Bearer
#   token MUST be provided in $GRAFANA_TOKEN, which is assumed already set
#   in the environment. Never use the admin password for queries.
#
#   GRAFANA_TOKEN="$GRAFANA_TOKEN" .agents/skills/ops-observe/scripts/lgtm-query.sh health
#   .agents/skills/ops-observe/scripts/lgtm-query.sh prom --query 'sum(rate(http_server_request_duration_seconds_count{service_name="places"}[5m]))' --since 1h
#   .agents/skills/ops-observe/scripts/lgtm-query.sh loki --query '{service_name="places", level=~"50|60"}' --since 1h --limit 20
#   .agents/skills/ops-observe/scripts/lgtm-query.sh tempo --query '{ resource.service.name = "places" }' --limit 5
#
# Exit 0 = query ok (empty results are still ok), 2 = check errored
# (unreachable Grafana, missing/unreadable token, 401/403 — fix access, NOT a red).
set -euo pipefail

GRAFANA_URL="${GRAFANA_URL:-http://localhost:3001}"

say() { printf '%s\n' "$*"; }
cerr() { printf 'ERROR: %s\n' "$*" >&2; }

need() { command -v "$1" >/dev/null 2>&1 || { cerr "$1 not found"; exit 2; }; }
need curl; need jq

# Normalize --since shorthands (1m/1h/1d, also bare GNU strings like
# "1 hour" or "7 days") to something GNU date -d understands.
since_to_start() { # $1 = --since value -> prints RFC3339 UTC
  local raw="$1" norm
  case "$raw" in
    *ago) norm="$raw" ;;
    *[0-9]s) norm="${raw%s} second ago" ;;
    *[0-9]m) norm="${raw%m} minute ago" ;;
    *[0-9]h) norm="${raw%h} hour ago" ;;
    *[0-9]d) norm="${raw%d} day ago" ;;
    *[0-9]w) norm="${raw%w} week ago" ;;
    *) norm="$raw" ;;
  esac
  date -u -d "$norm" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null \
    || { cerr "cannot parse --since '$raw' (try 30m, 6h, 1d, 7d)"; exit 2; }
}

since_to_epoch_ns() { # $1 = --since value -> prints nanosecond epoch
  local start_rfc3339
  start_rfc3339="$(since_to_start "$1")"
  date -u -d "$start_rfc3339" +%s000000000
}

read_token() {
  TOKEN="${GRAFANA_TOKEN:-}"
  [ -n "$TOKEN" ] || { cerr "GRAFANA_TOKEN is unset or empty (it is expected to already be set in the environment — never print or log it)"; exit 2; }
}

gget() { # path... — authenticated GET, prints body, returns curl status
  curl -sS -m 30 -H "Authorization: Bearer $TOKEN" -H 'Accept: application/json' "$@"
}

CMD="${1:-}"; shift 2>/dev/null || true

case "$CMD" in
  health)
    say "grafana: $GRAFANA_URL"
    curl -sS -m 10 "$GRAFANA_URL/api/health" | jq . 2>/dev/null \
      || { cerr "grafana unreachable at $GRAFANA_URL (is the lgtm compose up? run: docker compose -f ~/Documents/selfhosted-deployments/lgtm/compose.yaml up -d)"; exit 2; }
    read_token
    if gget "$GRAFANA_URL/api/org" | jq -e '.id' >/dev/null 2>&1; then
      say "auth: ok (service-account token accepted)"
    else
      cerr "auth failed (401/403 — token revoked or wrong role; rotate the places-ops Viewer token)"; exit 2
    fi
    ;;
  prom)
    QUERY=""; SINCE="1h"; STEP="60s"; END="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    LIMIT_N="" # unused, kept for CLI symmetry
    while [ $# -gt 0 ]; do case "$1" in
      --query) QUERY="$2"; shift 2 ;;
      --since) SINCE="$2"; shift 2 ;;
      --step) STEP="$2"; shift 2 ;;
      *) cerr "unknown flag $1 (see header usage)"; exit 2 ;;
    esac; done
    [ -n "$QUERY" ] || { cerr "--query is required"; exit 2; }
    read_token
    START="$(since_to_start "$SINCE")"
    gget -G "$GRAFANA_URL/api/datasources/proxy/uid/prometheus/api/v1/query_range" \
      --data-urlencode "query=$QUERY" \
      --data-urlencode "start=$START" --data-urlencode "end=$END" \
      --data-urlencode "step=$STEP" \
      || { cerr "prometheus range query failed"; exit 2; }
    ;;
  loki)
    QUERY=""; SINCE="1h"; LIMIT="50"
    while [ $# -gt 0 ]; do case "$1" in
      --query) QUERY="$2"; shift 2 ;;
      --since) SINCE="$2"; shift 2 ;;
      --limit) LIMIT="$2"; shift 2 ;;
      *) cerr "unknown flag $1 (see header usage)"; exit 2 ;;
    esac; done
    [ -n "$QUERY" ] || { cerr "--query is required"; exit 2; }
    read_token
    START="$(since_to_start "$SINCE")"
    END="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    # Nanosecond epoch range is what Loki prefers.
    START_NS="$(since_to_epoch_ns "$SINCE")"
    END_NS="$(date +%s000000000)"
    gget -G "$GRAFANA_URL/api/datasources/proxy/uid/loki/loki/api/v1/query_range" \
      --data-urlencode "query=$QUERY" \
      --data-urlencode "start=${START_NS}" --data-urlencode "end=${END_NS}" \
      --data-urlencode "limit=$LIMIT" \
      || { cerr "loki query failed (also tried window $START .. $END)"; exit 2; }
    ;;
  tempo)
    QUERY=""; LIMIT="10"
    while [ $# -gt 0 ]; do case "$1" in
      --query) QUERY="$2"; shift 2 ;;
      --limit) LIMIT="$2"; shift 2 ;;
      *) cerr "unknown flag $1 (see header usage)"; exit 2 ;;
    esac; done
    [ -n "$QUERY" ] || { cerr "--query is required (TraceQL, e.g. { resource.service.name = \"places\" })"; exit 2; }
    read_token
    gget -G "$GRAFANA_URL/api/datasources/proxy/uid/tempo/api/search" \
      --data-urlencode "q=$QUERY" --data-urlencode "limit=$LIMIT" \
      || { cerr "tempo search failed"; exit 2; }
    ;;
  *)
    cerr "usage: $0 {health|prom|loki|tempo} [--query ...] [--since 1h] [--step 60s] [--limit N]"
    exit 2
    ;;
esac
