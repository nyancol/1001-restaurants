import { describe, expect, it } from "vitest";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import {
  AggregationTemporality,
  InMemoryMetricExporter,
  MeterProvider,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import { buildMetricViews } from "../src/observability/index.js";
import { resourceFromAttributes } from "@opentelemetry/resources";

describe("otel metrics", () => {
  it("views restrict http.server attributes to the allowlist", async () => {
    const exporter = new InMemoryMetricExporter(AggregationTemporality.CUMULATIVE);
    const reader = new PeriodicExportingMetricReader({
      exporter,
      exportIntervalMillis: 60_000,
    });
    const provider = new MeterProvider({
      resource: resourceFromAttributes({ "service.name": "places" }),
      views: buildMetricViews() as never,
      readers: [reader],
    });
    const meter = provider.getMeter("test");
    const hist = meter.createHistogram("http.server.duration");
    // Legacy 0.x shape.
    hist.record(120, {
      "http.method": "GET",
      "http.route": "/api/places",
      "http.status_code": 200,
      userId: "u1",
      placeId: "p9",
    });
    // Stable 1.x shape actually emitted by current instrumentations.
    hist.record(80, {
      "http.request.method": "GET",
      "http.route": "/api/places",
      "http.response.status_code": 200,
      "url.scheme": "http",
      "server.address": "places",
      "url.path": "/api/places",
      "url.query": "owner=all",
    });
    await provider.forceFlush();
    const all = exporter.getMetrics();
    const points: any[] = [];
    for (const rm of all) {
      for (const sm of (rm as any).scopeMetrics ?? []) {
        for (const m of sm.metrics ?? []) {
          for (const dp of (m as any).dataPoints ?? []) points.push(dp);
        }
      }
    }
    expect(points.length).toBeGreaterThan(0);
    const byRoute = points.filter(
      (p: any) => (p.attributes as Record<string, unknown>)["http.route"] === "/api/places"
    );
    expect(byRoute.length).toBeGreaterThan(0);
    for (const p of points) {
      const attrs = p.attributes as Record<string, unknown>;
      expect(attrs).not.toHaveProperty("userId");
      expect(attrs).not.toHaveProperty("placeId");
      // Concrete path / query are high-cardinality — never kept.
      expect(attrs).not.toHaveProperty("url.path");
      expect(attrs).not.toHaveProperty("url.query");
    }
    const legacy = points.find((p: any) => (p.attributes as any)["http.method"] === "GET");
    expect(legacy?.attributes["http.route"]).toBe("/api/places");
    const stable = points.find(
      (p: any) => (p.attributes as any)["http.request.method"] === "GET"
    );
    expect(stable?.attributes["http.route"]).toBe("/api/places");
    expect(stable?.attributes["http.response.status_code"]).toBe(200);
    await provider.shutdown().catch(() => {});
  });

  it("auto-instrumentations include runtime metrics", () => {
    const instrs = getNodeAutoInstrumentations() as any[];
    const names = instrs.map((i: any) => i.instrumentationName as string);
    expect(names).toContain("@opentelemetry/instrumentation-runtime-node");
  });

  it("metric reader defaults to 60s interval with resource identity", async () => {
    const { initObservability } = await import("../src/observability/index.js");
    const handle = initObservability({
      nodeEnv: "test",
      otelEndpoint: "",
      otelServiceName: "places",
      otelEnvironment: "test",
      otelServiceVersion: "unknown",
      otelEnabled: false,
    });
    expect(handle.enabled).toBe(false);
    await handle.shutdown();
  });
});
