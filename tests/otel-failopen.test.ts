import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { trace } from "@opentelemetry/api";
import { buildApp } from "../src/app.js";
import { initObservability } from "../src/observability/index.js";

describe("otel fail-open", () => {
  afterEach(() => {
    trace.disable();
  });

  it("serves requests and boots with unreachable collector; shutdown caps at 5s", async () => {
    const started = Date.now();
    const handle = initObservability({
      nodeEnv: "test",
      otelEndpoint: "http://127.0.0.1:9",
      otelServiceName: "places",
      otelEnvironment: "test",
      otelServiceVersion: "test",
      otelEnabled: true,
    });
    expect(handle.enabled).toBe(true);

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "oyster-otel-failopen-"));
    const config: any = {
      port: 0, host: "127.0.0.1", nodeEnv: "test",
      databasePath: path.join(dir, "app.db"),
      sessionSecret: "test-secret-12345678901234567890",
      cookieSecure: false,
      oidcIssuer: "", oidcClientId: "", oidcClientSecret: "",
      oidcRedirectUri: "http://localhost:3000/api/auth/callback",
      oidcEnabled: false, googlePlacesKey: "", trustProxy: false,
      otelEndpoint: "http://127.0.0.1:9", otelEnabled: true,
      otelServiceName: "places", otelEnvironment: "test", otelServiceVersion: "test",
    };
    const { app } = await buildApp({ config, skipOidcDiscovery: true });
    try {
      const res = await app.inject({ method: "GET", url: "/api/health" });
      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe("ok");
    } finally {
      await app.close();
    }
    const t0 = Date.now();
    await handle.shutdown();
    expect(Date.now() - t0).toBeLessThan(8000);
    expect(Date.now() - started).toBeLessThan(30000);
    fs.rmSync(dir, { recursive: true, force: true });
  }, 30000);
});
