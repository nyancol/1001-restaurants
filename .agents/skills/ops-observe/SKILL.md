---
name: ops-observe
description: Observe prod "places" via the homelab LGTM stack (RED signals) and guard Google API quota spend. Use when checking prod health, dashboards, alerts, or billing/quota. Read-only — never mutates app data.
---

# Places Observe Skill

How to observe prod `places` via the homelab LGTM stack. Read-only: never
mutates app data.

Sources of truth: `hermes.yaml` (watch cadences/thresholds), LGTM stack
config in the homelab.

Secrets and exit codes follow the family conventions in the `ops` router
skill — load `.agents/skills/ops/SKILL.md` if not already loaded.

## What lives where

* Telemetry: prod `places` exports OTLP/HTTP to `http://lgtm:4318`
  (`grafana/otel-lgtm` on the Docker network `telemetry`). Grafana Explore
  reaches Mimir (metrics), Tempo (traces), Loki (logs). Preprod/dev export
  nothing.
* Every signal carries `service.name="places"`,
  `deployment.environment="production"`, `service.version=<sha>`. Always
  filter on the first two; add the third when comparing deploys.
* `service_version` is the `package.json` version unless `OTEL_SERVICE_VERSION`
  is set explicitly (`unknown` counts as unset). Bump with `npm version` on
  release so deploy correlation keeps working.
* Telemetry is fail-open and batched: a LGTM outage appears as a gap in
  signals with steady `200`s — never as app `5xx`. A drop on all routes
  means exporter/collector break, not zero users.

## Metrics (Mimir)

Histogram: `http_server_request_duration_seconds_{count,sum,bucket}`.
Kept labels (low-cardinality allowlist in `buildMetricViews()`):
`http_request_method`, `http_response_status_code`, `url_scheme`,
`server.address` (+ legacy aliases). There is NO `http_route` label — the
HTTP server span never sets it and Fastify emits no separate span — so
per-route splits come from Tempo (`span.url.path`), while per-status and
per-method splits work in Mimir. Never expect user/place labels in metrics.
(Deployed prod predates this fix and still exports a single labelless
series; relabelled series appear after the next redeploy.)

Rate (requests/min, prod total):

```promql
sum(rate(http_server_request_duration_seconds_count{
  service_name="places",
  deployment_environment="production"
}[5m])) * 60
```

Errors per status (post-redeploy series; pre-fix prod has one labelless
series, so totals-only applies to older windows):

```promql
sum by (http_response_status_code) (
  rate(http_server_request_duration_seconds_count{
    service_name="places",
    deployment_environment="production",
    http_response_status_code=~"[45].."
  }[5m])
)
```

Duration (p95 overall; add `, http_response_status_code` to the by() for
per-status; per-route is Tempo-only):

```promql
histogram_quantile(0.95,
  sum by (le) (
    rate(http_server_request_duration_seconds_bucket{
      service_name="places",
      deployment_environment="production"
    }[5m])
  )
)
```

## Traces (Tempo)

* Span names are bare methods (`GET`) — group by `span.url.path`, never by
  span name. TraceQL resource/span scope prefixes are required:
  `resource.service.name`, `span.url.path`,
  `span.http.response.status_code` (bare `service.name=` / `url.path=` do
  not parse).
* `GET /api/health` spans are dropped by the `HealthFilterProcessor`.
  (Deployed prod predates the semconv fix and still exports them — exclude
  `span.url.path = "/api/health"` until the redeploy, and expect 30s-interval
  health noise in older windows.)

