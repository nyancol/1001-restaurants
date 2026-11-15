# Places Ops Skill

Operate the production `places` app ("In my Belly", 1001-restaurants). Five
capabilities:

1. **Weekly RED report** — analyse rate/errors/duration telemetry from the
   homelab LGTM stack, post the verdict to the ops Discord channel.
2. **Ad-hoc Google refresh sweep** — on explicit instruction, refresh the
   Google snapshot of every existing place via the M2M service API.
3. **Preprod preview deploy** — deploy a branch to the single staging slot
   for requestor validation (refuses to evict without confirmation).
4. **Hermes prod watch** — scheduled health + version polling, one Discord
   alert per red transition plus a recovery notice.
5. **Git-revert rollback** — on explicit operator order only, revert the
   offending commit on `main` and push so Arcane redeploys.

Never mutate app data outside the documented refresh endpoint (caps 1-2),
the staging volume (cap 3), or a git revert on `main` (cap 5).
Secrets: the agent MAY read `.env.preprod` and the Arcane-managed prod `.env`
for presence/shape validation (set?, valid URL?, length >= 32?). It MUST
never print, commit, forward, or include secret values in Discord messages,
logs, prompts, or reports — presence/shape only (e.g. `SESSION_SECRET set,
length ok`).

## Shared context

* Telemetry: prod `places` exports OTLP/HTTP to `http://lgtm:4318`
  (`grafana/otel-lgtm` on the Docker network `telemetry`). Grafana Explore
  reaches Mimir (metrics), Tempo (traces), Loki (logs). Preprod/dev export
  nothing.
* Every signal carries `service.name="places"`,
  `deployment.environment="production"`, `service.version=<sha>`. Always
  filter on the first two; add the third when comparing deploys.
* Metric histogram is `http_server_request_duration_seconds_{count,sum,bucket}`.
  Kept labels (low-cardinality allowlist in `buildMetricViews()`):
  `http_request_method`, `http_response_status_code`, `url_scheme`,
  `server.address` (+ legacy aliases). There is NO `http_route` label — the
  HTTP server span never sets it and Fastify emits no separate span — so
  per-route splits come from Tempo (`span.url.path`), while per-status and
  per-method splits work in Mimir. Never expect user/place labels in metrics.
  (Deployed prod predates this fix and still exports a single labelless
  series; relabelled series appear after the next redeploy.)
* `GET /api/health` spans are dropped by the `HealthFilterProcessor`.
  (Deployed prod predates the semconv fix and still exports them — exclude
  `span.url.path = "/api/health"` until the redeploy, and expect 30s-interval
  health noise in older windows.)
* Log level is the Loki **label** `level` with pino numeric values as
  strings (`30`=info). Log bodies are plain `msg` text, not JSON — do not
  use `| json`. Correlate via the `trace_id` / `span_id` attributes.
* Span names are bare methods (`GET`) — group by `span.url.path`, never by
  span name. TraceQL resource/span scope prefixes are required:
  `resource.service.name`, `span.url.path`,
  `span.http.response.status_code` (bare `service.name=` / `url.path=` do
  not parse).
* `service_version` is the `package.json` version unless `OTEL_SERVICE_VERSION`
  is set explicitly (`unknown` counts as unset). Bump with `npm version` on
  release so deploy correlation keeps working.
* Tier ports (canonical map lives in `hermes.yaml`): dev API `3232` + vite
  HMR host `5173`; preprod container `5173` / host `5174` (Caddy
  `:8092 -> places-staging:5173`); prod container `5173` (Caddy
  `:8093 -> places:5173`), no host publication. The Arcane-managed prod
  `.env` MUST NOT set `HOST_PORT` (base `compose.yaml` only `expose:`s it;
  the variable is dead weight that invites a harmful publish).
* Telemetry is fail-open and batched: a LGTM outage appears as a gap in
  signals with steady `200`s — never as app `5xx`.

---

## Capability 1: Weekly RED report

Cadence: once a week. Trigger: the operator's scheduler invokes the agent;
when invoked, run the full analysis and post to Discord — do not ask for
confirmation, the report is informational.

Window: last 7 days, compared with the previous 7 days as baseline.

### 1.1 Rate

```promql
# Requests/min, prod total (Mimir has no per-route labels — see above)
sum(rate(http_server_request_duration_seconds_count{
  service_name="places",
  deployment_environment="production"
}[5m])) * 60
```

