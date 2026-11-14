import { SpanStatusCode, trace, type Attributes } from "@opentelemetry/api";
import { sanitizeAttributes } from "./sanitize.js";

/** Run fn inside an active span with sanitized attributes; records errors. */
export async function withSpan<T>(
  name: string,
  attrs: Record<string, unknown>,
  fn: (span: any) => Promise<T>
): Promise<T> {
  // Resolve the tracer lazily so tests (and re-init) that swap the global
  // provider always use the current one instead of a stale cached instance.
  const liveTracer = trace.getTracer("places");
  const safe = sanitizeAttributes(attrs) as Attributes;
  return liveTracer.startActiveSpan(name, { attributes: safe }, async (span: any) => {
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err: any) {
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR, message: err?.message ?? "error" });
      throw err;
    } finally {
      span.end();
    }
  });
}
