import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";

const SECRET = "test-secret-12345678901234567890";

function baseConfig(dbPath: string, extra: Record<string, any> = {}): any {
  return {
    port: 0,
    host: "127.0.0.1",
    nodeEnv: "test",
    databasePath: dbPath,
    sessionSecret: SECRET,
    cookieSecure: false,
    devLoginEnabled: false,
    oidcIssuer: "",
    oidcClientId: "",
    oidcClientSecret: "",
    oidcRedirectUri: "http://localhost:3000/api/auth/callback",
    oidcEnabled: false,
    googlePlacesKey: "",
    trustProxy: false,
    ...extra,
  };
}

describe("DEV_LOGIN gating (config)", () => {
  it("is enabled only with DEV_LOGIN=true AND non-production", () => {
    const base = { SESSION_SECRET: SECRET } as any;
    expect(loadConfig({ ...base, DEV_LOGIN: "true", NODE_ENV: "test" }).devLoginEnabled).toBe(true);
    expect(loadConfig({ ...base, DEV_LOGIN: "true", NODE_ENV: "production" }).devLoginEnabled).toBe(false);
    expect(loadConfig({ ...base, NODE_ENV: "test" }).devLoginEnabled).toBe(false);
    expect(loadConfig({ ...base, DEV_LOGIN: "false", NODE_ENV: "test" }).devLoginEnabled).toBe(false);
  });
});

describe("POST /api/auth/dev-login", () => {
  let app: any;
  let dir: string;

  async function start(devLoginEnabled: boolean) {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "oyster-devlogin-"));
    ({ app } = await buildApp({
      config: baseConfig(path.join(dir, "app.db"), { devLoginEnabled }),
      skipOidcDiscovery: true,
    }));
  }

  afterEach(async () => {
    await app?.close();
    app = null;
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  });

  it("mints a working session usable for the full places flow", async () => {
    await start(true);
    const login = await app.inject({
      method: "POST", url: "/api/auth/dev-login", payload: { user: "alice" },
    });
    expect(login.statusCode).toBe(200);
    const setCookie = login.headers["set-cookie"] as string;
    expect(setCookie).toContain("oyster_session=");
    expect(setCookie).toContain("HttpOnly");
    const cookie = (Array.isArray(setCookie) ? setCookie[0] : setCookie).split(";")[0];

    const create = await app.inject({
      method: "POST", url: "/api/places", headers: { cookie }, payload: { name: "Dev spot" },
    });
    expect(create.statusCode).toBe(201);
    expect(create.json().ownerId).toBe(login.json().id);

    // Second dev user can read but gets 403 on edit (same enforcement as OIDC).
    const bobLogin = await app.inject({
      method: "POST", url: "/api/auth/dev-login", payload: { user: "bob" },
    });
    const bobCookie = (bobLogin.headers["set-cookie"] as string).split(";")[0];
    const id = create.json().id;
    expect((await app.inject({ method: "GET", url: `/api/places/${id}`, headers: { cookie: bobCookie } })).statusCode).toBe(200);
    expect((await app.inject({ method: "PATCH", url: `/api/places/${id}`, headers: { cookie: bobCookie }, payload: { note: "x" } })).statusCode).toBe(403);
  });

  it("is stable across logins (same user id) and rejects bad names", async () => {
    await start(true);
    const first = await app.inject({ method: "POST", url: "/api/auth/dev-login", payload: { user: "alice" } });
    const second = await app.inject({ method: "POST", url: "/api/auth/dev-login", payload: { user: "alice" } });
    expect(second.json().id).toBe(first.json().id);
    const bad = await app.inject({ method: "POST", url: "/api/auth/dev-login", payload: { user: "../../etc" } });
    expect(bad.statusCode).toBe(400);
  });

  it("does not exist when disabled (404, not 403)", async () => {
    await start(false);
    const res = await app.inject({ method: "POST", url: "/api/auth/dev-login", payload: { user: "alice" } });
    expect(res.statusCode).toBe(404);
  });
});
