import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import * as client from "openid-client";
import type { AppConfig } from "../config.js";
import { users } from "../db/schema.js";
import { signSession, sessionCookieName } from "./session.js";
import { eq } from "drizzle-orm";

interface OidcDeps {
  config: AppConfig;
  db: any;
  sqlite: any;
  log: any;
}

/** Discover OIDC config at boot; throws with a clear message on failure (fail-fast). */
export async function discoverOidc(config: AppConfig): Promise<client.Configuration | null> {
  if (!config.oidcEnabled) return null;
  try {
    return await client.discovery(
      new URL(config.oidcIssuer),
      config.oidcClientId,
      config.oidcClientSecret || undefined
    );
  } catch (err: any) {
    throw new Error(
      `Invalid OIDC config: discovery failed for issuer "${config.oidcIssuer}" — ${err?.message ?? err}. Check OIDC_ISSUER/OIDC_CLIENT_ID/OIDC_REDIRECT_URI.`
    );
  }
}

const pkceStore = new Map<string, { verifier: string; state: string }>();

export function registerAuthRoutes(app: FastifyInstance, deps: OidcDeps, getOidc: () => client.Configuration | null) {
  const { config, db } = deps;

  app.get("/api/auth/login", async (req, reply) => {
    const oidc = getOidc();
    if (!oidc) return reply.code(503).send({ error: "auth_not_configured" });
    const verifier = client.randomPKCECodeVerifier();
    const challenge = await client.calculatePKCECodeChallenge(verifier);
    const state = randomUUID();
    pkceStore.set(state, { verifier, state });
    const url = client.buildAuthorizationUrl(oidc, {
      redirect_uri: config.oidcRedirectUri,
      scope: "openid profile email",
      code_challenge: challenge,
      code_challenge_method: "S256",
      state,
    });
    return reply.redirect(url.href);
  });

  app.get("/api/auth/callback", async (req, reply) => {
    const oidc = getOidc();
    if (!oidc) return reply.code(503).send({ error: "auth_not_configured" });
    const url = new URL(req.url, "http://localhost");
    const fullUrl = new URL(`${req.protocol}://${req.host}${req.url}`);
    void url;
    const state = (req.query as any)?.state as string | undefined;
    const stored = state ? pkceStore.get(state) : undefined;
    try {
      const tokens = await client.authorizationCodeGrant(oidc, fullUrl, {
        pkceCodeVerifier: stored?.verifier,
        expectedState: stored ? state : undefined,
      });
      const claims = tokens.claims();
      if (!claims?.sub) return reply.code(401).send({ error: "invalid_token" });
      const sub = claims.sub;
      const displayName =
        (claims as any).preferred_username ?? (claims as any).name ?? (claims as any).email ?? null;
      const now = Date.now();
      const existing = await db.select().from(users).where(eq(users.sub, sub)).limit(1);
      let userId: string;
      if (existing.length === 0) {
        userId = randomUUID();
        await db.insert(users).values({ id: userId, sub, displayName, createdAt: now, updatedAt: now });
      } else {
        userId = existing[0].id;
        await db.update(users).set({ displayName, updatedAt: now }).where(eq(users.id, userId));
      }
      if (state) pkceStore.delete(state);
      const jwt = await signSession(config.sessionSecret, userId);
      reply.setCookie(sessionCookieName(), jwt, {
        httpOnly: true,
        secure: config.cookieSecure,
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 3600,
      });
      return reply.redirect("/");
    } catch (err: any) {
      req.log.error({ err }, "OIDC callback failed");
      return reply.code(401).send({ error: "login_failed" });
    }
  });

  app.post("/api/auth/logout", async (req, reply) => {
    reply.clearCookie(sessionCookieName(), { path: "/" });
    return { ok: true };
  });

  app.get("/api/auth/me", async (req, reply) => {
    const userId = (req as any).userId as string | undefined;
    if (!userId) return reply.code(401).send({ error: "unauthorized" });
    const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (rows.length === 0) return reply.code(401).send({ error: "unauthorized" });
    return { id: rows[0].id, displayName: rows[0].displayName };
  });
}