Per-route rate comes from Tempo TraceQL instead:

```
{ resource.service.name = "places" && span.url.path != "/api/health" }
# group by span.url.path in Grafana's TraceQL view
```

Note traffic shape changes vs baseline (new routes, spikes, drop to zero —
a drop on all routes means exporter/collector break, not zero users).

### 1.2 Errors

Mimir splits by status and method (no per-route label). Use Loki for
log-level errors and Tempo for per-route status:

```promql
# 4xx and 5xx per status (post-redeploy series; pre-fix prod has one
# labelless series, so totals-only applies to older windows)
sum by (http_response_status_code) (
  rate(http_server_request_duration_seconds_count{
    service_name="places",
    deployment_environment="production",
    http_response_status_code=~"[45].."
  }[5m])
)
```

```
# Loki: error/fatal logs only (level is a label, pino numerics as strings)
{ service_name="places", level=~"50|60" }
# warn and above:
{ service_name="places", level=~"40|50|60" }

# Tempo TraceQL: errors on a route, health excluded (filter on the span
# status code — 4xx spans keep status unset, so status=error misses them)
{ resource.service.name = "places" && span.url.path != "/api/health" && span.http.response.status_code >= 400 }
```

Classify with the app's status map:

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

### 1.3 Duration

```promql
# p95 overall; add `, http_response_status_code` to the by() for per-status
# (per-route is Tempo-only — there is no http_route label)
histogram_quantile(0.95,
  sum by (le) (
    rate(http_server_request_duration_seconds_bucket{
      service_name="places",
      deployment_environment="production"
    }[5m])
  )
)
```

For per-route latency use Tempo TraceQL grouped by `span.url.path`
(same filter as 1.1, duration view). Repeat with `0.50` for median: p50+p95 moving together = broad shift; p95
only = tail (slow dependency or few heavy rows). If `GET /api/google/details`
and `POST /api/places/:id/refresh` slow down together, suspect
`places.googleapis.com`, not the app. Homelab volume is low — check counts
before calling a regression.

### 1.4 Post the report to Discord

The agent has access to the ops Discord channel. Compose one message:

```
📊 Places weekly RED report — <week of YYYY-MM-DD> (version <sha>)

**Rate**: <normal | notable traffic on <routes>>
**Errors**: <none | 4xx summary | 5xx summary with route + code>
**Duration**: <normal | p95 <X>s on <route> (baseline <Y>s)>

**Verdict**: healthy | degraded (cause) | needs investigation (<what>)
**Actions**: none | <watch item | trace_id to drill | config to fix>
```

Send it via the configured Discord webhook (`DISCORD_WEBHOOK_URL`, curl
`POST` with `{"content": "..."}`) or the agent's Discord channel access,
whichever the environment provides. Never include secrets or raw PII in the
message; route IDs and status codes are fine. If posting fails, report the
failure back to the operator instead of silently dropping it.

---

## Capability 2: Ad-hoc Google refresh sweep

