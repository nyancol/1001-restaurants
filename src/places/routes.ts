import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import type { AppConfig } from "../config.js";
import { places, users } from "../db/schema.js";
import { normalizeTags } from "../tags/normalize.js";
import { ensureTagDefinitions } from "../tags/definitions.js";
import { deletePlaceTags, syncPlaceTags } from "../db/index.js";
import { normalizeIcon, isValidIcon } from "../place-icons/infer.js";
import { isOpenAt, parseHoursJson } from "./open.js";
import { withSpan } from "../observability/trace.js";

export const STATUSES = ["WANT_TO_GO", "BEEN_TO"] as const;
const CLOSED = new Set(["CLOSED_PERMANENTLY", "CLOSED_TEMPORARILY"]);

function parseJson(raw: unknown): any {
  if (raw == null) return null;
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Normalize a stored priceLevel to a 1–4 tier ($–$$$$); null when unknown. */
export function priceTierFor(level: unknown): number | null {
  if (typeof level !== "string" || !level) return null;
  const v = level.trim().toUpperCase();
  if (v === "PRICE_LEVEL_INEXPENSIVE" || v === "INEXPENSIVE" || v === "€") return 1;
  if (v === "PRICE_LEVEL_MODERATE" || v === "MODERATE" || v === "€€") return 2;
  if (v === "PRICE_LEVEL_EXPENSIVE" || v === "EXPENSIVE" || v === "€€€") return 3;
  if (v === "PRICE_LEVEL_VERY_EXPENSIVE" || v === "VERY_EXPENSIVE" || v === "€€€€") return 4;
  const dollars = (level.match(/\$/g) ?? []).length;
  if (dollars >= 1 && dollars <= 4 && dollars === level.trim().length) return dollars;
  return null;
}

/** Parse a `price` query value ($–$$$$ or 1–4) to a tier; null when invalid. */
export function parsePriceFilter(raw: unknown): number | null {
  if (typeof raw !== "string" || !raw) return null;
  const t = raw.trim();
  if (/^[1-4]$/.test(t)) return Number(t);
  const dollars = (t.match(/\$/g) ?? []).length;
  if (dollars >= 1 && dollars <= 4 && dollars === t.length) return dollars;
  return null;
}

const PRICE_TIER_VALUES: Record<number, string[]> = {
  1: ["PRICE_LEVEL_INEXPENSIVE", "INEXPENSIVE", "€", "$"],
  2: ["PRICE_LEVEL_MODERATE", "MODERATE", "€€", "$$"],
  3: ["PRICE_LEVEL_EXPENSIVE", "EXPENSIVE", "€€€", "$$$"],
  4: ["PRICE_LEVEL_VERY_EXPENSIVE", "VERY_EXPENSIVE", "€€€€", "$$$$"],
};

async function ownerNameMap(db: any): Promise<Map<string, string | null>> {
  try {
    const rows = await db.select().from(users);
    return new Map(rows.map((u: any) => [u.id, u.displayName ?? null]));
  } catch {
    return new Map();
  }
}

function toPlace(row: typeof places.$inferSelect, displayName?: string | null) {
  return {
    id: row.id,
    ownerId: row.ownerId,
    ownerDisplayName: displayName ?? null,
    googlePlaceId: row.googlePlaceId,
    name: row.name,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    status: row.status,
    icon: (row as any).icon ?? "fork",
    tags: JSON.parse(row.tagsJson ?? "[]") as string[],
    rating: row.rating,
    note: row.note,
    hours: parseJson((row as any).hoursJson),
    businessStatus: (row as any).businessStatus ?? null,
    priceLevel: (row as any).priceLevel ?? null,
    priceRange: parseJson((row as any).priceRangeJson),
    googleRating: (row as any).googleRating ?? null,
    googleRatingCount: (row as any).googleRatingCount ?? null,
    websiteUri: (row as any).websiteUri ?? null,
    mapsLinks: parseJson((row as any).mapsLinksJson),
    googleMapsUri:
      parseJson((row as any).mapsLinksJson)?.placeUri ??
      parseJson((row as any).mapsLinksJson)?.place_uri ??
      null,
    utcOffsetMinutes: (row as any).utcOffsetMinutes ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function validatePlaceInput(body: any, isPatch: boolean): { error?: string; value?: any } {
  const v: any = {};
  if (body.placeType !== undefined) return { error: "placeType is removed, use icon" };
  if (!isPatch || body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      if (!isPatch) return { error: "name is required" };
      if (body.name !== undefined) return { error: "name must be a non-empty string" };
    } else v.name = body.name.trim();
  }
  if (!isPatch || body.icon !== undefined) {
    if (body.icon === undefined || body.icon === null || body.icon === "") {
      if (!isPatch) v.icon = "fork";
    } else {
      const t = normalizeIcon(body.icon);
      if (!t || !isValidIcon(t))
        return {
          error:
            "icon must be one of fork, burger, pizza, soup, hotdog, bagel, croissant, ice-cream, cocktail, wine, beer, coffee",
        };
      v.icon = t;
    }
  }
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) return { error: "status must be WANT_TO_GO or BEEN_TO" };
    v.status = body.status;
  } else if (!isPatch) v.status = "WANT_TO_GO";
  if (body.rating !== undefined) {
    if (
      body.rating !== null &&
      (typeof body.rating !== "number" || body.rating < 0 || body.rating > 5)
    ) {
      return { error: "rating must be 0-5 or null" };
    }
    v.rating = body.rating;
  }
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags) || !body.tags.every((t: unknown) => typeof t === "string")) {
      return { error: "tags must be a string array" };
    }
    v.tags = normalizeTags(body.tags);
  } else if (!isPatch) v.tags = [];
  if (body.note !== undefined) {
    if (body.note !== null && typeof body.note !== "string")
      return { error: "note must be a string or null" };
    v.note = body.note;
  }
  if (body.googlePlaceId !== undefined) v.googlePlaceId = body.googlePlaceId ?? null;
  if (body.address !== undefined) v.address = body.address ?? null;
  if (body.lat !== undefined) v.lat = body.lat ?? null;
  if (body.lng !== undefined) v.lng = body.lng ?? null;
  if (body.hours !== undefined || body.hoursJson !== undefined) {
    const h = body.hours ?? body.hoursJson;
    v.hoursJson = h == null ? null : typeof h === "string" ? h : JSON.stringify(h);
  }
  if (body.businessStatus !== undefined) v.businessStatus = body.businessStatus ?? null;
  if (body.priceLevel !== undefined) v.priceLevel = body.priceLevel ?? null;
  if (body.priceRange !== undefined || body.priceRangeJson !== undefined) {
    const pr = body.priceRange ?? body.priceRangeJson;
    v.priceRangeJson = pr == null ? null : typeof pr === "string" ? pr : JSON.stringify(pr);
  }
  if (body.googleRating !== undefined) v.googleRating = body.googleRating ?? null;
  if (body.googleRatingCount !== undefined) v.googleRatingCount = body.googleRatingCount ?? null;
  if (body.websiteUri !== undefined) v.websiteUri = body.websiteUri ?? null;
  if (
    body.mapsLinks !== undefined ||
    body.mapsLinksJson !== undefined ||
    body.googleMapsUri !== undefined
  ) {
    const m =
      body.mapsLinks ??
      body.mapsLinksJson ??
      (body.googleMapsUri ? { placeUri: body.googleMapsUri } : undefined);
    v.mapsLinksJson = m == null ? null : typeof m === "string" ? m : JSON.stringify(m);
  }
  if (body.utcOffsetMinutes !== undefined) v.utcOffsetMinutes = body.utcOffsetMinutes ?? null;
  return { value: v };
}

