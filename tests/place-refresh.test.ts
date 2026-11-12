import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { generateKeyPair, SignJWT } from "jose";
import { buildApp } from "../src/app.js";
import { signSession } from "../src/auth/session.js";
import {
  getBearerToken,
  hasScope,
  isPlacesPath,
  requiredScopeForPlaces,
  verifyPlacesBearer,
} from "../src/auth/places-bearer.js";

const SECRET = "test-secret-12345678901234567890";
const RESOURCE = "https://places.test.homelab";
const ISSUER = "https://id.test.example.com";
const ALICE = "alice-id";
const BOB = "bob-id";

async function cookieFor(userId: string): Promise<string> {
  const jwt = await signSession(SECRET, userId);
  return `oyster_session=${jwt}`;
}

function detailsBody() {
  return {
    businessStatus: "OPERATIONAL",
    rating: 4.5,
    userRatingCount: 1380,
    websiteUri: "https://fresh.example.com",
    priceLevel: "PRICE_LEVEL_MODERATE",
    priceRange: { startPrice: { units: "10" }, endPrice: { units: "30" } },
    googleMapsLinks: { placeUri: "https://maps.example.com/fresh" },
    utcOffsetMinutes: 60,
    regularOpeningHours: {
      periods: [{ openDay: 1, openHour: 9 }],
      weekdayDescriptions: ["Mon: 9-5"],
    },
  };
}

function googleFetchOk(calls: any[], body: any = detailsBody()) {
  return async (url: string, init?: any) => {
    calls.push({ url, init });
    return { ok: true, status: 200, json: async () => body };
  };
}

async function mintToken(
  privateKey: any,
  opts: { aud?: any; scope?: string; exp?: string; sub?: string } = {},
): Promise<string> {
  return new SignJWT({ scope: opts.scope ?? "read:places refresh:places" })
    .setProtectedHeader({ alg: "RS256", kid: "test" })
    .setIssuer(ISSUER)
    .setAudience(opts.aud ?? RESOURCE)
    .setSubject(opts.sub ?? "client-hermes")
    .setExpirationTime(opts.exp ?? "5m")
    .sign(privateKey);
}

describe("places-bearer helper", () => {
  it("parses bearer, paths, and scope mapping", () => {
    expect(getBearerToken("Bearer abc")).toBe("abc");
    expect(getBearerToken("nope")).toBeNull();
    expect(getBearerToken(undefined)).toBeNull();
    expect(isPlacesPath("/api/places")).toBe(true);
    expect(isPlacesPath("/api/places/x/refresh")).toBe(true);
    expect(isPlacesPath("/api/users")).toBe(false);
    expect(requiredScopeForPlaces("GET", "/api/places")).toBe("read:places");
    expect(requiredScopeForPlaces("GET", "/api/places/x")).toBe("read:places");
    expect(requiredScopeForPlaces("POST", "/api/places/x/refresh")).toBe("refresh:places");
    expect(requiredScopeForPlaces("PATCH", "/api/places/x")).toBeNull();
    expect(requiredScopeForPlaces("POST", "/api/places")).toBeNull();
    expect(requiredScopeForPlaces("DELETE", "/api/places/x")).toBeNull();
    expect(hasScope(["read:places"], "read:places")).toBe(true);
    expect(hasScope(["read:places"], "refresh:places")).toBe(false);
  });

  it("verifies valid token and rejects expired / wrong-audience", async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    const resolveKey = async () => publicKey as any;
    const good = await mintToken(privateKey);
    const principal = await verifyPlacesBearer(good, {
      resource: RESOURCE,
      issuer: ISSUER,
      resolveKey,
    });
    expect(principal.clientId).toBe("hermes");
    expect(principal.scopes).toEqual(["read:places", "refresh:places"]);

    const expired = await mintToken(privateKey, { exp: "-5m" });
    await expect(
      verifyPlacesBearer(expired, { resource: RESOURCE, issuer: ISSUER, resolveKey }),
    ).rejects.toMatchObject({ code: 401 });

    const wrongAud = await mintToken(privateKey, { aud: "https://other.example.com" });
    await expect(
      verifyPlacesBearer(wrongAud, { resource: RESOURCE, issuer: ISSUER, resolveKey }),
    ).rejects.toMatchObject({ code: 401 });

    // missing scope still verifies (scope enforced by caller) but hasScope is false
    const readOnly = await mintToken(privateKey, { scope: "read:places" });
    const p2 = await verifyPlacesBearer(readOnly, {
      resource: RESOURCE,
      issuer: ISSUER,
      resolveKey,
    });
    expect(hasScope(p2.scopes, "refresh:places")).toBe(false);
  });
});

