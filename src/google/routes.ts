import type { FastifyInstance } from "fastify";
import type { AppConfig } from "../config.js";
import { withSpan } from "../observability/trace.js";
import { rateLimitPresets } from "../security.js";

export type GoogleFetch = typeof fetch;

/**
 * Server-side Google proxy. The API key is only ever sent Google-ward
 * (header, never URL) and never exposed to the browser.
 *
 * - autocomplete/details use Places API (New):
 *   https://places.googleapis.com/v1/places:autocomplete (POST)
 *   https://places.googleapis.com/v1/places/{placeId} (GET)
 *   with minimal X-Goog-FieldMask to keep responses (and billing SKUs) lean.
 * - geocode uses the Geocoding API (legacy endpoint, still current for geocoding).
 */
export function registerGoogleRoutes(
  app: FastifyInstance,
  deps: { config: AppConfig; googleFetch?: GoogleFetch }
) {
  const { config } = deps;
  const gfetch: GoogleFetch = deps.googleFetch ?? fetch;

  const autocompleteMask = [
    "suggestions.placePrediction.placeId",
    "suggestions.placePrediction.text",
    "suggestions.placePrediction.structuredFormat",
  ].join(",");

  const detailsMask = [
    "id",
    "displayName",
    "formattedAddress",
    "shortFormattedAddress",
    "location",
    "types",
    "primaryType",
    "primaryTypeDisplayName",
    "businessStatus",
    "googleMapsUri",
    "googleMapsLinks",
    "regularOpeningHours",
    "currentOpeningHours",
    "priceLevel",
    "priceRange",
    "rating",
    "userRatingCount",
    "nationalPhoneNumber",
    "internationalPhoneNumber",
    "websiteUri",
    "utcOffsetMinutes",
    "timeZone",
  ].join(",");

  function requireKey(reply: any): boolean {
    if (!config.googlePlacesKey) {
      reply.code(503).send({ error: "google_not_configured" });
      return false;
    }
    return true;
  }

  async function relay(res: Response, reply: any) {
    // Relay upstream status + JSON body (upstream error payload included).
    const body = await res.text();
    reply.code(res.status);
    try {
      return reply.send(JSON.parse(body));
    } catch {
      return reply.send(body);
    }
  }

  app.get("/api/v1/google/autocomplete", { config: rateLimitPresets.google }, async (req, reply) => {
    if (!requireKey(reply)) return;
    const query = req.query as any;
    const q = query?.q ?? query?.input;
    if (!q) return reply.code(400).send({ error: "q is required" });
    if (typeof q !== "string" || q.length > 200) return reply.code(400).send({ error: "invalid_q" });
    const body: Record<string, unknown> = { input: q };
    if (query.sessionToken) {
      if (typeof query.sessionToken !== "string" || query.sessionToken.length > 128) {
        return reply.code(400).send({ error: "invalid_session_token" });
      }
      body.sessionToken = query.sessionToken;
    }
    try {
      const res = await withSpan(
        "google.autocomplete",
        { "peer.service": "places.googleapis.com", endpoint: "places:autocomplete" },
        async (span: any) =>
          gfetch("https://places.googleapis.com/v1/places:autocomplete", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": config.googlePlacesKey,
              "X-Goog-FieldMask": autocompleteMask,
            },
            body: JSON.stringify(body),
          }).then((r: Response) => {
            span.setAttribute("http.status_code", r.status);
            return r;
          })
      );
      return relay(res, reply);
    } catch (err) {
      req.log.error({ err }, "google autocomplete failed");
      return reply.code(502).send({ error: "google_unavailable" });
    }
  });

  app.get("/api/v1/google/details", { config: rateLimitPresets.google }, async (req, reply) => {
    if (!requireKey(reply)) return;
    const query = req.query as any;
    const placeId = query?.placeId ?? query?.place_id;
    if (!placeId) return reply.code(400).send({ error: "placeId is required" });
    if (typeof placeId !== "string" || placeId.length > 256 || !/^[A-Za-z0-9_-]+$/.test(placeId)) {
      return reply.code(400).send({ error: "invalid_place_id" });
    }
    try {
      const res = await withSpan(
        "google.details",
        { "peer.service": "places.googleapis.com", endpoint: "places.get" },
        async (span: any) =>
          gfetch(
            `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
            {
              headers: {
                "X-Goog-Api-Key": config.googlePlacesKey,
                "X-Goog-FieldMask": detailsMask,
              },
            }
          ).then((r: Response) => {
            span.setAttribute("http.status_code", r.status);
            return r;
          })
      );
      return relay(res, reply);
    } catch (err) {
      req.log.error({ err }, "google details failed");
      return reply.code(502).send({ error: "google_unavailable" });
    }
  });

  app.get("/api/v1/google/geocode", { config: rateLimitPresets.google }, async (req, reply) => {
    if (!requireKey(reply)) return;
    const query = req.query as any;
    const address = query?.address ?? query?.latlng;
    if (!address) return reply.code(400).send({ error: "address is required" });
    if (typeof address !== "string" || address.length > 500) {
      return reply.code(400).send({ error: "invalid_address" });
    }
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${config.googlePlacesKey}`;
    try {
      const res = await withSpan(
        "google.geocode",
        { "peer.service": "maps.googleapis.com", endpoint: "geocode" },
        async (span: any) =>
          gfetch(url).then((r: Response) => {
            span.setAttribute("http.status_code", r.status);
            return r;
          })
      );
      return relay(res, reply);
    } catch (err) {
      req.log.error({ err }, "google geocode failed");
      return reply.code(502).send({ error: "google_unavailable" });
    }
  });
}