export const REFRESH_SNAPSHOT_FIELDS = [
  "hoursJson",
  "businessStatus",
  "priceLevel",
  "priceRangeJson",
  "googleRating",
  "googleRatingCount",
  "websiteUri",
  "mapsLinksJson",
  "utcOffsetMinutes",
] as const;

export const REFRESH_DETAILS_MASK = [
  "id",
  "businessStatus",
  "googleMapsUri",
  "googleMapsLinks",
  "regularOpeningHours",
  "currentOpeningHours",
  "priceLevel",
  "priceRange",
  "rating",
  "userRatingCount",
  "websiteUri",
  "utcOffsetMinutes",
].join(",");

type GoogleFetch = typeof fetch;

/** Map a Places API (New) Place payload to snapshot-only columns. */
export function mapGoogleDetailsToSnapshot(body: any): Record<string, any> {
  const hours = body?.regularOpeningHours ?? body?.currentOpeningHours ?? null;
  const mapsLinks = body?.googleMapsLinks ?? null;
  const priceRange = body?.priceRange ?? null;
  return {
    hoursJson: hours
      ? JSON.stringify({
          periods: hours.periods ?? [],
          weekdayDescriptions: hours.weekdayDescriptions ?? [],
        })
      : null,
    businessStatus: body?.businessStatus ?? null,
    priceLevel: body?.priceLevel ?? null,
    priceRangeJson: priceRange ? JSON.stringify(priceRange) : null,
    googleRating: typeof body?.rating === "number" ? body.rating : null,
    googleRatingCount: typeof body?.userRatingCount === "number" ? body.userRatingCount : null,
    websiteUri: body?.websiteUri ?? null,
    mapsLinksJson: mapsLinks ? JSON.stringify(mapsLinks) : null,
    utcOffsetMinutes: typeof body?.utcOffsetMinutes === "number" ? body.utcOffsetMinutes : null,
  };
}

