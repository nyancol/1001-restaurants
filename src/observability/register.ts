/**
 * OTEL early registration.
 *
 * MUST be the first import in src/index.ts (before app/config imports).
 * ESM evaluates imports in order, so starting the SDK here installs the
 * require-hook patches before fastify/pino are first loaded — otherwise
 * auto-instrumentation would silently patch nothing.
 *
 * Reads OTEL_* env vars directly (same parsing as config.ts via
 * parseOtelEnv) because loadConfig() runs later in main().
 */
import { parseOtelEnv } from "./env.js";
import { initObservability, type Observability } from "./index.js";

function toConfig(env: NodeJS.ProcessEnv = process.env) {
  const otel = parseOtelEnv(env);
  return {
    nodeEnv: env.NODE_ENV ?? "development",
    otelEndpoint: otel.endpoint,
    otelServiceName: otel.serviceName,
    otelEnvironment: otel.environment,
    otelServiceVersion: otel.serviceVersion,
    otelEnabled: otel.enabled,
  };
}

export const observability: Observability = initObservability(toConfig());

if (observability.enabled) {
  console.info("OTEL telemetry enabled (SDK started before instrumented imports).");
} else {
  console.info("OTEL telemetry disabled (OTEL_EXPORTER_OTLP_ENDPOINT unset or invalid).");
}
