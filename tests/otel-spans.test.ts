import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { trace } from "@opentelemetry/api";
import { InMemorySpanExporter, SimpleSpanProcessor, TracerProvider } from "@opentelemetry/sdk-trace";
import { buildApp } from "../src/app.js";
import { signSession } from "../src/auth/session.js";
import { withSpan } from "../src/observability/trace.js";

const SECRET = "test-secret-12345678901234567890";

function installMemoryTracer() {
  const exporter = new InMemorySpanExporter();
  const provider = new TracerProvider({
    spanProcessors: [new SimpleSpanProcessor({ exporter })],
  });
  trace.setGlobalTracerProvider(provider);
  return { exporter, provider };
}

describe("otel domain spans", () => {
  afterEach(() => {
    trace.disable();
  });

  it("google.details span carries safe attributes, never the API key", async () => {
    const { exporter, provider } = installMemoryTracer();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "oyster-otel-span-"));
    try {
      const gfetch: any = async () => ({ status: 200, text: async () => JSON.stringify({ id: "X" }) });
      const config: any = {
        port: 0, host: "127.0.0.1", nodeEnv: "test",
        databasePath: path.join(dir, "app.db"),
        sessionSecret: SECRET, cookieSecure: false, devLoginEnabled: false,
        oidcIssuer: "", oidcClientId: "", oidcClientSecret: "",
        oidcRedirectUri: "http://localhost:3000/api/auth/callback",
        oidcEnabled: false, googlePlacesKey: "super-secret-key", trustProxy: false,
      };
      const { app } = await buildApp({ config, googleFetch: gfetch, skipOidcDiscovery: true });
      try {
        const cookie = `oyster_session=${await signSession(SECRET, "u1")}`;
        const res = await app.inject({
          method: "GET",
          url: "/api/google/details?placeId=ChIJParis",
          headers: { cookie },
        });
        expect(res.statusCode).toBe(200);
        await provider.forceFlush();
        const spans = exporter.getFinishedSpans();
        const details = spans.find((s: any) => s.name === "google.details");
        expect(details).toBeDefined();
        const dump = JSON.stringify(details!.attributes);
        expect(dump).not.toContain("super-secret-key");
        expect(String(details!.attributes?.["http.status_code"] ?? "")).toContain("200");
      } finally {
        await app.close();
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      await provider.shutdown().catch(() => {});
    }
  });

  it("failed span records ERROR without leaking secrets", async () => {
    const { exporter, provider } = installMemoryTracer();
    try {
      await expect(
        withSpan(
          "oidc.callback",
          { "peer.service": "id.example.com", OIDC_CLIENT_SECRET: "shhh-secret" },
          async () => {
            throw new Error("grant failed");
          }
        )
      ).rejects.toThrow("grant failed");
      await provider.forceFlush();
      const spans = exporter.getFinishedSpans();
      const cb = spans.find((s: any) => s.name === "oidc.callback");
      expect(cb).toBeDefined();
      expect(JSON.stringify(cb!.attributes)).not.toContain("shhh-secret");
      expect(cb!.attributes?.["OIDC_CLIENT_SECRET"] ?? cb!.attributes?.["oidc_client_secret"]).toBeDefined();
      expect(cb!.status.code).toBe(2); // ERROR
    } finally {
      await provider.shutdown().catch(() => {});
    }
  });
});
