import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
import type { AppConfig } from "../config.js";
import { places } from "../db/schema.js";
import { normalizeTags } from "../tags/normalize.js";

export const STATUSES = ["WANT_TO_GO", "BEEN_TO"] as const;

function toPlace(row: typeof places.$inferSelect) {
  return {
    id: row.id,
    ownerId: row.ownerId,
    googlePlaceId: row.googlePlaceId,
    name: row.name,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    status: row.status,
    tags: JSON.parse(row.tagsJson ?? "[]") as string[],
    rating: row.rating,
    note: row.note,
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
        for (const k of ["name", "status", "rating", "note", "address", "lat", "lng"] as const) {
          if (value[k] !== undefined) patch[k] = value[k];
        }
        if (value.tags !== undefined) patch.tagsJson = JSON.stringify(value.tags);
        await db.update(places).set(patch).where(eq(places.id, dup[0].id));
        const updated = await db.select().from(places).where(eq(places.id, dup[0].id)).limit(1);
        return reply.code(200).send(toPlace(updated[0]));
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
      tagsJson: JSON.stringify(value.tags ?? []),
      rating: value.rating ?? null,
      note: value.note ?? null,
      createdAt: now,
      updatedAt: now,
    });
    const rows = await db.select().from(places).where(eq(places.id, id)).limit(1);
    return reply.code(201).send(toPlace(rows[0]));
  });

  app.get("/api/places", {
    schema: {
      querystring: {
        type: "object",
        properties: {
          owner: { type: "string" },
          status: { type: "string" },
          tags: { type: "string" },
          q: { type: "string" },
        },
      },
    },
  }, async (req) => {
    const userId = (req as any).userId as string;
    const q = req.query as any;
    const owner: string = q.owner ?? "me";
    const rows = await db.select().from(places).orderBy(desc(places.updatedAt));
    let filtered: ReturnType<typeof toPlace>[] = rows.map(toPlace);
    if (owner === "me") filtered = filtered.filter((p: ReturnType<typeof toPlace>) => p.ownerId === userId);
    else if (owner !== "all") filtered = filtered.filter((p: ReturnType<typeof toPlace>) => p.ownerId === owner);
    if (q.status) filtered = filtered.filter((p: ReturnType<typeof toPlace>) => p.status === q.status);
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
    return { places: filtered };
  });

  app.get("/api/places/:id", async (req, reply) => {
    const rows = await db.select().from(places).where(eq(places.id, (req.params as any).id)).limit(1);
    if (!rows.length) return reply.code(404).send({ error: "not_found" });
    return toPlace(rows[0]);
  });

  app.patch("/api/places/:id", async (req, reply) => {
    const userId = (req as any).userId as string;
    const rows = await db.select().from(places).where(eq(places.id, (req.params as any).id)).limit(1);
    if (!rows.length) return reply.code(404).send({ error: "not_found" });
    if (rows[0].ownerId !== userId) return reply.code(403).send({ error: "forbidden" });
    const { error, value } = validatePlaceInput(req.body ?? {}, true);
    if (error) return reply.code(400).send({ error });
    const patch: any = { updatedAt: Date.now() };
    for (const k of ["name", "status", "rating", "note", "googlePlaceId", "address", "lat", "lng"] as const) {
      if (value[k] !== undefined) patch[k] = value[k];
    }
    if (value.tags !== undefined) patch.tagsJson = JSON.stringify(value.tags);
    await db.update(places).set(patch).where(eq(places.id, rows[0].id));
    const updated = await db.select().from(places).where(eq(places.id, rows[0].id)).limit(1);
    return toPlace(updated[0]);
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