Trigger: explicit operator instruction ("refresh all places", "run the
sweep"). Never run on a schedule unless asked. One HTTP call per place; the
agent owns the loop, the app owns the Google calls. There is no sweep
endpoint and no job polling.

### 2.1 Required env vars

| Var | Secret? | Meaning | Example |
|---|---|---|---|
| `POCKET_ID_URL` | no | Pocket ID base URL (no trailing slash) | `https://id.example.com` |
| `PLACES_OPS_CLIENT_ID` | no | OIDC client ID of the ops client | `b7f3...` |
| `PLACES_OPS_CLIENT_SECRET` | **yes** | OIDC client secret. `0600` file or vault. Never log, never commit | — |
| `PLACES_API_RESOURCE` | no | Exact Places API resource from Pocket ID (Administration → APIs). Must equal the app's value character-for-character | `https://places.1001-restaurants.homelab` |
| `PLACES_APP_BASE_URL` | no | App base URL (no trailing slash) | `https://places-app.example.com` |

Fail fast if any var is unset. Never prompt for the secret, never print it.
The Pocket ID client must be **confidential** with **Client access (M2M)**
granted for `read:places` + `refresh:places` on the Places API.

### 2.2 Mint an access token (client-credentials grant)

```bash
RESP=$(curl -sS --request POST "$POCKET_ID_URL/api/oidc/token" \
  --form "grant_type=client_credentials" \
  --form "client_id=$PLACES_OPS_CLIENT_ID" \
  --form "client_secret=$PLACES_OPS_CLIENT_SECRET" \
  --form "resource=$PLACES_API_RESOURCE" \
  --form "scope=read:places refresh:places")
TOKEN=$(printf '%s' "$RESP" | jq -r '.access_token')
```

* `resource=` must exactly equal `PLACES_API_RESOURCE` — it becomes the
  token's `aud`, enforced by the app. A trailing-slash mismatch 401s
  everything.
* Cache `$TOKEN` until `exp − 60s`. On any `401` from the app, discard it,
  mint once more, retry the failed call once — then abort instead of
  looping.

### 2.3 Enumerate all places (M2M is the only cross-user reader)

```bash
curl -sS "$PLACES_APP_BASE_URL/api/places?owner=all" \
  -H "Authorization: Bearer $TOKEN"
# → { "places": [ { "id": "...", "ownerId": "...",
#                   "googlePlaceId": "ChIJ..." | null, ... } ] }
```

Keep rows with a non-null `googlePlaceId`. Rows with `null` are manual
entries with nothing to refresh — skip them (the API would answer `422`).

### 2.4 Refresh each place (sequential or max ~2–3 concurrent)

```bash
curl -sS -X POST "$PLACES_APP_BASE_URL/api/places/<id>/refresh" \
  -H "Authorization: Bearer $TOKEN"
# → 200 + updated place (snapshot rewritten, updatedAt bumped,
#     user fields untouched)
```

Each call costs one Google lookup server-side — stay gentle, never fan out
wide.

### 2.5 Per-row outcome handling

| Response | Meaning | Action |
|---|---|---|
| `200` | Snapshot rewritten | Record fresh `googleRating` / `businessStatus`, continue |
| `422` | Manual entry, no `googlePlaceId` | Skip — not an error (filter these out in step 2.3) |
| `404` | Row deleted mid-sweep | Skip, continue |
| `429` | Google rate limit | Back off (`Retry-After` if present, else 30–60s), retry that id once |
| `502` / `503` | Google/key problem | Retry once later; if persistent, abort sweep and report |
| `401` | Token expired/invalid | Mint fresh token, retry once |
| `403` | Missing scope | Setup bug (Pocket ID grants) — stop and report, do not retry |

Summarize at the end: `refreshed=N skipped_manual=N failed=N (ids)`. If the
sweep ran because of a RED finding, mention the correlation in the summary.

### 2.6 Smoke test (first run or after config change)

1. Token call returns a JWT whose `aud` is the resource and whose `scope`
   contains both permissions.
2. `GET /api/places?owner=all` with the token → `200` with all users' places.
3. `POST` refresh on one known-`googlePlaceId` row → `200`, snapshot changes.
4. Same refresh with a `read:places`-only token → `403` (scope enforcement
   works).

### 2.7 What NOT to do

- Never use these credentials in a browser or send the ID token to the API —
  only the access token, as `Authorization: Bearer`.
- Never call `POST /api/places`, `PATCH`, or `DELETE` with this token — M2M
  is rejected there (`403`) by design. The refresh endpoint is the only
  writer.
- Never touch `/api/google/*` with this token — it stays cookie-only.

---

## Capability 3: Preprod preview deploy (single slot, B1)

Deploy a branch to the one staging slot for requestor validation.
Project `places-preprod`, container `places-staging`, volume
`places-preprod-data`. Own slot file `.preprod-slot` (gitignored) records
`SLOT_BRANCH` / `SLOT_SHA` / `SLOT_SINCE` / `SLOT_VALIDATED`.

### 3.1 Deploy

```bash
mise run preprod-deploy --branch <name> --fresh-db [--evict]
# --fresh-db reseeds the 2-user / 6-place demo fixture (scripts/seed-demo.ts
# runs INSIDE the staging container, PREPROD_RESEED=1, on its own volume).
# Without --evict, a slot owned by another branch is refused, not replaced.
```

Rules:

- The wrapper never switches branches: current checkout must equal
  `--branch` or it refuses (avoids destructive checkout surprises).
- Refusal message states owner branch, owner-since, and last validation so
  the requestor knows who to ask. Take no destructive action on refuse.
- `--evict` is the only path that replaces another branch's preview; say
  so explicitly in the evidence post.
- Never copy anything from prod `places-data` into preprod (privacy).

### 3.2 Preprod green (all must hold)

- Container `places-staging` UP longer than 30s.
- Staging `GET /api/health` → 200 with `db: ok` **at the
  `hermes.yaml`-declared URL**, not just localhost in the container.
- Running build matches the slot commit (`build-from-checkout` assumption is
  recorded, not hidden).
- `GET /api/auth/login` redirects (3xx). `503` = OIDC misconfigured.
- Fixture count matches when `--fresh-db` was used (6 demo places).
- Boot logs contain no `Invalid config` lines.

Read-only check any time (also used by Hermes drills):

```bash
mise run preprod-verify                 # all green signals
EXPECT_FIXTURE=1 mise run preprod-verify # additionally require 6-place seed
```

### 3.3 Evidence post (Discord)

```
[PREVIEW] branch <name> @ <short-sha> — GREEN | RED (<cause>)
staging: <APP_ORIGIN>  direct: http://localhost:5174
health: <health body>  login: <3xx|503>  seed: <fixture counts>
slot: <owner-since>  evicted: <previous-branch|none>
```

RED names the failing signal plus the relevant log excerpt.

---

## Capability 4: Hermes prod watch (scheduled)

Poll prod on the cadence and threshold in `hermes.yaml` (defaults: every
5m, alert after 3 consecutive failures, 10m version-stuck grace after a
merge). One alert per red transition; one recovery notice on green return;
no repeats while the state is unchanged. Drills use the same templates
with a `[DRILL]` prefix (same channel, per `hermes.yaml`).

### 4.1 Prod green (all must hold)

- `GET <prod-health-url>` → 200 with `db: ok`.
- Running version equals `main` HEAD past the merge grace window
  (`version-stuck` with expected-vs-running versions otherwise).
- Boot logs show OIDC discovery ok; `/api/auth/login` does not 503.
- No sustained 5xx on places CRUD (RED lens from capability 1).
- OTEL signals for the running version are visible in LGTM. A signal gap
  with steady 200s = exporter break, not zero users.
- Container `PORT` equals the Caddy `reverse_proxy places:<PORT>` target
  and health passed at the declared URL (catches env-to-Caddy drift).

### 4.2 Discord templates (evidence-backed, never secrets)

```
[PROD RED] <cause: down|version-stuck|oidc-config|5xx|exporter-break>
health: <body or unreachable>
running: <version>  expected(main): <sha>  since: <UTC time>
logs: <tail excerpt, secrets redacted>
next: watching; rollback only on your order (capability 5)
```

```
[PROD GREEN] recovered at <UTC time> (was <cause>, red for <duration>)
running: <version>  health: <body>
```

### 4.3 What NOT to do

- Never build, restart, or `exec` into prod; never touch prod `/data`.
  The agent verifies and prepares — Arcane owns deploys.
- Never alert twice for the same unchanged red state; edit the original
  thread only when the cause changes.
- Never include secret values: presence/shape only
  (e.g. `SESSION_SECRET set, length ok`).

---

## Capability 5: Git-revert rollback (explicit order only)

Rollback is `git revert` of the offending commit on `main` + push so Arcane
redeploys. No direct prod rebuild, no image pinning — one deploy mechanism.

### 5.1 Gate

- Run ONLY on explicit operator order (`revert <sha>`, `roll back prod`).
  Without an order: alert (capability 4 template) and prepare the exact
  commands, do not execute them.

### 5.2 Migration-safety pre-check (must pass before revert)

```bash
git show --stat <sha>                # what did it touch?
git show <sha> -- src/db/index.ts    # migration SQL, if any
```

- PASS: `src/db/index.ts` untouched, or the diff adds only `CREATE TABLE`,
  `ALTER TABLE ... ADD COLUMN`, `CREATE INDEX`, or `INSERT` statements.
- BLOCK: any `DROP`, `RENAME`, table rebuild (`places_new` pattern),
  backfill that rewrites existing rows, or any change outside additive SQL.
  On BLOCK: refuse the automatic revert and propose manual recovery instead
  (restore `/data` volume from backup, then revert, then redeploy).

### 5.3 Execute + verify

```bash
git revert --no-edit <sha> && git push origin main
# then: prod green per capability 4.1 (version advances to the revert commit)
```

Post the revert commit, the push result, and the post-revert green report.
If green does not return within the Arcane poll window + build time, escalate
with fresh evidence — do not stack further reverts blindly.

### 5.4 Dry run (no push)

For rehearsal or approval: run 5.2, print the exact `git revert` command
that WOULD run, and stop. Used by Drill 4.
