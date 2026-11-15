# Observability Specification

## Purpose

Prod-only OpenTelemetry signals (traces, metrics, structured logs) from the places service to the homelab LGTM stack, so production incidents are diagnosable in Grafana/Tempo/Loki without changing user-facing behavior.

## Requirements

### Requirement: Gated OTLP export to homelab LGTM
The system SHALL export OTEL traces, metrics, and logs via OTLP/HTTP to the endpoint in `OTEL_EXPORTER_OTLP_ENDPOINT` (e.g. `http://lgtm:4318`), and SHALL emit no network telemetry when that variable is unset or empty. Preprod and dev (no endpoint configured, not on the `telemetry` network) SHALL behave exactly as today.

#### Scenario: Prod with endpoint configured
- **WHEN** `OTEL_EXPORTER_OTLP_ENDPOINT=http://lgtm:4318` is set and the `places` container is on the `telemetry` Docker network
- **THEN** traces, metrics, and logs are delivered to the LGTM collector over OTLP/HTTP

#### Scenario: Preprod/dev with no endpoint
- **WHEN** `OTEL_EXPORTER_OTLP_ENDPOINT` is unset or empty
- **THEN** the service boots and serves normally with no export attempts and no startup failure

### Requirement: Resource identity on every signal
Every exported signal SHALL carry `service.name=places` (overridable via `OTEL_SERVICE_NAME`), `deployment.environment` (prod: `production`), and `service.version` (git sha / image tag via `OTEL_SERVICE_VERSION`), so Grafana can filter `places{env=production}` today and `env=preprod` later without renaming the service.

#### Scenario: Query prod signals in Grafana
- **WHEN** an operator filters Tempo/Loki/Mimir by `service.name=places` and `deployment.environment=production`
- **THEN** only prod signals match, with `service.version` identifying the deployed build

### Requirement: HTTP trace coverage with health exclusion
The system SHALL create a server span for every `/api/*` request including method, route, and status code, propagating W3C trace context inbound and outbound, and SHALL NOT create or export spans for `GET /api/health` (healthcheck noise).

#### Scenario: API request traced end to end
- **WHEN** a client calls `GET /api/places` with session auth
- **THEN** a server span is exported with route, status code, and the request's trace ID

#### Scenario: Healthcheck is silent
- **WHEN** the Docker healthcheck or Caddy calls `GET /api/health`
- **THEN** no trace span is exported for that request

### Requirement: Outbound dependency spans
Outbound calls to Google Places API (`autocomplete`, `details`, `geocode`, place refresh) and OIDC discovery/callback SHALL appear as child spans of the requesting server span with peer, endpoint, and outcome attributes, and SHALL NOT include API keys, client secrets, or tokens in attributes.

#### Scenario: Slow Google proxy is diagnosable
- **WHEN** `GET /api/google/details` fans out to `places.googleapis.com`
- **THEN** Tempo shows the child span with duration and HTTP status, without any `X-Goog-Api-Key` value

### Requirement: Correlated pino logs via OTLP
Application logs written with pino SHALL include `trace_id` and `span_id` when a request is in scope, SHALL be mapped to OTEL severity, and SHALL be shipped via the OTLP logs pipeline to Loki through the LGTM collector. Log bodies SHALL carry structured fields (`level`, `msg`, `route`, `trace_id`); Loki labels SHALL stay low-cardinality (`service_name`, `deployment_environment`, `level`).

#### Scenario: Log-to-trace jump in Grafana
- **WHEN** an operator finds an error log for a failed `/api/google/details` call in Loki
- **THEN** the log's `trace_id` opens the matching trace in Tempo

### Requirement: Secret redaction before export
The system SHALL redact `cookie`, `authorization` / `set-cookie` headers, `SESSION_SECRET`, `OIDC_CLIENT_SECRET`, and `GOOGLE_PLACES_KEY` values from logs, span attributes, and metric labels before export, so no secret persists in Loki, Tempo, or Mimir.

#### Scenario: Authenticated request logged safely
- **WHEN** a request carries a session cookie and bearer token
- **THEN** exported logs and spans contain redacted placeholders, never the raw secret values

### Requirement: Fail-open telemetry
Telemetry export SHALL be asynchronous and batched; exporter errors, timeouts, or an unreachable collector SHALL NOT fail requests, change status codes, or prevent boot. Dropped telemetry under backpressure SHALL be counted and logged at debug level, not retried inline on the request path.

#### Scenario: LGTM restarts mid-traffic
- **WHEN** `lgtm:4318` is unreachable for 60 seconds during prod traffic
- **THEN** all API responses remain correct and the service recovers delivery automatically when the collector returns

### Requirement: No sampling in initial scope
The system SHALL export 100% of non-excluded spans, metrics points, and log records in this change (no head/tail sampling), accepting higher volume at current homelab traffic levels.

#### Scenario: Low-volume prod traffic
- **WHEN** prod serves its current homelab load with no sampling configured
- **THEN** every eligible span and log reaches the collector subject only to batching and fail-open drops
