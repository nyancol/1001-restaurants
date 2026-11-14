import { describe, expect, it } from "vitest";
import { Writable } from "node:stream";
import pino, { multistream } from "pino";
import { trace, context, logs } from "@opentelemetry/api";
import { LoggerProvider, InMemoryLogRecordExporter, SimpleLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { TracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import {
  buildPinoOptions,
  mapPinoLevelToSeverity,
  OtlpBridgeStream,
} from "../src/observability/logger.js";
import { SeverityNumber } from "@opentelemetry/api";

function memoryStream(chunks: string[]) {
  return new Writable({
    write(chunk, _enc, cb) {
      chunks.push(String(chunk));
      cb();
    },
  });
}

describe("otel pino logs", () => {
  it("redacts cookie, bearer, and key fields", () => {
    const chunks: string[] = [];
    const logger = pino(buildPinoOptions() as any, memoryStream(chunks));
    logger.info({
      req: { headers: { cookie: "oyster_session=abc", authorization: "Bearer xyz" } },
      googlePlacesKey: "key-123",
      OIDC_CLIENT_SECRET: "shhh",
      msg: "hello",
    });
    const out = chunks.join("");
    expect(out).toContain("[Redacted]");
    expect(out).not.toContain("oyster_session=abc");
    expect(out).not.toContain("Bearer xyz");
    expect(out).not.toContain("key-123");
    expect(out).not.toContain("shhh");
  });

  it("mixin injects trace_id/span_id inside an active span", async () => {
    context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());
    const spanExporter = new InMemorySpanExporter();
    const traceProvider = new TracerProvider({
      spanProcessors: [new SimpleSpanProcessor({ exporter: spanExporter })],
    });
    trace.setGlobalTracerProvider(traceProvider);
    try {
      const chunks: string[] = [];
      // Explicit mixin in buildPinoOptions — no require-hook patching needed.
      const logger = pino(buildPinoOptions() as any, memoryStream(chunks));
      const tracer = trace.getTracer("test");
      await tracer.startActiveSpan("s", async (span: any) => {
        logger.info("inside");
        span.end();
      });
      const line = chunks.join("").split("\n").find((l) => l.includes("inside"));
      expect(line).toBeDefined();
      const rec = JSON.parse(line!);
      expect(rec.trace_id).toBeDefined();
      expect(rec.span_id).toBeDefined();
      expect(rec.trace_id).toMatch(/^[0-9a-f]{32}$/);
    } finally {
      await traceProvider.shutdown().catch(() => {});
      trace.disable();
      context.disable();
    }
  });

  it("bridges JSON lines to the Logs SDK with severity mapping, stdout stays JSON", async () => {
    expect(mapPinoLevelToSeverity(10)).toBe(SeverityNumber.TRACE);
    expect(mapPinoLevelToSeverity(30)).toBe(SeverityNumber.INFO);
    expect(mapPinoLevelToSeverity(50)).toBe(SeverityNumber.ERROR);
    expect(mapPinoLevelToSeverity(60)).toBe(SeverityNumber.FATAL);

    const logExporter = new InMemoryLogRecordExporter();
    const loggerProvider = new LoggerProvider({
      processors: [new SimpleLogRecordProcessor({ exporter: logExporter })],
    });
    (logs as any).setGlobalLoggerProvider(loggerProvider);
    try {
      const chunks: string[] = [];
      const stream = multistream([{ stream: memoryStream(chunks) }, { stream: new OtlpBridgeStream() }]);
      const logger = pino(buildPinoOptions() as any, stream as any);
      logger.error({ googlePlacesKey: "secret-key", "X-Goog-Api-Key": "secret-key-2" }, "google details failed");
      await loggerProvider.forceFlush();
      // Stdout side is untouched redacted JSON.
      const line = chunks.join("").split("\n").find((l) => l.includes("google details failed"));
      expect(line).toBeDefined();
      expect(() => JSON.parse(line!)).not.toThrow();
      expect(line!).not.toContain("secret-key");
      // And the record reached the Logs SDK pipeline without the secret.
      const records = logExporter.getFinishedLogRecords();
      expect(records.length).toBeGreaterThan(0);
      const last = records[records.length - 1] as any;
      expect(last.severityNumber).toBe(SeverityNumber.ERROR);
      expect(JSON.stringify(last.attributes ?? "")).not.toContain("secret-key");
    } finally {
      (logs as any).disable?.();
      await loggerProvider.shutdown().catch(() => {});
    }
  });
});
