import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import type { AppConfig } from "../config.js";
import { places, users } from "../db/schema.js";
import { normalizeTags } from "../tags/normalize.js";
import { normalizePlaceType, isValidPlaceType, ensurePlaceType } from "../place-types/looks.js";
import { isOpenAt, parseHoursJson } from "./open.js";

export const STATUSES = ["WANT_TO_GO", "BEEN_TO"] as const;
const CLOSED = new Set(["CLOSED_PERMANENTLY", "CLOSED_TEMPORARILY"]);

function parseJson(raw: unknown): any {
  if (raw == null) return null;
  if (typeof raw !== "string") return raw;
  try { return JSON.parse(raw); } catch { return null; }
}

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
    placeType: (row as any).placeType ?? "restaurant",
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
    googleMapsUri: parseJson((row as any).mapsLinksJson)?.placeUri ?? parseJson((row as any).mapsLinksJson)?.place_uri ?? null,
    utcOffsetMinutes: (row as any).utcOffsetMinutes ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function validatePlaceInput(body: any, isPatch: boolean): { error?: string; value?: any } {
  const v: any = {};
  if (!isPatch || body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      if (!isPatch) return { error: "name is required" };
      if (body.name !== undefined) return { error: "name must be a non-empty string" };
    } else v.name = body.name.trim();
  }
  if (!isPatch || body.placeType !== undefined) {
    const t = normalizePlaceType(body.placeType);
    if (!t || !isValidPlaceType(t)) {
      if (!isPatch) return { error: "placeType must be restaurant, bar, or café" };
      if (body.placeType !== undefined) return { error: "placeType must be restaurant, bar, or café" };
    } else v.placeType = t;
  }
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) return { error: "status must be WANT_TO_GO or BEEN_TO" };
    v.status = body.status;
  } else if (!isPatch) v.status = "WANT_TO_GO";
  if (body.rating !== undefined) {
    if (body.rating !== null && (typeof body.rating !== "number" || body.rating < 0 || body.rating > 5)) {
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
    if (body.note !== null && typeof body.note !== "string") return { error: "note must be a string or null" };
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
  if (body.mapsLinks !== undefined || body.mapsLinksJson !== undefined || body.googleMapsUri !== undefined) {
    const m = body.mapsLinks ?? body.mapsLinksJson ?? (body.googleMapsUri ? { placeUri: body.googleMapsUri } : undefined);
    v.mapsLinksJson = m == null ? null : typeof m === "string" ? m : JSON.stringify(m);
  }
  if (body.utcOffsetMinutes !== undefined) v.utcOffsetMinutes = body.utcOffsetMinutes ?? null;
  return { value: v };
}

export function registerPlaceRoutes(app: FastifyInstance, deps: { db: any }) {
  const { db } = deps;

  app.post("/api/places", {
    schema: {
      body: {
        type: "object",
        properties: {
          name: { type: "string" },
          placeType: { type: "string" },
          status: { type: "string", enum: ["WANT_TO_GO", "BEEN_TO"] },
          tags: { type: "array", items: { type: "string" } },
          rating: { type: ["number", "null"] },
          note: { type: ["string", "null"] },
          googlePlaceId: { type: ["string", "null"] },
          address: { type: ["string", "null"] },
          lat: { type: ["number", "null"] },
          lng: { type: ["number", "null"] },
        },
        required: ["name", "placeType"],
      },
    },
  }, async (req, reply) => {
    const userId = (req as any).userId as string;
    const { error, value } = validatePlaceInput(req.body ?? {}, false);
    if (error) return reply.code(400).send({ error });
    // Duplicate googlePlaceId per owner: update instead of forking.
    if (value.googlePlaceId) {
      const dup = await db
        .select()
        .from(places)
        .where(and(eq(places.ownerId, userId), eq(places.googlePlaceId, value.googlePlaceId)))
        .limit(1);
      if (dup.length) {
        const patch: any = { updatedAt: Date.now() };
        for (const k of ["name", "placeType", "status", "rating", "note", "address", "lat", "lng", "hoursJson", "businessStatus", "priceLevel", "priceRangeJson", "googleRating", "googleRatingCount", "websiteUri", "mapsLinksJson", "utcOffsetMinutes"] as const) {
          if (value[k] !== undefined) patch[k] = value[k];
        }
        if (value.tags !== undefined) patch.tagsJson = JSON.stringify(value.tags);
        await db.update(places).set(patch).where(eq(places.id, dup[0].id));
        if (value.placeType) await ensurePlaceType(db, value.placeType);
        const updated = await db.select().from(places).where(eq(places.id, dup[0].id)).limit(1);
        const names = await ownerNameMap(db);
        return reply.code(200).send(toPlace(updated[0], names.get(updated[0].ownerId) ?? null));
      }
    }
    const now = Date.now();
    const id = randomUUID();
    await db.insert(places).values({
      id,
      ownerId: userId, // forced to session user; client cannot set owner
      googlePlaceId: value.googlePlaceId ?? null,
      name: value.name,
      address: value.address ?? null,
      lat: value.lat ?? null,
      lng: value.lng ?? null,
      status: value.status ?? "WANT_TO_GO",
      placeType: value.placeType,
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
    await ensurePlaceType(db, value.placeType);
    const rows = await db.select().from(places).where(eq(places.id, id)).limit(1);
    const names = await ownerNameMap(db);
    return reply.code(201).send(toPlace(rows[0], names.get(rows[0].ownerId) ?? null));
  });

  app.get("/api/places", {
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
        },
      },
    },
  }, async (req) => {
    const userId = (req as any).userId as string;
    const q = req.query as any;
    const owner: string = q.owner ?? "me";
    const rows = await db.select().from(places).orderBy(desc(places.updatedAt));
    const names = await ownerNameMap(db);
    let filtered: ReturnType<typeof toPlace>[] = rows.map((r: any) => toPlace(r, names.get(r.ownerId) ?? null));
    if (owner === "me") filtered = filtered.filter((p: ReturnType<typeof toPlace>) => p.ownerId === userId);
    else if (owner !== "all") filtered = filtered.filter((p: ReturnType<typeof toPlace>) => p.ownerId === owner);
    if (q.status) filtered = filtered.filter((p: ReturnType<typeof toPlace>) => p.status === q.status);
    if (q.placeType) {
      const wanted = normalizePlaceType(q.placeType);
      if (wanted) filtered = filtered.filter((p) => normalizePlaceType((p as any).placeType) === wanted);
    }
    if (q.tags) {
      const wanted = normalizeTags(String(q.tags).split(","));
      if (wanted.length) filtered = filtered.filter((p: ReturnType<typeof toPlace>) => wanted.every((t) => p.tags.includes(t)));
    }
    if (q.q) {
      const needle = String(q.q).toLowerCase();
      filtered = filtered.filter((p: ReturnType<typeof toPlace>) =>
        p.name.toLowerCase().includes(needle) ||
        (p.address ?? "").toLowerCase().includes(needle) ||
        (p.note ?? "").toLowerCase().includes(needle)
      );
    }
    const openFilter = q.openAt || q.openNow === "1" || q.openNow === "true";
    if (openFilter) {
      const at = q.openAt ? new Date(q.openAt) : new Date();
      const atValid = !Number.isNaN(at.getTime());
      filtered = filtered.filter((p) => {
        if (p.businessStatus && CLOSED.has(p.businessStatus)) return false;
        const parsed = typeof p.hours === "string" ? parseHoursJson(p.hours) : p.hours?.periods ? p.hours : parseHoursJson(JSON.stringify(p.hours));
        const periods = (parsed as any)?.periods ?? (Array.isArray((p as any).hours) ? (p as any).hours : null);
        if (!periods || !periods.length) return false;
        return atValid ? isOpenAt(periods, at) : false;
      });
    }
    return { places: filtered };
  });

  app.get("/api/places/:id", async (req, reply) => {
    const rows = await db.select().from(places).where(eq(places.id, (req.params as any).id)).limit(1);
    if (!rows.length) return reply.code(404).send({ error: "not_found" });
    const names = await ownerNameMap(db);
    return toPlace(rows[0], names.get(rows[0].ownerId) ?? null);
  });

  app.patch("/api/places/:id", async (req, reply) => {
    const userId = (req as any).userId as string;
    const rows = await db.select().from(places).where(eq(places.id, (req.params as any).id)).limit(1);
    if (!rows.length) return reply.code(404).send({ error: "not_found" });
    if (rows[0].ownerId !== userId) return reply.code(403).send({ error: "forbidden" });
    const { error, value } = validatePlaceInput(req.body ?? {}, true);
    if (error) return reply.code(400).send({ error });
    const patch: any = { updatedAt: Date.now() };
    for (const k of ["name", "placeType", "status", "rating", "note", "googlePlaceId", "address", "lat", "lng", "hoursJson", "businessStatus", "priceLevel", "priceRangeJson", "googleRating", "googleRatingCount", "websiteUri", "mapsLinksJson", "utcOffsetMinutes"] as const) {
      if (value[k] !== undefined) patch[k] = value[k];
    }
    if (value.tags !== undefined) patch.tagsJson = JSON.stringify(value.tags);
    await db.update(places).set(patch).where(eq(places.id, rows[0].id));
    if (value.placeType) await ensurePlaceType(db, value.placeType);
    const updated = await db.select().from(places).where(eq(places.id, rows[0].id)).limit(1);
    const names = await ownerNameMap(db);
    return toPlace(updated[0], names.get(updated[0].ownerId) ?? null);
  });

  app.delete("/api/places/:id", async (req, reply) => {
    const userId = (req as any).userId as string;
    const rows = await db.select().from(places).where(eq(places.id, (req.params as any).id)).limit(1);
    if (!rows.length) return reply.code(404).send({ error: "not_found" });
    if (rows[0].ownerId !== userId) return reply.code(403).send({ error: "forbidden" });
    await db.delete(places).where(eq(places.id, rows[0].id));
    return { ok: true };
  });
}
