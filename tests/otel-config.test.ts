import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

const BASE = {
  NODE_ENV: "production",
  SESSION_SECRET: "test-secret-12345678901234567890",
};

describe("otel config gating", () => {
  it("disables telemetry when endpoint unset (preprod/dev behavior)", () => {
    const c = loadConfig({ ...BASE } as any);
    expect(c.otelEnabled).toBe(false);
    expect(c.otelEndpoint).toBe("");
    expect(c.otelServiceName).toBe("places");
  });

  it("enables telemetry with prod-like env", () => {
    const c = loadConfig({
      ...BASE,
      OTEL_EXPORTER_OTLP_ENDPOINT: "http://lgtm:4318",
      OTEL_SERVICE_NAME: "places",
      DEPLOYMENT_ENVIRONMENT: "production",
      OTEL_SERVICE_VERSION: "abc123",
    } as any);
    expect(c.otelEnabled).toBe(true);
    expect(c.otelEndpoint).toBe("http://lgtm:4318");
    expect(c.otelEnvironment).toBe("production");
    expect(c.otelServiceVersion).toBe("abc123");
  });

  it("disables telemetry on invalid endpoint without throwing", () => {
    const c = loadConfig({ ...BASE, OTEL_EXPORTER_OTLP_ENDPOINT: "not-a-url" } as any);
    expect(c.otelEnabled).toBe(false);
    expect(c.otelEndpoint).toBe("");
  });

  it("trims trailing slashes from endpoint", () => {
    const c = loadConfig({ ...BASE, OTEL_EXPORTER_OTLP_ENDPOINT: "http://lgtm:4318///" } as any);
    expect(c.otelEndpoint).toBe("http://lgtm:4318");
    expect(c.otelEnabled).toBe(true);
  });

  it("defaults service version to package.json", () => {
    const c = loadConfig({ ...BASE } as any);
    expect(c.otelServiceVersion).toMatch(/^\d+\.\d+\.\d+/);
    const e = loadConfig({ ...BASE, OTEL_SERVICE_VERSION: "9.9.9" } as any);
    expect(e.otelServiceVersion).toBe("9.9.9");
  });
});
