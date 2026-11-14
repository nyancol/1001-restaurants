import { SeverityNumber, context, trace } from "@opentelemetry/api";
import { logs } from "@opentelemetry/api";
import { Writable } from "node:stream";
import { stdSerializers } from "pino";
import { sanitizeAttributes } from "./sanitize.js";

/**
 * Pino redaction: secrets never reach stdout JSON nor the OTEL pipeline.
 * The bridge below forwards the already-redacted record to the Logs SDK,
 * so redacting here covers both stdout and Loki in one place.
 */
export const PINO_REDACT_PATHS = [
  // Request/response secrets (exact shapes used by this service).
  "req.headers.cookie",
  "req.headers.authorization",
  "req.headers.x-goog-api-key",
  "req.headers.X-Goog-Api-Key",
  'res.headers["set-cookie"]',
  // Top-level known secret fields (config values if ever logged).
  "sessionSecret",
  "clientSecret",
  "googlePlacesKey",
  "apiKey",
  "token",
  "SESSION_SECRET",
  "OIDC_CLIENT_SECRET",
  "GOOGLE_PLACES_KEY",
  "X-Goog-Api-Key",
  "x-goog-api-key",
  // One-level-deep common shapes (e.g. { user: { token } } stay safe).
  "*.cookie",
  "*.authorization",
  "*.secret",
  "*.token",
  "*.apiKey",
  "*.sessionSecret",
  "*.clientSecret",
  "*.googlePlacesKey",
];

/**
 * Mixin evaluated at log time: injects the active span's trace/span IDs.
 * Explicit (not via instrumentation-pino patching) so it works regardless
 * of module load order — require-hook patching only applies to modules
 * first loaded after SDK start, which tests cannot guarantee.
 */
function traceMixin(_context: unknown, _level: number): Record<string, string> {
  try {
    const spanCtx = trace.getSpanContext(context.active());
    if (!spanCtx) return {};
    return {
      trace_id: spanCtx.traceId,
      span_id: spanCtx.spanId,
      trace_flags: String(spanCtx.traceFlags ?? "01").padStart(2, "0"),
    };
  } catch {
    return {};
  }
}

export function buildPinoOptions(): Record<string, unknown> {
  return {
    level: process.env.LOG_LEVEL ?? "info",
    redact: {
      paths: PINO_REDACT_PATHS,
      censor: "[Redacted]",
    },
    serializers: {
      req: stdSerializers.req,
      res: stdSerializers.res,
      err: stdSerializers.err,
    },
    mixin: traceMixin,
  };
}

/** Map pino numeric levels to OTEL severity numbers. */
export function mapPinoLevelToSeverity(level: number): SeverityNumber {
  if (level >= 60) return SeverityNumber.FATAL;
  if (level >= 50) return SeverityNumber.ERROR;
  if (level >= 40) return SeverityNumber.WARN;
  if (level >= 30) return SeverityNumber.INFO;
  if (level >= 20) return SeverityNumber.DEBUG;
  return SeverityNumber.TRACE;
}

export const otelLogDropCounter = { dropped: 0 };

/**
 * Writable for pino multistream: parses each JSON line and forwards a
 * sanitized record to the global OTEL LoggerProvider (set by the SDK in
 * production via observability/register.ts). Never throws — failures are
 * counted and the record is dropped (fail-open).
 */
export class OtlpBridgeStream extends Writable {
  constructor() {
    super({ objectMode: false });
  }

  _write(chunk: unknown, _enc: unknown, cb: () => void): void {
    try {
      const line = String(chunk);
      for (const part of line.split("\n")) {
        if (!part.trim()) continue;
        let rec: any;
        try {
          rec = JSON.parse(part);
        } catch {
          continue;
        }
        try {
          const provider: any = (logs as any).getLoggerProvider?.();
          const logger = provider?.getLogger?.("places");
          if (!logger?.emit) continue;
          const attrs = sanitizeAttributes({
            level: rec.level,
            ...(rec.reqId ? { "req.id": rec.reqId } : {}),
            ...(rec.req?.url ? { route: rec.req.url } : {}),
            ...(rec.trace_id ? { trace_id: rec.trace_id } : {}),
            ...(rec.span_id ? { span_id: rec.span_id } : {}),
          });
          logger.emit({
            severityNumber: mapPinoLevelToSeverity(Number(rec.level ?? 30)),
            severityText: String(rec.level ?? ""),
            body: typeof rec.msg === "string" ? rec.msg : JSON.stringify(rec.msg ?? rec),
            attributes: attrs,
          });
        } catch {
          otelLogDropCounter.dropped += 1;
        }
      }
    } catch {
      otelLogDropCounter.dropped += 1;
    }
    cb();
  }
}