export function registerPlaceRoutes(
  app: FastifyInstance,
  deps: { db: any; sqlite?: any; config?: any; googleFetch?: GoogleFetch },
) {
  const { db, config, googleFetch } = deps;
  const gfetch: GoogleFetch = googleFetch ?? fetch;
  const getSqlite = (): any => (deps as any).sqlite ?? (app as any).sqlite;

  app.post(
    "/api/v1/places",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            name: { type: "string" },
            icon: { type: "string" },
            status: { type: "string", enum: ["WANT_TO_GO", "BEEN_TO"] },
            tags: { type: "array", items: { type: "string" } },
            rating: { type: ["number", "null"] },
            note: { type: ["string", "null"] },
            googlePlaceId: { type: ["string", "null"] },
            address: { type: ["string", "null"] },
            lat: { type: ["number", "null"] },
            lng: { type: ["number", "null"] },
          },
          required: ["name"],
        },
      },
    },
    async (req, reply) => {
      if ((req as any).servicePrincipal) return reply.code(403).send({ error: "forbidden" });
      const userId = (req as any).userId as string;
      const { error, value } = validatePlaceInput(req.body ?? {}, false);
      if (error) return reply.code(400).send({ error });
      if (value.googlePlaceId) {
        const dup = await db
          .select()
          .from(places)
          .where(and(eq(places.ownerId, userId), eq(places.googlePlaceId, value.googlePlaceId)))
          .limit(1);
        if (dup.length) {
          const patch: any = { updatedAt: Date.now() };
          for (const k of [
            "name",
            "icon",
            "status",
            "rating",
            "note",
            "address",
            "lat",
            "lng",
            "hoursJson",
            "businessStatus",
            "priceLevel",
            "priceRangeJson",
            "googleRating",
            "googleRatingCount",
            "websiteUri",
            "mapsLinksJson",
            "utcOffsetMinutes",
          ] as const) {
            if (value[k] !== undefined) patch[k] = value[k];
          }
          if (value.tags !== undefined) patch.tagsJson = JSON.stringify(value.tags);
          await db.update(places).set(patch).where(eq(places.id, dup[0].id));
          if (value.tags !== undefined) {
            try {
              await ensureTagDefinitions(db, userId, value.tags);
            } catch {
              /* ignore */
            }
            try {
              syncPlaceTags(getSqlite(), userId, dup[0].id, value.tags);
            } catch {
              /* ignore */
            }
          }
          const updated = await db.select().from(places).where(eq(places.id, dup[0].id)).limit(1);
          const names = await ownerNameMap(db);
          return reply.code(200).send(toPlace(updated[0], names.get(updated[0].ownerId) ?? null));
        }
      }
      const now = Date.now();
      const id = randomUUID();
      await db.insert(places).values({
        id,
        ownerId: userId,
        googlePlaceId: value.googlePlaceId ?? null,
        name: value.name,
        address: value.address ?? null,
        lat: value.lat ?? null,
        lng: value.lng ?? null,
        status: value.status ?? "WANT_TO_GO",
        icon: value.icon ?? "fork",
        tagsJson: JSON.stringify(value.tags ?? []),
        rating: value.rating ?? null,
        note: value.note ?? null,
        hoursJson: value.hoursJson ?? null,
        businessStatus: value.businessStatus ?? null,
        priceLevel: value.priceLevel ?? null,
        priceRangeJson: value.priceRangeJson ?? null,
        googleRating: value.googleRating ?? null,
        googleRatingCount: value.googleRatingCount ?? null,
        websiteUri: value.websiteUri ?? null,
        mapsLinksJson: value.mapsLinksJson ?? null,
        utcOffsetMinutes: value.utcOffsetMinutes ?? null,
        createdAt: now,
        updatedAt: now,
      });
      const rows = await db.select().from(places).where(eq(places.id, id)).limit(1);
      const names = await ownerNameMap(db);
      try {
        await ensureTagDefinitions(db, userId, value.tags ?? []);
      } catch {
        /* ignore */
      }
      try {
        syncPlaceTags(getSqlite(), userId, id, value.tags ?? []);
      } catch {
        /* ignore */
      }
      return reply.code(201).send(toPlace(rows[0], names.get(rows[0].ownerId) ?? null));
    },
  );

  app.get(
    "/api/v1/places",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            owner: { type: "string" },
            status: { type: "string" },
            placeType: { type: "string" },
            tags: { type: "string" },
            q: { type: "string" },
            openAt: { type: "string" },
            openNow: { type: "string" },
            price: { type: "string" },
          },
        },
      },
    },
    async (req, reply) => {
      const userId = (req as any).userId as string | undefined;
      const servicePrincipal = (req as any).servicePrincipal as { scopes: string[] } | undefined;
      const q = req.query as any;
      const owner: string = q.owner ?? "me";
      const wantedTags = q.tags ? normalizeTags(String(q.tags).split(",")) : [];
      const status = typeof q.status === "string" && q.status ? q.status : null;
      const needle = typeof q.q === "string" && q.q ? String(q.q).toLowerCase() : null;
      const priceTier = parsePriceFilter(q.price);

      const sqlite = getSqlite();
      const where: string[] = [];
      const params: any[] = [];
      if (servicePrincipal) {
        if (owner !== "all" && owner !== "me") {
          where.push(`owner_id = ?`);
          params.push(owner);
        }
      } else if (owner === "me") {
        where.push(`owner_id = ?`);
        params.push(userId);
      } else if (owner !== "all") {
        where.push(`owner_id = ?`);
        params.push(owner);
      }
      if (status) {
        where.push(`status = ?`);
        params.push(status);
      }
      if (needle) {
        where.push(
          `(lower(name) LIKE ? OR lower(coalesce(address,'')) LIKE ? OR lower(coalesce(note,'')) LIKE ?)`,
        );
        params.push(`%${needle}%`, `%${needle}%`, `%${needle}%`);
      }
      if (priceTier != null) {
        const vals = PRICE_TIER_VALUES[priceTier] ?? [];
        if (vals.length) {
          where.push(`price_level IN (${vals.map(() => "?").join(",")})`);
          params.push(...vals);
        } else {
          where.push(`1 = 0`);
        }
      }
      for (const t of wantedTags) {
        where.push(
          `EXISTS (SELECT 1 FROM place_tags pt WHERE pt.place_id = places.id AND pt.tag_name = ?)`,
        );
        params.push(t);
      }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      let rows: any[] = [];
      try {
        rows = sqlite
          .prepare(`SELECT * FROM places ${whereSql} ORDER BY updated_at DESC, id DESC`)
          .all(...params);
      } catch {
        rows = [];
      }
      const names = await ownerNameMap(db);
      let items = rows.map((r: any) =>
        toPlace(
          {
            id: r.id,
            ownerId: r.owner_id,
            googlePlaceId: r.google_place_id,
            name: r.name,
            address: r.address,
            lat: r.lat,
            lng: r.lng,
            status: r.status,
            icon: r.icon,
            tagsJson: r.tags_json,
            rating: r.rating,
            note: r.note,
            hoursJson: r.hours_json,
            businessStatus: r.business_status,
            priceLevel: r.price_level,
            priceRangeJson: r.price_range_json,
            googleRating: r.google_rating,
            googleRatingCount: r.google_rating_count,
            websiteUri: r.website_uri,
            mapsLinksJson: r.maps_links_json,
            utcOffsetMinutes: r.utc_offset_minutes,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          } as any,
          names.get(r.owner_id) ?? null,
        ),
      );
      const openFilter = q.openAt || q.openNow === "1" || q.openNow === "true";
      if (openFilter) {
        const at = q.openAt ? new Date(q.openAt) : new Date();
        const atValid = !Number.isNaN(at.getTime());
        items = items.filter((p) => {
          if ((p as any).businessStatus && CLOSED.has((p as any).businessStatus)) return false;
          const parsed =
            typeof (p as any).hours === "string"
              ? parseHoursJson((p as any).hours)
              : (p as any).hours?.periods
                ? (p as any).hours
                : parseHoursJson(JSON.stringify((p as any).hours));
          const periods =
            (parsed as any)?.periods ?? (Array.isArray((p as any).hours) ? (p as any).hours : null);
          if (!periods || !periods.length) return false;
          return atValid ? isOpenAt(periods, at) : false;
        });
      }
      return { data: items };
    },
  );

  app.get("/api/v1/places/:id", async (req, reply) => {
    const rows = await db
      .select()
      .from(places)
      .where(eq(places.id, (req.params as any).id))
      .limit(1);
    if (!rows.length) return reply.code(404).send({ error: "not_found" });
    const names = await ownerNameMap(db);
    return toPlace(rows[0], names.get(rows[0].ownerId) ?? null);
  });

  app.post("/api/v1/places/:id/refresh", async (req, reply) => {
    const servicePrincipal = (req as any).servicePrincipal as { scopes: string[] } | undefined;
    const userId = (req as any).userId as string | undefined;
    const rows = await db
      .select()
      .from(places)
      .where(eq(places.id, (req.params as any).id))
      .limit(1);
    if (!rows.length) return reply.code(404).send({ error: "not_found" });
    if (servicePrincipal) {
      if (!servicePrincipal.scopes.includes("refresh:places")) {
        return reply.code(403).send({ error: "forbidden" });
      }
    } else {
      if (!userId || rows[0].ownerId !== userId)
        return reply.code(403).send({ error: "forbidden" });
    }
    const googlePlaceId = (rows[0] as any).googlePlaceId as string | null;
    if (!googlePlaceId) return reply.code(422).send({ error: "missing_google_id" });
    if (!config?.googlePlacesKey) return reply.code(503).send({ error: "google_not_configured" });
    let details: any;
    try {
      const res = await withSpan(
        "google.place-refresh",
        { "peer.service": "places.googleapis.com", endpoint: "places.get" },
        async (span: any) =>
          gfetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(googlePlaceId)}`, {
            headers: {
              "X-Goog-Api-Key": config.googlePlacesKey,
              "X-Goog-FieldMask": REFRESH_DETAILS_MASK,
            },
            signal: AbortSignal.timeout(10_000),
          }).then((r: Response) => {
            span.setAttribute("http.status_code", r.status);
            return r;
          }),
      );
      if (res.status === 429) return reply.code(429).send({ error: "google_rate_limited" });
      if (!res.ok) return reply.code(502).send({ error: "google_unavailable" });
      details = await res.json();
    } catch {
      return reply.code(502).send({ error: "google_unavailable" });
    }
    const snapshot = mapGoogleDetailsToSnapshot(details);
    const patch: any = { updatedAt: Date.now() };
    for (const k of REFRESH_SNAPSHOT_FIELDS) patch[k] = (snapshot as any)[k];
    await db.update(places).set(patch).where(eq(places.id, rows[0].id));
    const updated = await db.select().from(places).where(eq(places.id, rows[0].id)).limit(1);
    const names = await ownerNameMap(db);
    return toPlace(updated[0], names.get(updated[0].ownerId) ?? null);
  });

  app.patch("/api/v1/places/:id", async (req, reply) => {
    if ((req as any).servicePrincipal) return reply.code(403).send({ error: "forbidden" });
    const userId = (req as any).userId as string;
    const rows = await db
      .select()
      .from(places)
      .where(eq(places.id, (req.params as any).id))
      .limit(1);
    if (!rows.length) return reply.code(404).send({ error: "not_found" });
    if (rows[0].ownerId !== userId) return reply.code(403).send({ error: "forbidden" });
    const { error, value } = validatePlaceInput(req.body ?? {}, true);
    if (error) return reply.code(400).send({ error });
    const patch: any = { updatedAt: Date.now() };
    for (const k of [
      "name",
      "icon",
      "status",
      "rating",
      "note",
      "googlePlaceId",
      "address",
      "lat",
      "lng",
      "hoursJson",
      "businessStatus",
      "priceLevel",
      "priceRangeJson",
      "googleRating",
      "googleRatingCount",
      "websiteUri",
      "mapsLinksJson",
      "utcOffsetMinutes",
    ] as const) {
      if (value[k] !== undefined) patch[k] = value[k];
    }
    if (value.tags !== undefined) patch.tagsJson = JSON.stringify(value.tags);
    await db.update(places).set(patch).where(eq(places.id, rows[0].id));
    if (value.tags !== undefined) {
      try {
        await ensureTagDefinitions(db, userId, value.tags);
      } catch {
        /* ignore */
      }
      try {
        syncPlaceTags(getSqlite(), userId, rows[0].id, value.tags);
      } catch {
        /* ignore */
      }
    }
    const updated = await db.select().from(places).where(eq(places.id, rows[0].id)).limit(1);
    const names = await ownerNameMap(db);
    return toPlace(updated[0], names.get(updated[0].ownerId) ?? null);
  });

  app.delete("/api/v1/places/:id", async (req, reply) => {
    if ((req as any).servicePrincipal) return reply.code(403).send({ error: "forbidden" });
    const userId = (req as any).userId as string;
    const rows = await db
      .select()
      .from(places)
      .where(eq(places.id, (req.params as any).id))
      .limit(1);
    if (!rows.length) return reply.code(404).send({ error: "not_found" });
    if (rows[0].ownerId !== userId) return reply.code(403).send({ error: "forbidden" });
    await db.delete(places).where(eq(places.id, rows[0].id));
    try {
      deletePlaceTags(getSqlite(), userId, rows[0].id);
    } catch {
      /* ignore */
    }
    return { ok: true };
  });
}
