import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildApp } from "../src/app.js";
import { signSession } from "../src/auth/session.js";
import packageJson from "../package.json" with { type: "json" };

const SECRET = "test-secret-12345678901234567890";

async function makeApp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "oyster-v1-"));
  const dbPath = path.join(dir, "app.db");
  const config: any = {
    port: 0,
    host: "127.0.0.1",
    nodeEnv: "test",
    databasePath: dbPath,
    sessionSecret: SECRET,
    cookieSecure: false,
    oidcIssuer: "",
    oidcClientId: "",
    oidcClientSecret: "",
    oidcRedirectUri: "http://localhost:3000/api/auth/callback",
    oidcEnabled: false,
    googlePlacesKey: "test-key",
    trustProxy: false,
  };
  const { app } = await buildApp({ config, skipOidcDiscovery: true });
  return { app, dir };
}

async function cookieFor(userId: string): Promise<string> {
  const jwt = await signSession(SECRET, userId);
  return `oyster_session=${jwt}`;
}

describe("api v1 contract", () => {
  let app: any;
  let dir: string;
  const ALICE = "alice-v1";
  beforeEach(async () => {
    ({ app, dir } = await makeApp());
  });
  afterEach(async () => {
    await app?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("returns the full filtered set as { data } on places", async () => {
    const c = await cookieFor(ALICE);
    await app.inject({
      method: "POST",
      url: "/api/v1/places",
      headers: { cookie: c },
      payload: { name: "A1", icon: "fork" },
    });
    await app.inject({
      method: "POST",
      url: "/api/v1/places",
      headers: { cookie: c },
      payload: { name: "A2", icon: "fork" },
    });
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/places?owner=me",
      headers: { cookie: c },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.data.map((p: any) => p.name).sort()).toEqual(["A1", "A2"]);
    expect(body.pagination).toBeUndefined();
  });

  it("ignores stray limit/cursor params on places", async () => {
    const c = await cookieFor(ALICE);
    for (const name of ["S1", "S2", "S3"]) {
      await app.inject({
        method: "POST",
        url: "/api/v1/places",
        headers: { cookie: c },
        payload: { name, icon: "fork" },
      });
    }
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/places?owner=me&limit=1&cursor=nope",
      headers: { cookie: c },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data).toHaveLength(3);
    expect(body.pagination).toBeUndefined();
  });

  it("rejects invalid cursor with 400", async () => {
    const c = await cookieFor(ALICE);
    for (const u of ["/api/v1/tags?cursor=nope", "/api/v1/users?cursor=nope"]) {
      const res = await app.inject({ method: "GET", url: u, headers: { cookie: c } });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe("invalid_cursor");
    }
  });

  it("clamps limit to max and echoes effective value on paginated endpoints", async () => {
    const c = await cookieFor(ALICE);
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/tags?limit=9999",
      headers: { cookie: c },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().pagination.limit).toBe(100);
  });

  it("strict-404s legacy unversioned JSON routes", async () => {
    const c = await cookieFor(ALICE);
    for (const u of ["/api/places", "/api/tags", "/api/users", "/api/openapi.json"]) {
      const res = await app.inject({ method: "GET", url: u, headers: { cookie: c } });
      expect(res.statusCode).toBe(404);
      expect(res.json().error).toBe("not_found");
    }
    const unauth = await app.inject({ method: "GET", url: "/api/places" });
    expect(unauth.statusCode).toBe(404);
  });

  it("serves versioned openapi with package version", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/openapi.json" });
    expect(res.statusCode).toBe(200);
    expect(res.json().info.version).toBe((packageJson as any).version);
    expect(res.json().paths?.["/api/v1/places"]).toBeTruthy();
  });

  it("tags and users return envelope with exact totals", async () => {
    const c = await cookieFor(ALICE);
    await app.inject({
      method: "POST",
      url: "/api/v1/places",
      headers: { cookie: c },
      payload: { name: "T1", icon: "fork", tags: ["cozy"] },
    });
    const tags = await app.inject({ method: "GET", url: "/api/v1/tags", headers: { cookie: c } });
    expect(tags.statusCode).toBe(200);
    expect(Array.isArray(tags.json().data)).toBe(true);
    expect(tags.json().pagination.total).toBe(tags.json().data.length);
    const users = await app.inject({ method: "GET", url: "/api/v1/users", headers: { cookie: c } });
    expect(users.statusCode).toBe(200);
    expect(Array.isArray(users.json().data)).toBe(true);
    expect(typeof users.json().pagination.total).toBe("number");
  });
});