describe("POST /api/places/:id/refresh", () => {
  let app: any;
  let dir: string;
  let calls: any[];
  let publicKey: any;
  let privateKey: any;

  async function makeRefreshApp(overrides: any = {}) {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "oyster-refresh-"));
    calls = [];
    ({ publicKey, privateKey } = await generateKeyPair("RS256"));
    const config: any = {
      port: 0,
      host: "127.0.0.1",
      nodeEnv: "test",
      databasePath: path.join(dir, "app.db"),
      sessionSecret: SECRET,
      cookieSecure: false,
      oidcIssuer: "",
      oidcClientId: "",
      oidcClientSecret: "",
      oidcRedirectUri: "http://localhost:3000/api/auth/callback",
      oidcEnabled: false,
      googlePlacesKey: "test-key",
      placesApiResource: RESOURCE,
      oidcIssuer: ISSUER,
      trustProxy: false,
      ...overrides,
    };
    const gfetch = overrides.googlePlacesKey === "" ? undefined : googleFetchOk(calls);
    const built = await buildApp({
      config,
      googleFetch: (gfetch ?? (async () => ({ ok: true, status: 200, json: async () => detailsBody() }))) as any,
      skipOidcDiscovery: true,
      placesKeyResolver: async () => publicKey,
    });
    app = built.app;
  }

  async function createPlace(cookie: string, payload: any): Promise<any> {
    const res = await app.inject({
      method: "POST",
      url: "/api/places",
      headers: { cookie },
      payload,
    });
    expect(res.statusCode).toBe(201);
    return res.json();
  }

  afterEach(async () => {
    await app?.close();
    app = undefined;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("refresh rewrites snapshot only and bumps updatedAt (owner cookie)", async () => {
    await makeRefreshApp();
    const a = await cookieFor(ALICE);
    const created = await createPlace(a, {
      name: "My label",
      placeType: "restaurant",
      googlePlaceId: "ChIJ123",
      address: "Old address",
      note: "anniversary?",
      rating: 5,
      businessStatus: "OPERATIONAL",
      googleRating: 4.3,
      googleRatingCount: 1200,
    });
    const before = created.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    const res = await app.inject({ method: "POST", url: `/api/places/${created.id}/refresh`, headers: { cookie: a } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.googleRating).toBe(4.5);
    expect(body.googleRatingCount).toBe(1380);
    expect(body.websiteUri).toBe("https://fresh.example.com");
    expect(body.updatedAt).toBeGreaterThan(before);
    // user fields preserved
    expect(body.name).toBe("My label");
    expect(body.address).toBe("Old address");
    expect(body.note).toBe("anniversary?");
    expect(body.rating).toBe(5);
    expect(body.googlePlaceId).toBe("ChIJ123");
    // key sent as path, secret in header
    expect(calls[0].url).toContain(encodeURIComponent("ChIJ123"));
    expect(calls[0].init.headers["X-Goog-Api-Key"]).toBe("test-key");
  });

  it("rejects other-owner cookie with 403", async () => {
    await makeRefreshApp();
    const a = await cookieFor(ALICE);
    const b = await cookieFor(BOB);
    const created = await createPlace(a, { name: "A1", placeType: "restaurant", googlePlaceId: "ChIJ123" });
    const res = await app.inject({ method: "POST", url: `/api/places/${created.id}/refresh`, headers: { cookie: b } });
    expect(res.statusCode).toBe(403);
  });

  it("returns 404 for unknown id and 422 without googlePlaceId", async () => {
    await makeRefreshApp();
    const a = await cookieFor(ALICE);
    const missing = await app.inject({ method: "POST", url: "/api/places/nope/refresh", headers: { cookie: a } });
    expect(missing.statusCode).toBe(404);
    const manual = await createPlace(a, { name: "Manual", placeType: "bar" });
    const res = await app.inject({ method: "POST", url: `/api/places/${manual.id}/refresh`, headers: { cookie: a } });
    expect(res.statusCode).toBe(422);
  });

  it("returns 503 when Google key missing", async () => {
    await makeRefreshApp({ googlePlacesKey: "" });
    const a = await cookieFor(ALICE);
    // create needs no google key; inject directly since googleFetch unused for create
    const created = await createPlace(a, { name: "A1", placeType: "restaurant", googlePlaceId: "ChIJ123" });
    const res = await app.inject({ method: "POST", url: `/api/places/${created.id}/refresh`, headers: { cookie: a } });
    expect(res.statusCode).toBe(503);
  });

  it("relays 429/502 without DB write", async () => {
    await makeRefreshApp();
    const a = await cookieFor(ALICE);
    const created = await createPlace(a, {
      name: "A1",
      placeType: "restaurant",
      googlePlaceId: "ChIJ123",
      googleRating: 4.3,
    });
    // force 429
    (app as any);
    await app.close();
    fs.rmSync(dir, { recursive: true, force: true });
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "oyster-refresh429-"));
    const rateLimitedFetch = async () => ({ ok: false, status: 429, json: async () => ({}) });
    const config: any = {
      port: 0, host: "127.0.0.1", nodeEnv: "test",
      databasePath: path.join(dir, "app.db"),
      sessionSecret: SECRET, cookieSecure: false,
      oidcIssuer: "", oidcClientId: "", oidcClientSecret: "",
      oidcRedirectUri: "http://localhost:3000/api/auth/callback",
      oidcEnabled: false, googlePlacesKey: "test-key",
      placesApiResource: RESOURCE,
      oidcIssuer: ISSUER, trustProxy: false,
    };
    ({ app } = await buildApp({
      config,
      googleFetch: rateLimitedFetch as any,
      skipOidcDiscovery: true,
      placesKeyResolver: async () => publicKey,
    }));
    const created2 = await createPlace(a, { name: "B1", placeType: "bar", googlePlaceId: "ChIJ999", googleRating: 3.1 });
    const r429 = await app.inject({ method: "POST", url: `/api/places/${created2.id}/refresh`, headers: { cookie: a } });
    expect(r429.statusCode).toBe(429);
    const after = await app.inject({ method: "GET", url: `/api/places/${created2.id}`, headers: { cookie: a } });
    expect(after.json().googleRating).toBe(3.1);
    void created;
  });

  it("M2M authz matrix", async () => {
    await makeRefreshApp();
    const a = await cookieFor(ALICE);
    const created = await createPlace(a, { name: "A1", placeType: "restaurant", googlePlaceId: "ChIJ123" });
    const both = await mintToken(privateKey);
    const readOnly = await mintToken(privateKey, { scope: "read:places" });
    const refreshOnly = await mintToken(privateKey, { scope: "refresh:places" });
    const wrongAud = await mintToken(privateKey, { aud: "https://other.example.com" });

    // read:places lists all without cookie
    const list = await app.inject({ method: "GET", url: "/api/places?owner=all", headers: { authorization: `Bearer ${both}` } });
    expect(list.statusCode).toBe(200);
    expect(list.json().places.length).toBe(1);

    // refresh:places works cross-user (bob token on alice row)
    const cross = await app.inject({
      method: "POST",
      url: `/api/places/${created.id}/refresh`,
      headers: { authorization: `Bearer ${both}` },
    });
    expect(cross.statusCode).toBe(200);
    expect(cross.json().googleRating).toBe(4.5);

    // missing scope -> 403
    const noScope = await app.inject({
      method: "POST",
      url: `/api/places/${created.id}/refresh`,
      headers: { authorization: `Bearer ${readOnly}` },
    });
    expect(noScope.statusCode).toBe(403);
    const readDenied = await app.inject({
      method: "GET",
      url: "/api/places?owner=all",
      headers: { authorization: `Bearer ${refreshOnly}` },
    });
    expect(readDenied.statusCode).toBe(403);

    // bad / wrong-aud -> 401
    const bad = await app.inject({
      method: "GET",
      url: "/api/places?owner=all",
      headers: { authorization: "Bearer not-a-token" },
    });
    expect(bad.statusCode).toBe(401);
    const badAud = await app.inject({
      method: "GET",
      url: "/api/places?owner=all",
      headers: { authorization: `Bearer ${wrongAud}` },
    });
    expect(badAud.statusCode).toBe(401);

    // Bearer ignored outside Places API
    const users = await app.inject({
      method: "GET",
      url: "/api/users",
      headers: { authorization: `Bearer ${both}` },
    });
    expect(users.statusCode).toBe(401);

    // M2M cannot use user-only writes
    const patch = await app.inject({
      method: "PATCH",
      url: `/api/places/${created.id}`,
      headers: { authorization: `Bearer ${both}` },
      payload: { note: "x" },
    });
    expect(patch.statusCode).toBe(403);
    const del = await app.inject({
      method: "DELETE",
      url: `/api/places/${created.id}`,
      headers: { authorization: `Bearer ${both}` },
    });
    expect(del.statusCode).toBe(403);
  });
});
