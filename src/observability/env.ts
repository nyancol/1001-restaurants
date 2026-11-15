/** Lenient OTEL env parsing shared by config.ts and register.ts. Never throws. */

export interface OtelEnv {
  endpoint: string;
  serviceName: string;
  environment: string;
  /** Release version: explicit env wins, otherwise package.json version. */
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

import { createRequire } from "node:module";

/** package.json version (the release identity). Never throws. */
export function packageVersion(): string {
  try {
    const require = createRequire(import.meta.url);
    const pkg = require("../../package.json") as { version?: unknown };
    return typeof pkg?.version === "string" && pkg.version ? pkg.version : "unknown";
  } catch {
    return "unknown";
  }
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
    serviceVersion: env.OTEL_SERVICE_VERSION?.trim() || packageVersion(),
    enabled: Boolean(endpoint),
  };
}
