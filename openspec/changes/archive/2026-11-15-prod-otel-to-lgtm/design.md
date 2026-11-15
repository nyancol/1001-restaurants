# Design

## Context

See proposal.md Why. Current state (verified in repo + on `lol-nas`):
- `src/app.ts`: `Fastify({ logger: true })` — pino JSON to stdout, no trace correlation, no redaction config.
- `src/config.ts` / `src/index.ts`: no OTEL vars; boot order is `loadConfig()` then `buildApp()` then `listen()`.
- `compose.yaml`: `places` on `default` + external `caddy_public`; commented `OTEL_EXPORTER_OTLP_ENDPOINT` placeholder referencing a non-existent `obs/compose.yaml`.
- Homelab: `lgtm` = `grafana/otel-lgtm:0.32.1` on bridge network `telemetry` (members today: `lgtm` 172.29.0.3, `brick-tracker`); `4318` published to host and verified reachable as `http://lgtm:4318/v1/traces` (HTTP 200) from inside `telemetry`; `4317` listens but is unpublished. `places` prod is NOT on `telemetry` yet. Arcane pulls `main` and rebuilds with its own `.env` overlay.

## Goals / Non-Goals

**Goals:**
- Prod-only OTEL traces/metrics/logs to `http://lgtm:4318` with `trace_id` log correlation and secret redaction.
- Zero behavior change when endpoint unset (preprod/dev untouched); telemetry failure never breaks requests.

**Non-Goals:**
- No sampling, no tail-based decisions, no browser/RUM telemetry.
- No custom product-event pipeline, no alerting rules, no Grafana dashboards as code.
- No change to domain routes, auth semantics, SQLite schema, or Caddy ingress.

## Decisions

1. **OTLP/HTTP `:4318` with protobuf, single endpoint for all signals.**
   Rationale: verified working; `curl`-debuggable; no HTTP/2/gRPC fragility through proxies; JS SDK first-class support. Alternative (gRPC `:4317`) rejected: lower overhead only matters at high span volume we don't have; `4317` is unpublished to the host anyway. Collector (-in-`lgtm`) fans out to Tempo/Mimir/Loki, so the app keeps one env var.

2. **SDK: `@opentelemetry/sdk-node` + `@opentelemetry/auto-instrumentations-node` + three OTLP-proto exporters (trace/metric/log), behind a tiny `src/observability/` module initialized before `buildApp()`.**
   Rationale: auto-instrumentation covers Fastify server spans, `undici`/`fetch` (Google + OIDC), `dns`, `http`; manual spans only at two domain edges (Google refresh, OIDC callback) with safe attributes. Alternative (hand-rolled spans everywhere) rejected as maintenance burden. `better-sqlite3` is synchronous — its spans measure blocking time, still useful, no async-context magic expected.
   - Logs: keep pino as the authoring API (no call-site churn); add `@opentelemetry/instrumentation-pino` to inject `trace_id`/`span_id`, bridge records to the Logs SDK via an OTLP `LogRecordExporter`, and keep stdout JSON as-is for `docker logs`. Alternative (scrape Docker stdout with Alloy) rejected per explicit decision: loses correlation unless re-parsed. Alternative (direct Loki push from app) rejected: bypasses Collector batching/redaction.
   - Metrics: `PeriodicExportingMetricReader` (default 60s) + runtime + HTTP RED; low-cardinality only (method/route/status), no per-user/per-place labels.
   - Shutdown: `SIGTERM` flush + `app.addHook('onClose')` flush; init failure logs a warning and continues uninstrumented.

3. **Gating by env presence, not by `NODE_ENV`.**
   Both prod and preprod run `NODE_ENV=production`, so `OTEL_EXPORTER_OTLP_ENDPOINT` presence is the switch. New vars: `OTEL_EXPORTER_OTLP_ENDPOINT` (empty = disabled), `OTEL_SERVICE_NAME` (default `places`), `DEPLOYMENT_ENVIRONMENT` (prod `production`), `OTEL_SERVICE_VERSION` (git sha). `src/config.ts` parses them leniently (never throws for OTEL); invalid URL logs a warning and disables export. Rationale: preprod stays dark by simply omitting vars and the network.

