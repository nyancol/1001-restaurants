#!/usr/bin/env bash
# Google quota check for project mapstr-514323 (Places API New + legacy Geocoding).
# Polls Cloud Monitoring (serviceruntime request counts, MTD, per method),
# maps methods to billing SKUs, and reports free-cap consumption vs the
# 70% watch / 90% urgent thresholds. Cost math follows hermes.yaml:quota.
# Host-side; needs gcloud + a service account key with monitoring.viewer
# (and billing.viewer for the budget cross-check) on the project.
#
#   GCP_SA_KEY_FILE=~/.secrets/gcp-billing-viewer.json ./skills/ops-observe/scripts/quota-check.sh
#
# Exit 0 = ok (watch lines may still be present), 1 = urgent (>=90% any cap),
# 2 = check errored (gcloud missing/auth failed/empty unreadable — NOT a quota
# verdict, fix access and re-run).
set -euo pipefail

PROJECT="${GCP_PROJECT:-mapstr-514323}"
KEY_FILE="${GCP_SA_KEY_FILE:-}"
WARN_PCT="${QUOTA_WARN_PCT:-70}"
URGENT_PCT="${QUOTA_URGENT_PCT:-90}"
# Monitored services to query. places.googleapis.com covers Autocomplete +
# Details + refresh. Legacy Geocoding reports under a maps backend service;
# candidates are tried in order and each outcome is printed, so coverage is
# visible instead of assumed.
SERVICES="${QUOTA_SERVICES:-places.googleapis.com maps-backend.googleapis.com geocoding-backend.googleapis.com}"

FAIL=0
CHECK_ERR=0
say() { printf '%s\n' "$*"; }
warn() { printf 'WATCH: %s\n' "$*"; }
urgent() { printf 'URGENT: %s\n' "$*"; FAIL=1; }
cerr() { printf 'ERROR: %s\n' "$*"; CHECK_ERR=1; }

command -v gcloud >/dev/null 2>&1 || { cerr "gcloud not found (needed for auth)"; say "---"; say "quota UNKNOWN (check errored)"; exit 2; }
command -v jq >/dev/null 2>&1 || { cerr "jq not found"; say "---"; say "quota UNKNOWN (check errored)"; exit 2; }
command -v curl >/dev/null 2>&1 || { cerr "curl not found"; say "---"; say "quota UNKNOWN (check errored)"; exit 2; }

# method -> total calls across all queried services
TOTALS_FILE="$(mktemp)"
RESP_FILE="$(mktemp)"
trap 'rm -f "$TOTALS_FILE" "$RESP_FILE" "$RESP_FILE.err"' EXIT
echo '{}' > "$TOTALS_FILE"

if [ -n "$KEY_FILE" ]; then
  [ -f "$KEY_FILE" ] || { cerr "key file not found: $KEY_FILE"; say "---"; say "quota UNKNOWN (check errored)"; exit 2; }
  if [ "$(stat -c '%a' "$KEY_FILE" 2>/dev/null || stat -f '%Lp' "$KEY_FILE")" != "600" ]; then
    cerr "key file $KEY_FILE is not mode 0600 — fix permissions, refusing to use it"
    say "---"; say "quota UNKNOWN (check errored)"; exit 2
  fi
  gcloud auth activate-service-account --key-file="$KEY_FILE" >/dev/null 2>&1 \
    || { cerr "service-account activation failed"; say "---"; say "quota UNKNOWN (check errored)"; exit 2; }
fi

# NOTE: gcloud has no time-series read command, so queries go to the
# Monitoring REST API with a token minted from the active account.
TOKEN="$(gcloud auth print-access-token 2>"$RESP_FILE.err")" \
  || { cerr "could not mint access token: $(head -c 300 "$RESP_FILE.err")"; say "---"; say "quota UNKNOWN (check errored)"; exit 2; }

START="$(date -u -d "$(date -u +%Y-%m-01)" +%Y-%m-%dT%H:%M:%SZ)"
END="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
say "window: $START .. $END (MTD, project $PROJECT)"

