import cookie from "@fastify/cookie";
import fastifyStatic from "@fastify/static";
import swagger from "@fastify/swagger";
import Fastify, { type FastifyInstance } from "fastify";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { discoverOidc, registerAuthRoutes } from "./auth/routes.js";
import { registerDevLoginRoute } from "./auth/dev-routes.js";
import { sessionCookieName, verifySession } from "./auth/session.js";
import {
  getBearerToken,
  hasScope,
  isPlacesPath,
  requiredScopeForPlaces,
  verifyPlacesBearer,
  type KeyResolver,
} from "./auth/places-bearer.js";
import { type AppConfig } from "./config.js";
import { dbHealth, openDb, runMigrations } from "./db/index.js";
import { registerGoogleRoutes, type GoogleFetch } from "./google/routes.js";
import { registerPlaceRoutes } from "./places/routes.js";
import { registerUserRoutes } from "./users/routes.js";
import { registerPlaceTypeRoutes } from "./place-types/routes.js";
import { registerTagRoutes } from "./tags/routes.js";

const PUBLIC_PATHS = new Set([
  "/api/health",
  "/api/auth/login",
  "/api/auth/callback",
  "/api/auth/dev-login", // only registered when DEV_LOGIN=true + non-production; 404 otherwise
  "/api/openapi.json",
  "/api/docs",
]);

function isPublic(path: string): boolean {
  if (PUBLIC_PATHS.has(path)) return true;
  if (path.startsWith("/api/docs")) return true;
  return false;
}

export interface BuildOptions {
  config: AppConfig;
  googleFetch?: GoogleFetch;
  skipOidcDiscovery?: boolean;
  placesKeyResolver?: KeyResolver;
}

export async function buildApp(opts: BuildOptions): Promise<{ app: FastifyInstance; oidcFailed?: Error }> {
  const { config } = opts;
  const app = Fastify({ logger: true, trustProxy: config.trustProxy });

  const { sqlite, db } = openDb(config.databasePath);
  runMigrations(sqlite);
  app.decorate("db", db);
  app.decorate("sqlite", sqlite);
  app.addHook("onClose", async () => {
    try { sqlite.close(); } catch { /* ignore */ }
  });

  await app.register(cookie);
  await app.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: { title: "In my Belly API", version: "0.1.0" },
    },
  });

  // Session guard: all /api/* require session except allowlist.
  // M2M Bearer (Pocket ID client-credentials) is accepted on /api/places* only.
  app.addHook("onRequest", async (req, reply) => {
    const urlPath = req.url.split("?")[0];
    if (!urlPath.startsWith("/api/")) return;
    if (isPublic(urlPath)) return;
    const bearer = getBearerToken(req.headers.authorization);
    if (bearer && isPlacesPath(urlPath)) {
      const required = requiredScopeForPlaces(req.method, urlPath);
      let principal: any;
      try {
        const issuer = config.oidcIssuer ?? "";
        principal = await verifyPlacesBearer(bearer, {
          resource: (config as any).placesApiResource ?? "",
          issuer,
          jwksUrl: issuer ? `${issuer.replace(/\/+$/, "")}/.well-known/jwks.json` : "",
          resolveKey: opts.placesKeyResolver,
        });
      } catch (err: any) {
        return reply.code(err?.code === 403 ? 403 : 401).send({ error: "unauthorized" });
      }
      if (required === null) return reply.code(403).send({ error: "forbidden" });
      if (required && !hasScope(principal.scopes, required)) {
        return reply.code(403).send({ error: "forbidden" });
      }
      (req as any).servicePrincipal = principal;
      return;
    }
    const token = req.cookies?.[sessionCookieName()];
    const userId = token ? await verifySession(config.sessionSecret, token) : null;
    if (!userId) return reply.code(401).send({ error: "unauthorized" });
    (req as any).userId = userId;
  });

  app.get("/api/health", async () => {
    const sqliteHandle = (app as any).sqlite;
    return { status: "ok", db: dbHealth(sqliteHandle), time: new Date().toISOString() };
  });

  app.get("/api/openapi.json", async () => app.swagger());

  // OIDC discovery (fail fast on bad issuer unless skipped for tests).
  let oidcConfig: any = null;
  let oidcFailed: Error | undefined;
  if (!opts.skipOidcDiscovery) {
    try {
      oidcConfig = await discoverOidc(config);
      if (oidcConfig) app.log.info(`OIDC discovery ok for issuer ${config.oidcIssuer}`);
      else app.log.warn("OIDC not configured; /api/auth/login will return 503 until OIDC_ISSUER/OIDC_CLIENT_ID are set.");
    } catch (err: any) {
      app.log.error(`Invalid OIDC config: ${err.message}`);
      oidcFailed = err;
    }
  }
  const getOidc = () => oidcConfig;

  registerAuthRoutes(app, { config, db, sqlite, log: app.log }, getOidc);
  if (config.devLoginEnabled) {
    app.log.warn("DEV_LOGIN enabled — POST /api/auth/dev-login mints test sessions. Never enable in production.");
    registerDevLoginRoute(app, { config, db });
  }
  registerPlaceRoutes(app, { db, config, googleFetch: opts.googleFetch });
  registerUserRoutes(app, { db });
  registerPlaceTypeRoutes(app, { db });
  registerTagRoutes(app, { db });
  registerGoogleRoutes(app, { config, googleFetch: opts.googleFetch });

  const here = path.dirname(fileURLToPath(import.meta.url));
  const publicDir = path.resolve(here, "../public");
  let hasIndexHtml = false;
  try {
    const { existsSync } = await import("node:fs");
    hasIndexHtml = existsSync(path.join(publicDir, "index.html"));
  } catch {
    hasIndexHtml = false;
  }
  try {
    await app.register(fastifyStatic, { root: publicDir, prefix: "/" });
  } catch {
    app.get("/", async (_req, reply) => reply.type("text/html").send("<h1>In my Belly</h1><p>Foundation API running.</p>"));
  }
  app.setNotFoundHandler(async (req, reply) => {
    if (req.url.startsWith("/api/")) return reply.code(404).send({ error: "not_found" });
    // SPA fallback: serve the built UI for /add and any non-API route so
    // client-side routing works behind login. Fall back to placeholder only
    // when no built index.html exists (pre-UI).
    if (hasIndexHtml) return (reply as any).sendFile("index.html");
    return reply.type("text/html").send("<h1>In my Belly</h1><p>Foundation API running.</p>");
  });

  return { app, oidcFailed };
}
