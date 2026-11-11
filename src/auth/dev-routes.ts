import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { AppConfig } from "../config.js";
import { users } from "../db/schema.js";
import { signSession, sessionCookieName } from "./session.js";

const NAME_RE = /^[a-zA-Z0-9_-]{1,32}$/;

/**
 * Dev-only stub login. The caller MUST double-gate registration:
 * only register when `config.devLoginEnabled` is true (DEV_LOGIN=true
 * AND non-production). In production this route must not exist at all.
 *
 * Mints a real session through the same mechanism as the OIDC callback
 * (users upsert by `sub`, jose-signed cookie) so everything downstream
 * (owner scoping, 403s) behaves identically. Stub identities use
 * `sub = "dev:<name>"` so they are distinguishable from OIDC users.
 */
export function registerDevLoginRoute(app: FastifyInstance, deps: { config: AppConfig; db: any }) {
  const { config, db } = deps;

  // Side-effect-free probe so the UI can show a dev-login form only when
  // this route exists. Unregistered (404) in production — same gating.
  app.get("/api/auth/dev-login", async () => ({ enabled: true }));

  app.post("/api/auth/dev-login", {
    schema: {
      body: {
        type: "object",
        properties: { user: { type: "string" } },
      },
    },
  }, async (req, reply) => {
    const name = ((req.body as any)?.user ?? "dev").trim() || "dev";
    if (!NAME_RE.test(name)) {
      return reply.code(400).send({ error: "invalid_user_name" });
    }
    const sub = `dev:${name.toLowerCase()}`;
    const now = Date.now();
    const existing = await db.select().from(users).where(eq(users.sub, sub)).limit(1);
    let userId: string;
    if (existing.length === 0) {
      userId = randomUUID();
      await db.insert(users).values({ id: userId, sub, displayName: name, createdAt: now, updatedAt: now });
    } else {
      userId = existing[0].id;
      await db.update(users).set({ displayName: name, updatedAt: now }).where(eq(users.id, userId));
    }
    const jwt = await signSession(config.sessionSecret, userId);
    reply.setCookie(sessionCookieName(), jwt, {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 3600,
    });
    req.log.warn({ sub, userId }, "DEV_LOGIN used — test identity only, never enable in production");
    return { id: userId, displayName: name };
  });
}
