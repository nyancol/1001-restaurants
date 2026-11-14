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

function isHealthSpan(span: ReadableSpan | Span): boolean {
  const attrs = (span as ReadableSpan).attributes ?? {};
  const route =
    (attrs["http.route"] as string | undefined) ??
    (attrs["http.target"] as string | undefined) ??
    "";
  const name = (span as ReadableSpan).name ?? "";
  return route === "/api/health" || name.includes("/api/health");
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

export const HTTP_ALLOWLIST = [
  "http.method",
  "http.route",
  "http.status_code",
  "http.scheme",
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
          "http.url",
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