4. **Health-route exclusion at the SDK layer via a filtering span processor wrapping `BatchSpanProcessor`.**
   Rationale: `GET /api/health` fires every 30s from Docker healthcheck + Caddy; dropping before export keeps Tempo clean without touching route code. Alternative (Collector-side drop) rejected for now to keep homelab config untouched.

5. **Two-layer redaction: pino `redact` paths + OTLP attribute sanitizer.**
   Pino redacts `req.headers.cookie`, `req.headers.authorization`, `res.headers.set-cookie`, and any field named `*secret*`, `*token*`, `*key*` (covers `GOOGLE_PLACES_KEY`, `OIDC_CLIENT_SECRET`, `SESSION_SECRET` if ever logged). A central `sanitizeAttributes()` strips the same keys from span/log attributes (notably `X-Goog-Api-Key`, bearer tokens). Tests assert placeholders, not values. Alternative (Collector-only redaction) rejected as too late — secrets would already traverse the network.

6. **Deploy: `telemetry` as external network in git `compose.yaml`; values in Arcane UI.**
   `compose.yaml` declares `telemetry: { name: telemetry, external: true }` and attaches `places`. Arcane prod `.env` sets the four OTEL vars. `compose.preprod.yaml` unchanged. Rationale: network topology is code (flows through `main` → Arcane pull), secrets/endpoint are environment (never committed). Rollback = clear the endpoint var in Arcane and redeploy; code stays inert.

## Risks / Trade-offs

- [Risk] Pino chatty at `info` → Loki volume on `otel-lgtm` single-node storage → Mitigation: keep default `info`, map levels correctly, batch (512 records / 5s), drop-on-overflow with counter; dashboards filter `level>=warn` by default.
- [Risk] Missed secret field in a new route → persisted in Loki/Tempo → Mitigation: allowlist span attributes at domain edges; unit tests feed cookie/bearer/key fixtures and assert redacted output; review checklist on new routes.
- [Risk] `service.version` unset (Arcane build without sha) → undeployable-to-version queries → Mitigation: default `unknown`, warn at boot; Arcane build arg wires `GITHUB_SHA`/timestamp when available.
- [Risk] OTLP export latency on slow `telemetry` bridge → event-loop pressure → Mitigation: background batch, 10s export timeout, `concurrencyLimit 1`; fail-open by construction.
- [Risk] better-sqlite3 sync spans misread as async latency → Mitigation: document as blocking-time; no per-query parameters in attributes (avoid SQL text cardinality).

## Migration Plan

1. Merge code + `compose.yaml` network change to `main` (no endpoint yet → inert).
2. In Arcane prod project: add `places` to `telemetry` (via updated compose), set `OTEL_EXPORTER_OTLP_ENDPOINT=http://lgtm:4318`, `OTEL_SERVICE_NAME=places`, `DEPLOYMENT_ENVIRONMENT=production`, `OTEL_SERVICE_VERSION=<sha>`; redeploy.
3. Verify: `docker exec places wget -qO- http://lgtm:4318/` (DNS), then Grafana `:3001` Explore → Tempo `service.name=places`, Loki `{service_name="places"}`, Metrics `http_server_duration`.
4. Rollback: unset `OTEL_EXPORTER_OTLP_ENDPOINT` in Arcane and redeploy — service returns to stdout-only logging with zero code change.

## Open Questions

- None blocking. Deferrable: whether to add Alloy-side attribute-drop rules as defense-in-depth (homelab-owned, doesn't change this spec or tasks); whether to lower metric export interval once Grafana usage patterns emerge.
