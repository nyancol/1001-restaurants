# Proposal

## Why

Production runs blind today: the Fastify service logs to stdout as unstructured pino JSON with no trace correlation, and nothing reaches the homelab LGTM stack (`lgtm` container, `grafana/otel-lgtm:0.32.1`, reachable at `http://lgtm:4318` on the external `telemetry` Docker network — verified HTTP 200). When prod misbehaves (slow Google Places proxy, OIDC failures, SQLite errors) there is no trace, metric, or correlated log to inspect. Preprod stays dark by design; this change lights up prod only.

## What Changes

- Add OpenTelemetry SDK to the Node service (traces, metrics, logs) with OTLP/HTTP export to `http://lgtm:4318`, enabled only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set (unset = no-op, current behavior).
- Auto-instrument Fastify HTTP server, `undici`/`fetch` outbound calls (Google Places API, OIDC discovery), and SQLite/better-sqlite3 calls; exclude `GET /api/health` from tracing.
- Correlate pino logs with trace context (`trace_id`, `span_id`) and ship logs via OTLP logs to Loki through the LGTM collector (no direct Loki push, no Docker-log scraping).
- Set resource attributes `service.name=places`, `deployment.environment=production`, `service.version=<git sha / image tag>` on every signal.
- Redact secrets before export (pino `redact` paths + collector-side drop as second net): `cookie`, `authorization`, `SESSION_SECRET`, `OIDC_CLIENT_SECRET`, `GOOGLE_PLACES_KEY`.
- Attach prod `places` service to the external `telemetry` Docker network; keep preprod off it. Exporter is batched, background, fail-open (LGTM down never breaks requests). No sampling in this change.
- Prod-only activation: OTEL env vars live in the Arcane-managed `.env` (never committed); `compose.yaml` in git declares the network so Arcane picks it up on next pull of `main`.

## Capabilities

### New Capabilities
- `observability`: OTEL signals (traces, metrics, logs) from the prod service to the homelab LGTM stack, including activation gating, resource identity, redaction, health-route exclusion, and fail-open behavior.

### Modified Capabilities
- None. No user-facing API, auth, or domain behavior changes.

## Impact

- Code: `src/app.ts` (SDK init + Fastify instrumentation wiring), `src/config.ts` (OTEL env vars), `src/index.ts` (init order), new `src/observability/*` module; `package.json` adds `@opentelemetry/*` deps + `@opentelemetry/instrumentation-pino`.
- Config/deploy: `compose.yaml` gains external `telemetry` network on `places` service; `Dockerfile` unchanged except rebuilt image; Arcane prod `.env` gains `OTEL_EXPORTER_OTLP_ENDPOINT=http://lgtm:4318`, `OTEL_SERVICE_NAME=places`, `DEPLOYMENT_ENVIRONMENT=production`, `OTEL_SERVICE_VERSION`; `compose.preprod.yaml` and `.env.preprod` untouched (no OTEL vars, no `telemetry` network).
- Systems: homelab `lgtm` (otel-lgtm 0.32.1) receives OTLP/HTTP on 4318 over `telemetry` bridge network; Grafana (host :3001) gains Tempo/Mimir/Loki data for `places{env=production}`; no changes to Caddy ingress or `caddy_public` network.
- Risk: log volume to Loki if pino is chatty (mitigated by level mapping + batch); secret leak if redact paths miss a field (mitigated by tests asserting redaction).
