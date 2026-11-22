import { describe, expect, it } from "vitest";
import { isRedactedKey, sanitizeAttributes } from "../src/observability/sanitize.js";

describe("sanitizeAttributes", () => {
  it("redacts secret-looking keys case-insensitively", () => {
    const out = sanitizeAttributes({
      "X-Goog-Api-Key": "key-123",
      authorization: "Bearer abc",
      cookie: "oyster_session=abc",
      "set-cookie": "oyster_session=abc",
      OIDC_CLIENT_SECRET: "shhh",
      SESSION_SECRET: "shhh",
      googlePlacesKey: "k",
      "http.route": "/api/v1/places",
      "http.status_code": 200,
    });
    const dump = JSON.stringify(out);
    expect(dump).not.toContain("key-123");
    expect(dump).not.toContain("Bearer abc");
    expect(dump).not.toContain("oyster_session=abc");
    expect(dump).not.toContain("shhh");
    expect(out["X-Goog-Api-Key"]).toBe("[Redacted]");
    expect(out.authorization).toBe("[Redacted]");
    expect(out.cookie).toBe("[Redacted]");
    expect(out["http.route"]).toBe("/api/v1/places");
    expect(out["http.status_code"]).toBe(200);
  });

  it("flags token/secret variants", () => {
    for (const k of [
      "Authorization",
      "COOKIE",
      "access_token",
      "refreshToken",
      "clientSecret",
      "API_KEY",
    ]) {
      expect(isRedactedKey(k)).toBe(true);
    }
    expect(isRedactedKey("http.route")).toBe(false);
    expect(isRedactedKey("peer.service")).toBe(false);
  });
});
