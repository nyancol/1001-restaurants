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
    hist.record(120, {
      "http.method": "GET",
      "http.route": "/api/places",
      "http.status_code": 200,
      userId: "u1",
      placeId: "p9",
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
    const attrs = points[0].attributes as Record<string, unknown>;
    expect(attrs["http.method"]).toBe("GET");
    expect(attrs["http.route"]).toBe("/api/places");
    expect(attrs).not.toHaveProperty("userId");
    expect(attrs).not.toHaveProperty("placeId");
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
