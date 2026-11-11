import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildApp } from "../src/app.js";
import { signSession } from "../src/auth/session.js";

const SECRET = "test-secret-12345678901234567890";

function newApiFetch(calls: any[]): any {
  return async (url: string, init?: any) => {
    calls.push({ url, init });
    if (String(url).includes("places:autocomplete")) {
      return {
        status: 200,
        text: async () =>
          JSON.stringify({
            suggestions: [
              { placePrediction: { placeId: "ChIJ Paris", text: { text: "Paris, France" } } },
            ],
          }),
      };
    }
    if (String(url).includes("/v1/places/")) {
      return {
        status: 200,
        text: async () =>
          JSON.stringify({ id: "ChIJ Paris", displayName: { text: "Paris" } }),
      };
    }
    return {
      status: 200,
      text: async () => JSON.stringify({ results: [{ formatted_address: "Paris" }] }),
    };
  };
}

describe("google proxy (Places API New) with mocked fetch", () => {
  let app: any;
  let dir: string;
  let cookie: string;
  let calls: any[];

  beforeEach(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "oyster-google-"));
    calls = [];
    const config: any = {
      port: 0, host: "127.0.0.1", nodeEnv: "test",
      databasePath: path.join(dir, "app.db"),
      sessionSecret: SECRET, cookieSecure: false, devLoginEnabled: false,
      oidcIssuer: "", oidcClientId: "", oidcClientSecret: "",
      oidcRedirectUri: "http://localhost:3000/api/auth/callback",
      oidcEnabled: false, googlePlacesKey: "test-key", trustProxy: false,
    };
    ({ app } = await buildApp({ config, googleFetch: newApiFetch(calls), skipOidcDiscovery: true }));
    cookie = `oyster_session=${await signSession(SECRET, "u1")}`;
  });

  afterEach(async () => {
    await app?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("proxies autocomplete via POST with key in header, never in URL", async () => {
    const res = await app.inject({ method: "GET", url: "/api/google/autocomplete?q=par", headers: { cookie } });
    expect(res.statusCode).toBe(200);
    expect(res.json().suggestions).toBeTruthy();
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain("places:autocomplete");
    expect(calls[0].init.method).toBe("POST");
    expect(calls[0].init.headers["X-Goog-Api-Key"]).toBe("test-key");
    expect(calls[0].init.headers["X-Goog-FieldMask"]).toContain("placePrediction");
    expect(calls[0].url).not.toContain("test-key");
    expect(JSON.stringify(calls[0].init.body)).not.toContain("test-key");
  });

  it("proxies details with field mask", async () => {
    const res = await app.inject({ method: "GET", url: "/api/google/details?placeId=ChIJParis", headers: { cookie } });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe("ChIJ Paris");
    const mask = calls[0].init.headers["X-Goog-FieldMask"] as string;
    expect(mask).toContain("formattedAddress");
    expect(mask).toContain("regularOpeningHours");
    expect(mask).toContain("priceLevel");
    expect(mask).toContain("userRatingCount");
    expect(mask).toContain("websiteUri");
    expect(mask).toContain("googleMapsLinks");
    expect(calls[0].url).not.toContain("test-key");
  });

  it("requires auth", async () => {
    const res = await app.inject({ method: "GET", url: "/api/google/autocomplete?q=par" });
    expect(res.statusCode).toBe(401);
  });

  it("returns 503 when key missing", async () => {
    const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), "oyster-google2-"));
    const config: any = {
      port: 0, host: "127.0.0.1", nodeEnv: "test",
      databasePath: path.join(dir2, "app.db"),
      sessionSecret: SECRET, cookieSecure: false, devLoginEnabled: false,
      oidcIssuer: "", oidcClientId: "", oidcClientSecret: "",
      oidcRedirectUri: "http://localhost:3000/api/auth/callback",
      oidcEnabled: false, googlePlacesKey: "", trustProxy: false,
    };
    const { app: app2 } = await buildApp({ config, skipOidcDiscovery: true });
    const res = await app2.inject({ method: "GET", url: "/api/google/autocomplete?q=par", headers: { cookie } });
    expect(res.statusCode).toBe(503);
    await app2.close();
    fs.rmSync(dir2, { recursive: true, force: true });
  });
});