for SVC in $SERVICES; do
  FILTER="metric.type=\"serviceruntime.googleapis.com/api/request_count\" AND resource.type=\"consumed_api\" AND resource.labels.service=\"$SVC\""
  if ! curl -sS -m 30 -G "https://monitoring.googleapis.com/v3/projects/$PROJECT/timeSeries" \
    --data-urlencode "filter=$FILTER" \
    --data-urlencode "interval.startTime=$START" \
    --data-urlencode "interval.endTime=$END" \
    --data-urlencode "aggregation.alignmentPeriod=86400s" \
    --data-urlencode "aggregation.perSeriesAligner=ALIGN_SUM" \
    -H "Authorization: Bearer $TOKEN" > "$RESP_FILE" 2>"$RESP_FILE.err"; then
    cerr "time-series query failed for $SVC: $(head -c 300 "$RESP_FILE.err")"
    continue
  fi
  if jq -e '.error' "$RESP_FILE" >/dev/null 2>&1; then
    cerr "API error for $SVC: $(jq -c '.error' "$RESP_FILE" | head -c 300)"
    continue
  fi
  N="$(jq '(.timeSeries // []) | length' "$RESP_FILE" 2>/dev/null || echo -1)"
  if [ "$N" -eq -1 ]; then cerr "unparseable response for $SVC"; continue; fi
  if [ "$N" -eq 0 ]; then say "service $SVC: no series in window"; continue; fi
  say "service $SVC: $N series"
  jq -r '.timeSeries[] | [(.resource.labels.method // "unknown"), ([.points[].value.int64Value // "0" | tonumber] | add // 0)] | @tsv' "$RESP_FILE" |
  while IFS="$(printf '\t')" read -r method count; do
    cur="$(jq -r --arg m "$method" '.[$m] // 0' "$TOTALS_FILE")"
    jq --arg m "$method" --argjson c "$count" --argjson cur "$cur" '.[$m] = ($cur + $c)' "$TOTALS_FILE" > "$TOTALS_FILE.tmp" \
      && mv "$TOTALS_FILE.tmp" "$TOTALS_FILE"
  done
done

if [ "$CHECK_ERR" -ne 0 ]; then say "---"; say "quota UNKNOWN (check errored, not a verdict)"; exit 2; fi
if [ "$(jq 'length' "$TOTALS_FILE")" -eq 0 ]; then
  say "no billable calls recorded MTD (or services above cover nothing — verify service names in Cloud Console Metrics)"
  say "---"; say "quota GREEN (zero usage)"; exit 0
fi

# Method -> SKU bucket. Enterprise cap is shared by details + refresh.
# SearchText is tracked but unattributed: no code path in this repo calls
# Text Search (UI search uses the autocomplete proxy) — another key consumer.
AUTOCOMPLETE=0; ENTERPRISE=0; GEOCODE=0; SEARCHTEXT=0; UNMAPPED=""
while IFS="$(printf "\t")" read -r method count; do
  case "$method" in
    *[Aa]utocomplete*) AUTOCOMPLETE=$((AUTOCOMPLETE + count)) ;;
    *[Gg]et[Pp]lace*|*[Pp]lace[Dd]etails*|*[Gg]et[Pp]hoto*) ENTERPRISE=$((ENTERPRISE + count)) ;;
    *[Gg]eocode*|*[Gg]eocoding*) GEOCODE=$((GEOCODE + count)) ;;
    *[Ss]earch[Tt]ext*|*[Tt]ext[Ss]earch*) SEARCHTEXT=$((SEARCHTEXT + count)) ;;
    *) UNMAPPED="$UNMAPPED $method=$count" ;;
  esac
  say "method $method: $count"
done < <(jq -r 'to_entries[] | "\(.key)\t\(.value)"' "$TOTALS_FILE")

check_cap() { # name count cap
  local pct=0; [ "$3" -gt 0 ] && pct=$(( $2 * 100 / $3 ))
  if [ "$pct" -ge "$URGENT_PCT" ]; then urgent "$1 $2/$3 (${pct}% of free cap)";
  elif [ "$pct" -ge "$WARN_PCT" ]; then warn "$1 $2/$3 (${pct}% of free cap)";
  else say "GREEN: $1 $2/$3 (${pct}% of free cap)"; fi
}

check_cap "autocomplete/10k" "$AUTOCOMPLETE" 10000
check_cap "details+refresh Enterprise/1k" "$ENTERPRISE" 1000
check_cap "geocode/10k" "$GEOCODE" 10000
# SearchText tier is unconfirmed (Pro 5k vs Enterprise 1k) — report both.
check_cap "textsearch/5k (Pro assumed)" "$SEARCHTEXT" 5000
if [ "$SEARCHTEXT" -gt 0 ]; then
  pct=$(( SEARCHTEXT * 100 / 1000 ))
  say "info: same SearchText count vs Enterprise/1k would be ${pct}% — confirm tier in Billing Reports"
  say "info: SearchText is unattributed (no Text Search path in this repo; UI search uses the autocomplete proxy)"
fi
[ -n "$UNMAPPED" ] && warn "unmapped methods (verify SKU, not counted):$UNMAPPED"

say "---"
if [ "$FAIL" -eq 0 ]; then say "quota GREEN (no cap at urgent)"; else say "quota RED (urgent threshold crossed)"; fi
exit "$FAIL"