Per-route rate (group by `span.url.path` in Grafana's TraceQL view):

```
{ resource.service.name = "places" && span.url.path != "/api/health" }
```

Errors on a route, health excluded (filter on the span status code — 4xx
spans keep status unset, so `status=error` misses them):

```
{ resource.service.name = "places" && span.url.path != "/api/health" && span.http.response.status_code >= 400 }
```

Per-route latency: same rate filter, duration view grouped by
`span.url.path`. Repeat with `0.50` for median: p50+p95 moving together =
broad shift; p95 only = tail (slow dependency or few heavy rows). If
`GET /api/google/details` and `POST /api/places/:id/refresh` slow down
together, suspect `places.googleapis.com`, not the app. Homelab volume is
low — check counts before calling a regression.

Quota counting (one client span per billable call — see below):

```
{ resource.service.name = "places" && span.name = "google.autocomplete" }
{ resource.service.name = "places" && span.name = "google.details" }
{ resource.service.name = "places" && span.name = "google.geocode" }
{ resource.service.name = "places" && span.name = "google.place-refresh" }
```

## Logs (Loki)

Log level is the Loki **label** `level` with pino numeric values as
strings (`30`=info). Log bodies are plain `msg` text, not JSON — do not
use `| json`. Correlate via the `trace_id` / `span_id` attributes.

Error/fatal logs only:

```
{ service_name="places", level=~"50|60" }
```

Warn and above:

```
{ service_name="places", level=~"40|60" }
```

## Interpreting signals

App status map:

| Status | Where | Meaning | Verdict |
|---|---|---|---|
| `401` | any `/api/*` except allowlist | no/expired session or bad Bearer | Widespread = session/proxy/IdP issue |
| `403` | `/api/places*` | scope/ownership reject | Caller/setup bug, not retryable |
| `404` | `/api/places/:id`, SPA fallback | deleted row / unknown id | Data churn, not incident |
| `422` | `POST /api/places/:id/refresh` | manual entry, no `googlePlaceId` | Expected — exclude from error math |
| `429` | `/api/google/*`, refresh | Google rate limit relayed | Note caller pressure |
| `502` | `/api/google/*`, refresh | `google_unavailable` (fetch threw) | Upstream/network |
| `503` | `/api/google/*`, `/api/auth/login` | `google_not_configured` / OIDC unset | Config/deploy bug |
| `500` | any | unhandled exception | Always a bug — pull a `trace_id` from Loki |

Rules: `422` is never an error. `4xx` without matching `5xx`/latency shift
is callers/data. Sustained `5xx` on places CRUD is app-side until proven
upstream.

## Google quota spend guard (app-side counting)

Project `mapstr-514323`. Places API (New) bills per-SKU monthly free caps
(no $200 cushion). Field-mask billing = highest-SKU-wins per request.

| Inbound | Client span | SKU (confirmed) | Free cap/mo | Over |
|---|---|---|---|---|
| `GET /api/google/autocomplete` (no session) | `google.autocomplete` | Autocomplete Requests (Ess) | 10,000 | $2.83/1k |
| `GET /api/google/details` | `google.details` | **Place Details Enterprise** — mask carries `rating`, `userRatingCount`, opening hours, `priceLevel`/`priceRange`, `websiteUri`, phone numbers | 1,000 | $20/1k |
| `GET /api/google/geocode` | `google.geocode` | Geocoding (Ess, legacy endpoint) | 10,000 | $5.00/1k |
| *(no app endpoint — another key consumer)* | *(Monitoring only: `SearchText`)* | Text Search, tier unconfirmed (Pro 5k/$32 vs Ent 1k/$35 — check Billing Reports) | 5,000 or 1,000 | $32 or $35/1k |
| `POST /api/places/:id/refresh` (cookie or M2M sweep) | `google.place-refresh` | **Place Details Enterprise** — `REFRESH_DETAILS_MASK` carries the same Enterprise triggers (no Ent+Atmosphere fields: no `reviews`, no `serves*`) | 1,000 shared with details | $20/1k |

One inbound request = one billable upstream call, EXCEPT short-circuits
that never reach Google (`400` missing param, `503 google_not_configured`,
`403` scope/owner reject, `422 missing_google_id` on refresh). Count the
client spans above — exactly one per billable call.

Thresholds: **70% watch / 90% urgent of each SKU's free cap**, MTD
(`details` + `refresh` share the 1,000 Enterprise cap). One full sweep =
~778 calls (78% of the Enterprise cap).

Programmatic check:

```bash
GCP_SA_KEY_FILE=~/.secrets/gcp-billing-viewer.json mise x gcloud@593.0.0 -- .agents/skills/ops-observe/scripts/quota-check.sh
# exit 0 ok (WATCH lines possible) / 1 urgent (>=90% any cap) / 2 check-errored
```

`quota-check.sh` also tracks `SearchText` (Text Search): no code path in
this repo calls it (UI search uses the autocomplete proxy), so any count
there is another key consumer — verify its tier in Billing Reports and
consider per-consumer keys. TraceQL counting above is the fallback when the
grant is absent. Billing → Reports grouped by SKU stays authoritative for
tier confirmation.

Traps: never pass `sessionToken` through to `details` — terminating a
session with a Pro/Enterprise Details call re-bills it at
Enterprise+Atmosphere ($25/1k). `details` takes no session token today;
keep it that way.
