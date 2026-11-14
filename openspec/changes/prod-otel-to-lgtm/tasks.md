# Tasks

## 1. OTEL scaffolding and config gating

- [x] 1.1 Add OTEL dependencies (`@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`, `@opentelemetry/sdk-trace-node`, `@opentelemetry/sdk-metrics`, `@opentelemetry/sdk-logs`, OTLP proto exporters for trace/metrics/logs, `@opentelemetry/instrumentation-pino`, `@opentelemetry/resources`, `@opentelemetry/semantic-conventions`) and verify `npm install` + `npm run typecheck` pass
- [x] 1.2 Extend `src/config.ts` with lenient OTEL vars (`OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME` default `places`, `DEPLOYMENT_ENVIRONMENT`, `OTEL_SERVICE_VERSION` default `unknown`; never throw for OTEL, invalid URL disables export with warning) and verify with unit test feeding prod-like and empty envs
- [x] 1.3 Create `src/observability/` module (`initObservability(config)` returning `{ sdk, shutdown }` or no-op when endpoint unset; resource with `service.name`, `service.version`, `deployment.environment`; OTLP/HTTP exporters; batch processors with 5s/512-record batching, 10s timeout) and verify `npm run typecheck` passes and no-op path creates zero exporters
- [x] 1.4 Wire init/shutdown order in `src/index.ts` (init before `buildApp`, `SIGTERM` + `onClose` flush with 5s cap) and verify `npm test` still passes and boot with endpoint unset logs one info line and serves `/api/health`

## 2. Traces (auto-instrumentation + domain edges + health exclusion)

- [x] 2.1 Enable `getNodeAutoInstrumentations` (http, fastify, undici, dns, net) with `fs` sampling left default and verify a `GET /api/places` request in tests produces a server span with `http.route` and `http.status_code`
- [x] 2.2 Add filtering span processor dropping `GET /api/health` spans before export and verify with test asserting health requests emit logs but zero exported spans
- [x] 2.3 Add manual child spans at Google proxy edges (`src/google/routes.ts` autocomplete/details/geocode) and place refresh (`src/places/routes.ts` refresh) with attributes `peer`, `endpoint`, outcome and no query/key material, and verify span parentage and attribute allowlist in unit test with stubbed `googleFetch`
- [x] 2.4 Add manual span around OIDC discovery/callback path (`src/auth/routes.ts`) with issuer host (not secret) attribute and verify callback failure still records span status error without secret leakage

## 3. Correlated pino logs via OTLP

- [x] 3.1 Configure pino `redact` paths (`req.headers.cookie`, `req.headers.authorization`, `res.headers["set-cookie"]`, `*secret*`, `*token*`, `*key*`, `sessionSecret`, `clientSecret`) plus `serializers` for `req`/`err`, and verify with test logging cookie/bearer/key fixtures asserting `[Redacted]` placeholders in output
- [x] 3.2 Enable `@opentelemetry/instrumentation-pino` so in-scope records carry `trace_id`/`span_id`, and verify with test that a request-scoped `req.log.info` contains matching trace IDs from the active span
- [x] 3.3 Bridge pino records to Logs SDK `OTLPLogExporter` (batch, drop-on-overflow with counter, severity mapping pino 10/20/30/40/50/60 to OTEL severities) while keeping stdout JSON unchanged, and verify exporter receives the record and stdout still parses as JSON with `trace_id` present

## 4. Metrics (RED + runtime, low cardinality)

- [x] 4.1 Configure `PeriodicExportingMetricReader` (60s default, OTLP) with HTTP server duration/request counter views restricted to `http.method`, `http.route`, `http.status_code` (no user/place IDs), and verify metric export in test contains only allowlisted attributes
- [x] 4.2 Enable Node runtime metrics (event loop, heap, CPU) and verify they export under `service.name=places` with `deployment.environment` resource attached

## 5. Redaction hardening and fail-open behavior

- [x] 5.1 Add central `sanitizeAttributes()` applied to all manual span/log attributes stripping `authorization`, `cookie`, `set-cookie`, `*secret*`, `*token*`, `*api*key*` (case-insensitive) and verify with unit test asserting `X-Goog-Api-Key` and bearer values never survive
- [x] 5.2 Prove fail-open: test with unreachable endpoint (`http://127.0.0.1:9`) asserting requests still return correct status codes, boot succeeds with warning, and shutdown flush caps at 5s without hanging
- [x] 5.3 Document redaction allowlist and fail-open contract in `README.md` telemetry section and verify documented env vars match `src/config.ts` names exactly

## 6. Compose network, Arcane handoff, and prod verification

- [x] 6.1 Update `compose.yaml` to declare external `telemetry` network (`name: telemetry`) and attach `places` (keeping `default` + `caddy`), leaving `compose.preprod.yaml` untouched, and verify `docker compose config` renders `telemetry` as external and preprod override still has no OTEL vars
- [x] 6.2 Update `.env.sample` with commented OTEL block (`OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME`, `DEPLOYMENT_ENVIRONMENT`, `OTEL_SERVICE_VERSION`) marked prod-only via Arcane, and verify sample matches parser defaults
- [x] 6.3 Document Arcane rollout/rollback (four prod vars, redeploy via Arcane pull of `main`, rollback by unsetting endpoint) in `README.md` alongside 5.3 and verify every var name matches implementation
- [ ] 6.4 End-to-end verification plan task: after Arcane redeploy, run `docker exec places wget -qO- http://lgtm:4318/` for DNS, hit one authed `/api/places` + one Google details call, then confirm in Grafana `:3001` that Tempo shows the trace, Loki `{service_name="places"}` shows correlated logs by `trace_id`, and Mimir shows `http_server_duration`; record results before archive
