/** Lenient OTEL env parsing shared by config.ts and register.ts. Never throws. */

export interface OtelEnv {
  endpoint: string;
  serviceName: string;
  environment: string;
  serviceVersion: string;
  enabled: boolean;
}

/** Subset of AppConfig that observability needs (AppConfig satisfies this). */
export interface OtelConfig {
  otelEndpoint: string;
  otelServiceName: string;
  otelEnvironment: string;
  otelServiceVersion: string;
  otelEnabled: boolean;
  nodeEnv: string;
}

export function parseOtelEnv(env: NodeJS.ProcessEnv = process.env): OtelEnv {
  const raw = (env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "").trim().replace(/\/+$/, "");
  let endpoint = "";
  if (raw) {
    try {
      const u = new URL(raw);
      if (!["http:", "https:"].includes(u.protocol)) throw new Error("bad protocol");
      endpoint = raw;
    } catch {
      console.warn(
        `Invalid OTEL config: OTEL_EXPORTER_OTLP_ENDPOINT is not a valid URL ("${raw}"). Telemetry disabled.`
      );
    }
  }
  return {
    endpoint,
    serviceName: env.OTEL_SERVICE_NAME?.trim() || "places",
    environment: env.DEPLOYMENT_ENVIRONMENT?.trim() || env.NODE_ENV || "development",
    serviceVersion: env.OTEL_SERVICE_VERSION?.trim() || "unknown",
    enabled: Boolean(endpoint),
  };
}
