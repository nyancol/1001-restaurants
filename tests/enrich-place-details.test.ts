import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildApp } from "../src/app.js";
import { signSession } from "../src/auth/session.js";
import { isOpenAt } from "../src/places/open.js";

const SECRET = "test-secret-12345678901234567890";

async function makeApp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "oyster-enrich-"));
  const config: any = {
    port: 0, host: "127.0.0.1", nodeEnv: "test",
    databasePath: path.join(dir, "app.db"),
    sessionSecret: SECRET, cookieSecure: false,
    oidcIssuer: "", oidcClientId: "", oidcClientSecret: "",
    oidcRedirectUri: "http://localhost:3000/api/auth/callback",
    oidcEnabled: false, googlePlacesKey: "test-key", trustProxy: false,
  };
  const { app } = await buildApp({ config, skipOidcDiscovery: true });
  const cookie = `oyster_session=${await signSession(SECRET, "u1")}`;
  return { app, dir, cookie };
}

describe("enrich-place-details", () => {
  let app: any; let dir: string; let cookie: string;
  beforeEach(async () => ({ app, dir, cookie } = await makeApp()));
  afterEach(async () => { await app?.close(); fs.rmSync(dir, { recursive: true, force: true }); });

  it("requires placeType and normalizes it", async () => {
    const missing = await app.inject({ method: "POST", url: "/api/places", headers: { cookie }, payload: { name: "No type" } });
    expect(missing.statusCode).toBe(400);
    const ok = await app.inject({ method: "POST", url: "/api/places", headers: { cookie }, payload: { name: "Typed", placeType: "  BAR " } });
    expect(ok.statusCode).toBe(201);
    expect(ok.json().placeType).toBe("bar");
  });

  it("suggests place types globally", async () => {
    await app.inject({ method: "POST", url: "/api/places", headers: { cookie }, payload: { name: "A", placeType: "restaurant" } });
    await app.inject({ method: "POST", url: "/api/places", headers: { cookie }, payload: { name: "B", placeType: "café" } });
    const res = await app.inject({ method: "GET", url: "/api/place-types?q=caf", headers: { cookie } });
    expect(res.statusCode).toBe(200);
    expect(res.json().placeTypes.some((t: any) => t.type === "café")).toBe(true);
    const unauth = await app.inject({ method: "GET", url: "/api/place-types" });
    expect(unauth.statusCode).toBe(401);
  });

  it("round-trips enrichment snapshot and filters by type", async () => {
    const hours = { periods: [{ open: { day: 2, hour: 12, minute: 0 }, close: { day: 2, hour: 14, minute: 0 } }], weekdayDescriptions: ["Tue: 12-14"] };
    const created = await app.inject({
      method: "POST", url: "/api/places", headers: { cookie },
      payload: { name: "Enriched", placeType: "restaurant", hours, businessStatus: "OPERATIONAL", priceLevel: "MODERATE", priceRange: { min: 10, max: 20 }, googleRating: 4.3, googleRatingCount: 1200, websiteUri: "https://ex.example", mapsLinks: { placeUri: "https://maps.example/p" } },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().googleRating).toBe(4.3);
    const filtered = await app.inject({ method: "GET", url: "/api/places?placeType=restaurant", headers: { cookie } });
    expect(filtered.json().places.length).toBe(1);
    const other = await app.inject({ method: "GET", url: "/api/places?placeType=bar", headers: { cookie } });
    expect(other.json().places.length).toBe(0);
  });

  it("open filter hides unknown hours and closed statuses", async () => {
    // Tuesday 13:00 local (periods are evaluated in server-local time)
    const openAt = new Date(2026, 4, 5, 13, 0, 0).toISOString();
    const hours = { periods: [{ open: { day: 2, hour: 12, minute: 0 }, close: { day: 2, hour: 14, minute: 0 } }], weekdayDescriptions: ["Tue"] };
    await app.inject({ method: "POST", url: "/api/places", headers: { cookie }, payload: { name: "Open", placeType: "bar", hours } });
    await app.inject({ method: "POST", url: "/api/places", headers: { cookie }, payload: { name: "NoHours", placeType: "bar" } });
    await app.inject({ method: "POST", url: "/api/places", headers: { cookie }, payload: { name: "PermClosed", placeType: "bar", hours, businessStatus: "CLOSED_PERMANENTLY" } });
    const res = await app.inject({ method: "GET", url: `/api/places?openAt=${encodeURIComponent(openAt)}`, headers: { cookie } });
    const names = res.json().places.map((p: any) => p.name);
    expect(names).toContain("Open");
    expect(names).not.toContain("NoHours");
    expect(names).not.toContain("PermClosed");
  });

  it("isOpenAt handles overnight spans", async () => {
    const periods = [{ open: { day: 2, hour: 18, minute: 0 }, close: { day: 3, hour: 2, minute: 0 } }];
    // Tuesday 20:00 local
    const tue = new Date(2026, 4, 5, 20, 0, 0);
    expect(isOpenAt(periods, tue)).toBe(true);
    const wedEarly = new Date(2026, 4, 6, 1, 0, 0);
    expect(isOpenAt(periods, wedEarly)).toBe(true);
    const wedLate = new Date(2026, 4, 6, 10, 0, 0);
    expect(isOpenAt(periods, wedLate)).toBe(false);
  });
});
