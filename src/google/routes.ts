import type { FastifyInstance } from "fastify";
import type { AppConfig } from "../config.js";

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

  const detailsMask = ["id", "displayName", "formattedAddress", "location", "types"].join(",");

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

  app.get("/api/google/autocomplete", async (req, reply) => {
    if (!requireKey(reply)) return;
    const query = req.query as any;
    const q = query?.q ?? query?.input;
    if (!q) return reply.code(400).send({ error: "q is required" });
    const body: Record<string, unknown> = { input: q };
    if (query.sessionToken) body.sessionToken = query.sessionToken;
    try {
      const res = await gfetch("https://places.googleapis.com/v1/places:autocomplete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": config.googlePlacesKey,
          "X-Goog-FieldMask": autocompleteMask,
        },
        body: JSON.stringify(body),
      });
      return relay(res, reply);
    } catch (err) {
      req.log.error({ err }, "google autocomplete failed");
      return reply.code(502).send({ error: "google_unavailable" });
    }
  });

  app.get("/api/google/details", async (req, reply) => {
    if (!requireKey(reply)) return;
    const query = req.query as any;
    const placeId = query?.placeId ?? query?.place_id;
    if (!placeId) return reply.code(400).send({ error: "placeId is required" });
    try {
      const res = await gfetch(
        `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
        {
          headers: {
            "X-Goog-Api-Key": config.googlePlacesKey,
            "X-Goog-FieldMask": detailsMask,
          },
        }
      );
      return relay(res, reply);
    } catch (err) {
      req.log.error({ err }, "google details failed");
      return reply.code(502).send({ error: "google_unavailable" });
    }
  });

  app.get("/api/google/geocode", async (req, reply) => {
    if (!requireKey(reply)) return;
    const query = req.query as any;
    const address = query?.address ?? query?.latlng;
    if (!address) return reply.code(400).send({ error: "address is required" });
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${config.googlePlacesKey}`;
    try {
      const res = await gfetch(url);
      return relay(res, reply);
    } catch (err) {
      req.log.error({ err }, "google geocode failed");
      return reply.code(502).send({ error: "google_unavailable" });
    }
  });
}
