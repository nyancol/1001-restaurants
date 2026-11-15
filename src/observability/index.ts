import { diag } from "@opentelemetry/api";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-proto";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { FastifyInstrumentation } from "@opentelemetry/instrumentation-fastify";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  BatchLogRecordProcessor,
  type LogRecordProcessor,
} from "@opentelemetry/sdk-logs";
import {
  PeriodicExportingMetricReader,
  createAllowListAttributesProcessor,
} from "@opentelemetry/sdk-metrics";
import {
  BatchSpanProcessor,
  type SpanProcessor,
  type ReadableSpan,
  type Span,
} from "@opentelemetry/sdk-trace";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import type { OtelConfig } from "./env.js";
import { sanitizeAttributes } from "./sanitize.js";

export interface Observability {
  enabled: boolean;
  shutdown: () => Promise<void>;
}

const noop: Observability = { enabled: false, shutdown: async () => {} };

/** Path portion of a URL-ish value (drops query string / fragment). */
function pathOf(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  const noQuery = value.split("?")[0].split("#")[0];
  try {
    // Absolute URL (http.url / url.full) → pathname; relative path → itself.
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(noQuery)) return new URL(noQuery).pathname;
  } catch {
    return noQuery;
  }
  return noQuery;
}

function isHealthSpan(span: ReadableSpan | Span): boolean {
  const attrs = (span as ReadableSpan).attributes ?? {};
  // SDK semconv drift: instrumentation sets stable 1.x names (url.path),
  // older docs/tests use 0.x names (http.route / http.target). Check all.
  const candidates = [
    attrs["http.route"],
    attrs["http.target"],
    attrs["url.path"],
    attrs["http.url"],
    attrs["url.full"],
  ];
  if (candidates.some((c) => pathOf(c) === "/api/health")) return true;
  const name = (span as ReadableSpan).name ?? "";
  return name.includes("/api/health");
}

/** Drops GET /api/health spans and sanitizes attributes on the rest. */
export class HealthFilterProcessor implements SpanProcessor {
  constructor(private readonly next: SpanProcessor) {}

  onStart(span: Span, parentContext: unknown): void {
    this.next.onStart(span, parentContext as never);
  }

  onEnd(span: ReadableSpan): void {
    if (isHealthSpan(span)) return;
    const clean = sanitizeAttributes({ ...(span.attributes ?? {}) } as Record<string, unknown>);
    for (const [k, v] of Object.entries(clean)) {
      (span.attributes as Record<string, unknown>)[k] = v as never;
    }
    this.next.onEnd(span);
  }

  async shutdown(): Promise<void> {
    await this.next.shutdown();
  }

  async forceFlush(): Promise<void> {
    await this.next.forceFlush();
  }
}

class SanitizingLogProcessor implements LogRecordProcessor {
  constructor(private readonly next: LogRecordProcessor) {}
  onEmit(record: any): void {
    try {
      if (record?.attributes) {
        record.attributes = sanitizeAttributes(record.attributes);
      }
    } catch {
      /* ignore */
    }
    this.next.onEmit(record);
  }
  async shutdown(): Promise<void> {
    await this.next.shutdown();
  }
  async forceFlush(): Promise<void> {
    await this.next.forceFlush();
  }
}

/**
 * Low-cardinality HTTP attributes kept on metric streams. Covers both the
 * stable 1.x semconv names emitted by current instrumentations
 * (http.request.method, http.route, http.response.status_code, url.scheme,
 * server.address) and their legacy 0.x aliases, so a semconv bump on either
 * side can't silently strip every label again.
 *
 * Deliberately EXCLUDED (high cardinality): url.path, url.query, url.full,
 * http.url, http.target — concrete paths carry ids and query strings.
 */
export const HTTP_ALLOWLIST = [
  "http.request.method",
  "http.method",
  "http.route",
  "http.response.status_code",
  "http.status_code",
  "url.scheme",
  "http.scheme",
  "server.address",
  "http.host",
];

