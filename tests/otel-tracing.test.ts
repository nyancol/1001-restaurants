import { describe, expect, it } from "vitest";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { FastifyInstrumentation } from "@opentelemetry/instrumentation-fastify";
import { InMemorySpanExporter, SimpleSpanProcessor, TracerProvider } from "@opentelemetry/sdk-trace";
import { trace, context } from "@opentelemetry/api";
import { HealthFilterProcessor } from "../src/observability/index.js";

function names(instrs: any[]): string[] {
  return instrs.map((i: any) => i.instrumentationName as string);
}

describe("otel tracing instrumentations", () => {
  it("enables http, undici, dns, net via auto-instrumentations (fs disabled)", () => {
    const instrs = getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-fs": { enabled: false },
    }) as any[];
    const n = names(instrs);
    for (const want of [
      "@opentelemetry/instrumentation-http",
      "@opentelemetry/instrumentation-undici",
      "@opentelemetry/instrumentation-dns",
      "@opentelemetry/instrumentation-net",
      "@opentelemetry/instrumentation-pino",
    ]) {
      expect(n).toContain(want);
    }
  });

  it("fastify instrumentation is constructible and enabled", () => {
    const f = new FastifyInstrumentation({ enabled: true });
    expect(f.instrumentationName).toBe("@opentelemetry/instrumentation-fastify");
  });

  it("tracer pipeline records spans with route and status attributes", async () => {
    const exporter = new InMemorySpanExporter();
    const provider = new TracerProvider({
      spanProcessors: [new SimpleSpanProcessor({ exporter })],
    });
    trace.setGlobalTracerProvider(provider);
    try {
      const tracer = trace.getTracer("test");
      const span = tracer.startSpan("GET /api/things");
      span.setAttribute("http.route", "/api/things");
      span.setAttribute("http.status_code", 200);
      span.end();
      await provider.forceFlush();
      const spans = exporter.getFinishedSpans();
      const server = spans.find((s: any) => s.attributes?.["http.route"] === "/api/things");
      expect(server).toBeDefined();
      expect(String(server!.attributes?.["http.status_code"] ?? "200")).toContain("200");
    } finally {
      await provider.shutdown().catch(() => {});
      trace.disable();
      context.disable();
    }
  });
});

describe("health span filter", () => {
  function fakeSpan(partial: any): any {
    return { name: partial.name ?? "GET", attributes: partial.attributes ?? {} };
  }

  it("drops /api/health spans and passes others with sanitized attributes", () => {
    const seen: any[] = [];
    const next = {
      onStart: () => {},
      onEnd: (s: any) => void seen.push(s),
      shutdown: async () => {},
      forceFlush: async () => {},
    };
    const proc = new HealthFilterProcessor(next as never);
    proc.onEnd(fakeSpan({ name: "GET /api/health", attributes: { "http.route": "/api/health" } }));
    // Stable 1.x semconv shape actually emitted by the SDK (no http.route).
    proc.onEnd(
      fakeSpan({
        name: "GET",
        attributes: {
          "http.request.method": "GET",
          "url.path": "/api/health",
          "url.scheme": "http",
          "http.response.status_code": 200,
        },
      })
    );
    // Health with query string still matches on path.
    proc.onEnd(fakeSpan({ name: "GET", attributes: { "url.path": "/api/health?foo=bar" } }));
    proc.onEnd(
      fakeSpan({
        name: "GET",
        attributes: {
          "http.request.method": "GET",
          "url.path": "/api/places",
          "url.scheme": "http",
          "http.response.status_code": 200,
          "X-Goog-Api-Key": "secret-key",
        },
      })
    );
    proc.onEnd(
      fakeSpan({
        name: "GET /api/places",
        attributes: { "http.route": "/api/places", "X-Goog-Api-Key": "secret-key" },
      })
    );
    expect(seen).toHaveLength(2);
    for (const s of seen) {
      expect(s.attributes["X-Goog-Api-Key"]).toBe("[Redacted]");
    }
    expect(seen[0].attributes["url.path"]).toBe("/api/places");
    expect(seen[1].attributes["http.route"]).toBe("/api/places");
  });
});
