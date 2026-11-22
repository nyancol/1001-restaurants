import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildApp } from "../src/app.js";
import { signSession } from "../src/auth/session.js";
import { TAG_PALETTE } from "../src/tags/palette.js";

const SECRET = "test-secret-12345678901234567890";

async function makeApp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "oyster-tags-"));
  const dbPath = path.join(dir, "app.db");
  const config: any = {
    port: 0, host: "127.0.0.1", nodeEnv: "test", databasePath: dbPath,
    sessionSecret: SECRET, cookieSecure: false,
    oidcIssuer: "", oidcClientId: "", oidcClientSecret: "",
    oidcRedirectUri: "http://localhost:3000/api/auth/callback",
    oidcEnabled: false, googlePlacesKey: "test-key", trustProxy: false,
  };
  const { app } = await buildApp({ config, skipOidcDiscovery: true });
  return { app, dir };
}

async function cookieFor(userId: string) {
  return `oyster_session=${await signSession(SECRET, userId)}`;
}

describe("user-owned colored tags", () => {
  let app: any; let dir: string;
  const ALICE = "alice-tags"; const BOB = "bob-tags";
  beforeEach(async () => { ({ app, dir } = await makeApp()); });
  afterEach(async () => { await app?.close(); fs.rmSync(dir, { recursive: true, force: true }); });

  it("backfills definitions deterministically and leaves tagsJson untouched", async () => {
    const a = await cookieFor(ALICE);
    await app.inject({ method: "POST", url: "/api/v1/places", headers: { cookie: a }, payload: { name: "A1", icon: "fork", tags: ["Cozy", "japonais"] } });
    const tags = (await app.inject({ method: "GET", url: "/api/v1/tags", headers: { cookie: a } })).json().data;
    expect(tags.length).toBe(2);
    for (const t of tags) {
      expect(TAG_PALETTE).toContain(t.color);
      expect(typeof t.count).toBe("number");
    }
    const list = (await app.inject({ method: "GET", url: "/api/v1/places", headers: { cookie: a } })).json().data;
    expect(list[0].tags.sort()).toEqual(["cozy", "japonais"]);
  });

  it("new users start empty; zeros remain selectable", async () => {
    const a = await cookieFor(ALICE);
    expect((await app.inject({ method: "GET", url: "/api/v1/tags", headers: { cookie: a } })).json().data).toEqual([]);
    await app.inject({ method: "POST", url: "/api/v1/tags", headers: { cookie: a }, payload: { name: "solo" } });
    const tags = (await app.inject({ method: "GET", url: "/api/v1/tags", headers: { cookie: a } })).json().data;
    expect(tags).toHaveLength(1);
    expect(tags[0].tag).toBe("solo");
    expect(tags[0].count).toBe(0);
  });

  it("POST validates palette and is idempotent; foreign isolation holds", async () => {
    const a = await cookieFor(ALICE); const b = await cookieFor(BOB);
    const bad = await app.inject({ method: "POST", url: "/api/v1/tags", headers: { cookie: a }, payload: { name: "x", color: "#FFFFFF" } });
    expect(bad.statusCode).toBe(400);
    const c1 = await app.inject({ method: "POST", url: "/api/v1/tags", headers: { cookie: a }, payload: { name: "Cozy ", color: TAG_PALETTE[0] } });
    expect([200, 201]).toContain(c1.statusCode);
    const c2 = await app.inject({ method: "POST", url: "/api/v1/tags", headers: { cookie: a }, payload: { name: "cozy" } });
    expect(c2.json().color).toBe(TAG_PALETTE[0]);
    // Bob unaffected
    const bt = (await app.inject({ method: "GET", url: "/api/v1/tags", headers: { cookie: b } })).json().data;
    expect(bt).toEqual([]);
  });

  it("auto-creates definitions on place save with normalization", async () => {
    const a = await cookieFor(ALICE);
    await app.inject({ method: "POST", url: "/api/v1/places", headers: { cookie: a }, payload: { name: "P1", icon: "fork", tags: [" Ramen "] } });
    const tags = (await app.inject({ method: "GET", url: "/api/v1/tags", headers: { cookie: a } })).json().data;
    expect(tags.find((t: any) => t.tag === "ramen")?.count).toBe(1);
  });

  it("PATCH recolor updates color without touching places", async () => {
    const a = await cookieFor(ALICE);
    await app.inject({ method: "POST", url: "/api/v1/places", headers: { cookie: a }, payload: { name: "P1", icon: "fork", tags: ["cozy"] } });
    const before = (await app.inject({ method: "GET", url: "/api/v1/places", headers: { cookie: a } })).json().data[0];
    const r = await app.inject({ method: "PATCH", url: "/api/v1/tags/cozy", headers: { cookie: a }, payload: { color: TAG_PALETTE[5] } });
    expect(r.statusCode).toBe(200);
    expect(r.json().color).toBe(TAG_PALETTE[5]);
    const after = (await app.inject({ method: "GET", url: "/api/v1/places", headers: { cookie: a } })).json().data[0];
    expect(after.tags).toEqual(before.tags);
    const bad = await app.inject({ method: "PATCH", url: "/api/v1/tags/cozy", headers: { cookie: a }, payload: { color: "red" } });
    expect(bad.statusCode).toBe(400);
  });

  it("PATCH rename rewrites places", async () => {
    const a = await cookieFor(ALICE);
    await app.inject({ method: "POST", url: "/api/v1/places", headers: { cookie: a }, payload: { name: "P1", icon: "fork", tags: ["cozy"] } });
    await app.inject({ method: "POST", url: "/api/v1/places", headers: { cookie: a }, payload: { name: "P2", icon: "fork", tags: ["cozy", "japonais"] } });
    const r = await app.inject({ method: "PATCH", url: "/api/v1/tags/cozy", headers: { cookie: a }, payload: { newName: "cosy" } });
    expect(r.statusCode).toBe(200);
    expect(r.json().tag).toBe("cosy");
    const list = (await app.inject({ method: "GET", url: "/api/v1/places", headers: { cookie: a } })).json().data;
    expect(list.every((p: any) => !p.tags.includes("cozy"))).toBe(true);
    expect(list.find((p: any) => p.name === "P2").tags.sort()).toEqual(["cosy", "japonais"]);
  });

  it("PATCH rename to existing merges, keeps target color, collapses dupes", async () => {
    const a = await cookieFor(ALICE);
    await app.inject({ method: "POST", url: "/api/v1/tags", headers: { cookie: a }, payload: { name: "cosy", color: TAG_PALETTE[1] } });
    await app.inject({ method: "POST", url: "/api/v1/places", headers: { cookie: a }, payload: { name: "P1", icon: "fork", tags: ["cozy", "cosy"] } });
    const r = await app.inject({ method: "PATCH", url: "/api/v1/tags/cozy", headers: { cookie: a }, payload: { newName: "cosy" } });
    expect(r.json().merged).toBe(true);
    expect(r.json().color).toBe(TAG_PALETTE[1]);
    const list = (await app.inject({ method: "GET", url: "/api/v1/places", headers: { cookie: a } })).json().data;
    expect(list[0].tags).toEqual(["cosy"]);
  });

  it("rename enforces ownership (404 for foreign)", async () => {
    const a = await cookieFor(ALICE); const b = await cookieFor(BOB);
    await app.inject({ method: "POST", url: "/api/v1/places", headers: { cookie: a }, payload: { name: "P1", icon: "fork", tags: ["cozy"] } });
    const r = await app.inject({ method: "PATCH", url: "/api/v1/tags/cozy", headers: { cookie: b }, payload: { newName: "cosy" } });
    expect(r.statusCode).toBe(404);
  });

  it("DELETE strips tag from all own places, idempotent for zeros", async () => {
    const a = await cookieFor(ALICE);
    await app.inject({ method: "POST", url: "/api/v1/places", headers: { cookie: a }, payload: { name: "P1", icon: "fork", tags: ["cozy"] } });
    await app.inject({ method: "POST", url: "/api/v1/places", headers: { cookie: a }, payload: { name: "P2", icon: "fork", tags: ["cozy"] } });
    const del = await app.inject({ method: "DELETE", url: "/api/v1/tags/cozy", headers: { cookie: a } });
    expect(del.statusCode).toBe(200);
    const list = (await app.inject({ method: "GET", url: "/api/v1/places", headers: { cookie: a } })).json().data;
    expect(list.every((p: any) => !p.tags.includes("cozy"))).toBe(true);
    const del2 = await app.inject({ method: "DELETE", url: "/api/v1/tags/cozy", headers: { cookie: a } });
    expect(del2.statusCode).toBe(200);
  });
});