/** Views restricting metric streams to low-cardinality attributes. */
export function buildMetricViews(): unknown[] {
  return [
    {
      instrumentName: "http.server.*",
      attributesProcessors: [createAllowListAttributesProcessor(HTTP_ALLOWLIST)],
    },
    {
      instrumentName: "http.client.*",
      attributesProcessors: [
        createAllowListAttributesProcessor([
          ...HTTP_ALLOWLIST,
          // NOTE: no http.url / url.full here — full upstream URLs carry
          // place ids and query strings (cardinality bomb). server.address
          // + peer.service are enough to split Google vs OIDC traffic.
          "server.address",
          "peer.service",
        ]),
      ],
    },
  ];
}

export function initObservability(config: OtelConfig): Observability {
  const endpoint = (config.otelEndpoint ?? "").trim();
  if (!config.otelEnabled || !endpoint) {
    return noop;
  }

  const base = endpoint.replace(/\/+$/, "");
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: config.otelServiceName || "places",
    [ATTR_SERVICE_VERSION]: config.otelServiceVersion || "unknown",
    "deployment.environment": config.otelEnvironment || config.nodeEnv,
  });

  try {
    const traceExporter = new OTLPTraceExporter({
      url: `${base}/v1/traces`,
      timeoutMillis: 10_000,
      concurrencyLimit: 1,
    });
    const metricExporter = new OTLPMetricExporter({
      url: `${base}/v1/metrics`,
      timeoutMillis: 10_000,
      concurrencyLimit: 1,
    });
    const logExporter = new OTLPLogExporter({
      url: `${base}/v1/logs`,
      timeoutMillis: 10_000,
      concurrencyLimit: 1,
    });

    const spanProcessor = new HealthFilterProcessor(
      new BatchSpanProcessor({
        exporter: traceExporter,
        maxQueueSize: 2048,
        maxExportBatchSize: 512,
        scheduledDelayMillis: 5000,
        exportTimeoutMillis: 10_000,
      })
    );
    const metricReader = new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 60_000,
      exportTimeoutMillis: 10_000,
    });
    const logProcessor = new SanitizingLogProcessor(
      new BatchLogRecordProcessor({
        exporter: logExporter,
        maxQueueSize: 2048,
        maxExportBatchSize: 512,
        scheduledDelayMillis: 5000,
        exportTimeoutMillis: 10_000,
      })
    );

    const sdk = new NodeSDK({
      resource,
      spanProcessors: [spanProcessor],
      metricReaders: [metricReader],
      logRecordProcessors: [logProcessor],
      views: buildMetricViews() as never,
      instrumentations: [
        getNodeAutoInstrumentations({
          "@opentelemetry/instrumentation-fs": { enabled: false },
          "@opentelemetry/instrumentation-dns": { enabled: true },
          "@opentelemetry/instrumentation-http": { enabled: true },
          "@opentelemetry/instrumentation-undici": { enabled: true },
          // Pino is handled explicitly (mixin in logger.ts + OtlpBridgeStream)
          // so correlation/sending don't depend on require-hook load order.
          // Disable the auto log-sending stream to avoid double delivery;
          // the auto mixin (same trace_id values) is harmless if patched.
          "@opentelemetry/instrumentation-pino": { enabled: true, disableLogSending: true } as never,
        }),
        // Fastify is not part of the auto bundle — explicit is required.
        new FastifyInstrumentation({ enabled: true }),
      ],
    });

    sdk.start();

    let shut = false;
    const shutdown = async (): Promise<void> => {
      if (shut) return;
      shut = true;
      const timer = new Promise<void>((resolve) => setTimeout(resolve, 5000));
      await Promise.race([sdk.shutdown().catch(() => {}), timer]);
    };

    return { enabled: true, shutdown };
  } catch (err) {
    diag.warn(`OTEL init failed, continuing without telemetry: ${(err as Error)?.message}`);
    return noop;
  }
}
