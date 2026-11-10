import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildApp } from "../src/app.js";
import { signSession } from "../src/auth/session.js";

const SECRET = "test-secret-12345678901234567890";

async function makeApp(googleFetch?: any) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "oyster-test-"));
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
  const { app } = await buildApp({ config, googleFetch, skipOidcDiscovery: true });
  return { app, dir };
}

async function cookieFor(userId: string): Promise<string> {
  const jwt = await signSession(SECRET, userId);
  return `oyster_session=${jwt}`;
}

describe("places API auth + ownership", () => {
  let app: any;
  let dir: string;
  const ALICE = "alice-id";
  const BOB = "bob-id";

  beforeEach(async () => {
    ({ app, dir } = await makeApp());
  });

  afterEach(async () => {
    await app?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("rejects unauthenticated GET /api/places with 401", async () => {
    const res = await app.inject({ method: "GET", url: "/api/places" });
    expect(res.statusCode).toBe(401);
  });

  it("rejects unauthenticated GET /api/tags with 401", async () => {
    const res = await app.inject({ method: "GET", url: "/api/tags" });
    expect(res.statusCode).toBe(401);
  });

  it("health is public", async () => {
    const res = await app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json().db).toBe("ok");
  });

  it("create-then-get round trip forces ownerId to session user", async () => {
    const aliceCookie = await cookieFor(ALICE);
    const create = await app.inject({
      method: "POST", url: "/api/places",
      headers: { cookie: aliceCookie },
      payload: { name: "Chez Janou", tags: [" Japonais ", "JAPONAIS"], rating: 4 },
    });
    expect(create.statusCode).toBe(201);
    const body = create.json();
    expect(body.ownerId).toBe(ALICE);
    expect(body.status).toBe("WANT_TO_GO");
    expect(body.tags).toEqual(["japonais"]);

    const get = await app.inject({ method: "GET", url: `/api/places/${body.id}`, headers: { cookie: aliceCookie } });
    expect(get.statusCode).toBe(200);
    expect(get.json().name).toBe("Chez Janou");
  });

  it("rejects invalid rating with 400 and stores nothing", async () => {
    const c = await cookieFor(ALICE);
    const res = await app.inject({
      method: "POST", url: "/api/places", headers: { cookie: c },
      payload: { name: "Bad rating", rating: 9 },
    });
    expect(res.statusCode).toBe(400);
    const list = await app.inject({ method: "GET", url: "/api/places", headers: { cookie: c } });
    expect(list.json().places).toEqual([]);
  });

  it("enforces edit-own with 403; second user can read but not patch/delete", async () => {
    const a = await cookieFor(ALICE);
    const b = await cookieFor(BOB);
    const create = await app.inject({
      method: "POST", url: "/api/places", headers: { cookie: a }, payload: { name: "Alice spot" },
    });
    const id = create.json().id;
    const read = await app.inject({ method: "GET", url: `/api/places/${id}`, headers: { cookie: b } });
    expect(read.statusCode).toBe(200);
    const patch = await app.inject({
      method: "PATCH", url: `/api/places/${id}`, headers: { cookie: b }, payload: { note: "hijack" },
    });
    expect(patch.statusCode).toBe(403);
    const del = await app.inject({ method: "DELETE", url: `/api/places/${id}`, headers: { cookie: b } });
    expect(del.statusCode).toBe(403);
  });

  it("list defaults to own places; owner=all returns others", async () => {
    const a = await cookieFor(ALICE);
    const b = await cookieFor(BOB);
    await app.inject({ method: "POST", url: "/api/places", headers: { cookie: a }, payload: { name: "A1" } });
    await app.inject({ method: "POST", url: "/api/places", headers: { cookie: b }, payload: { name: "B1" } });
    const mine = await app.inject({ method: "GET", url: "/api/places", headers: { cookie: a } });
    expect(mine.json().places.map((p: any) => p.name)).toEqual(["A1"]);
    const all = await app.inject({ method: "GET", url: "/api/places?owner=all", headers: { cookie: a } });
    expect(all.json().places.map((p: any) => p.name).sort()).toEqual(["A1", "B1"]);
    const bobs = await app.inject({ method: "GET", url: `/api/places?owner=${BOB}`, headers: { cookie: a } });
    expect(bobs.json().places.map((p: any) => p.name)).toEqual(["B1"]);
  });

  it("aggregates tags across owners ranked by frequency", async () => {
    const a = await cookieFor(ALICE);
    const b = await cookieFor(BOB);
    await app.inject({ method: "POST", url: "/api/places", headers: { cookie: a }, payload: { name: "A1", tags: ["cozy", "japonais"] } });
    await app.inject({ method: "POST", url: "/api/places", headers: { cookie: b }, payload: { name: "B1", tags: ["cozy", "terrasse"] } });
    const res = await app.inject({ method: "GET", url: "/api/tags?q=co", headers: { cookie: a } });
    expect(res.statusCode).toBe(200);
    const tags = res.json().tags;
    const cozy = tags.find((t: any) => t.tag === "cozy");
    expect(cozy?.count).toBe(2);
  });

  it("openapi.json matches implemented routes", async () => {
    const res = await app.inject({ method: "GET", url: "/api/openapi.json" });
    expect(res.statusCode).toBe(200);
    expect(res.json().paths?.["/api/places"]).toBeTruthy();
  });
});
