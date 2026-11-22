import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import type { AppConfig } from "./config.js";

const STATE_CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function originOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.origin;
  } catch {
    return null;
  }
}

/** True when the request's Origin/Referer matches the deployed origin or Host. */
export function isSameOrigin(req: any, appOrigin: string): boolean {
  const origin = req.headers?.origin as string | undefined;
  const referer = req.headers?.referer as string | undefined;
  if (!origin && !referer) return true; // non-browser (curl, tests, server-to-server)
  const expected = new Set<string>([appOrigin.replace(/\/+$/, "")]);
  try {
    const host = (req.headers?.host ?? req.host ?? "") as string;
    if (host) {
      expected.add(`https://${host}`);
      expected.add(`http://${host}`);
    }
  } catch {
    /* ignore */
  }
  const o = originOf(origin);
  if (o) return expected.has(o);
  const r = originOf(referer);
  if (r) return expected.has(r);
  return false;
}

/**
 * Enterprise defaults for a same-origin SPA + JSON API:
 * - helmet: HSTS (prod), noSniff, frameguard deny, referrer-policy, CSP
 * - global rate limit (high, anti-abuse) + tighter per-route limits on
 *   auth + Google proxy (billing abuse)
 * - CSRF: Origin/Referer check on state-changing /api/* with cookie auth.
 *   Bearer (M2M) is not cookie-based -> exempt.
 */
export async function registerSecurity(app: FastifyInstance, config: AppConfig): Promise<void> {
  const isProd = config.nodeEnv === "production";
  const isTest = config.nodeEnv === "test";

  await app.register(helmet, {
    hsts: isProd ? { maxAge: 15552000, includeSubDomains: true, preload: true } : false,
    frameguard: { action: "deny" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // Vite + Tailwind need inline styles; scripts stay 'self'-only.
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        // MapLibre raster tiles (default OSM) + data:/blob: workers.
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", "https:"],
        workerSrc: ["'self'", "blob:"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    // Cross-Origin-Opener/Resource policies break nothing for same-origin SPA.
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "same-origin" },
  });

  // No CORS: API is same-origin only (prod serves / + /api/*, dev uses Vite proxy).
  // Explicitly do NOT register @fastify/cors.

  await app.register(rateLimit, {
    global: true,
    max: isTest ? 10000 : Number(process.env.RATE_LIMIT_GLOBAL_MAX ?? 600),
    timeWindow: "1 minute",
    keyGenerator: (req: any) => (req.ip ?? req.headers["x-forwarded-for"] ?? "anon") as string,
    errorResponseBuilder: () => ({ error: "rate_limited" }),
  });

  // CSRF guard: state-changing API calls presenting cookies must be same-origin.
  app.addHook("onRequest", async (req, reply) => {
    const urlPath = req.url.split("?")[0];
    if (!urlPath.startsWith("/api/")) return;
    if (!STATE_CHANGING.has(req.method)) return;
    // M2M bearer is Authorization-header based, not ambient cookies -> exempt.
    if (req.headers.authorization?.startsWith("Bearer ")) return;
    if (!req.headers.cookie) return; // no ambient credential -> nothing to forge
    if (!isSameOrigin(req, config.appOrigin)) {
      return reply.code(403).send({ error: "forbidden" });
    }
  });
}

/** Per-route rate-limit presets. Spread into route `config`. */
export const rateLimitPresets = {
  /** Login/callback/dev-login: brute-force protection. */
  auth: { rateLimit: { max: 30, timeWindow: "1 minute" } },
  /** Google proxy: per-key billing abuse protection. */
  google: { rateLimit: { max: 120, timeWindow: "1 minute" } },
} as const;
