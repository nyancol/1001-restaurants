import type { FastifyInstance } from "fastify";
import { and, desc, eq } from "drizzle-orm";
import { places, tagDefinitions } from "../db/schema.js";
import { ensureTagDefinitions, normalizeTagName } from "./definitions.js";
import { colorForTag, isPaletteColor, randomPaletteColor } from "./palette.js";

// Owned tag definitions (ownerId, name, color) + live usage counts.
// GET returns definitions with colors and counts (zeros included).
// POST/PATCH/DELETE manage definitions; renames/deletes rewrite own places.
export function registerTagRoutes(app: FastifyInstance, deps: { db: any; sqlite?: any }) {
  const { db } = deps;

  app.get("/api/tags", {
    schema: {
      querystring: {
        type: "object",
        properties: { q: { type: "string" } },
      },
    },
  }, async (req) => {
    const userId = (req as any).userId as string;
    const q = ((req.query as any)?.q as string | undefined)?.trim().toLowerCase() ?? "";
    const [defs, rows] = await Promise.all([
      db.select().from(tagDefinitions).where(eq(tagDefinitions.ownerId, userId)),
      db.select().from(places).where(eq(places.ownerId, userId)).orderBy(desc(places.updatedAt)),
    ]);
    const counts = new Map<string, { count: number; lastUsed: number }>();
    for (const r of rows) {
      let tags: string[] = [];
      try { tags = JSON.parse(r.tagsJson ?? "[]"); } catch { tags = []; }
      for (const t of tags) {
        const cur = counts.get(t) ?? { count: 0, lastUsed: 0 };
        cur.count += 1;
        cur.lastUsed = Math.max(cur.lastUsed, r.updatedAt ?? 0);
        counts.set(t, cur);
      }
    }
    // Definitions are source of truth; also surface orphan strings (no definition yet)
    // so pre-migration / concurrent writes never hide tags. Orphans get deterministic color via fallback.
    const defByName = new Map<string, string>();
    for (const d of defs) defByName.set(d.name as string, d.color as string);
    const merged = new Map<string, { color: string; count: number; lastUsed: number }>();
    for (const [name, color] of defByName) {
      const c = counts.get(name) ?? { count: 0, lastUsed: 0 };
      merged.set(name, { color, count: c.count, lastUsed: c.lastUsed });
    }
    for (const [name, c] of counts) {
      if (!merged.has(name)) {
        merged.set(name, { color: colorForTag(name), count: c.count, lastUsed: c.lastUsed });
      }
    }
    let out = [...merged.entries()].map(([tag, v]) => ({ tag, color: v.color, count: v.count, lastUsed: v.lastUsed }));
    if (q) out = out.filter((t) => t.tag.startsWith(q) || t.tag.includes(q));
    out.sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed || (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0));
    return { tags: out.map(({ tag, color, count }) => ({ tag, color, count })) };
  });

  app.post("/api/tags", {
    schema: {
      body: {
        type: "object",
        properties: { name: { type: "string" }, color: { type: "string" } },
        required: ["name"],
      },
    },
  }, async (req, reply) => {
    const userId = (req as any).userId as string;
    const body = (req.body ?? {}) as any;
    const name = normalizeTagName(body.name);
    if (!name) return reply.code(400).send({ error: "name is required" });
    if (body.color !== undefined && !isPaletteColor(body.color)) {
      return reply.code(400).send({ error: "color must be a palette entry" });
    }
    const existing = await db.select().from(tagDefinitions)
      .where(eq(tagDefinitions.ownerId, userId));
    const found = existing.find((r: any) => r.name === name);
    if (found) return { tag: found.name, color: found.color };
    const used = new Set<string>(existing.map((r: any) => r.color as string));
    const color = body.color ?? randomPaletteColor(used);
    const now = Date.now();
    try {
      await db.insert(tagDefinitions).values({ ownerId: userId, name, color, createdAt: now, updatedAt: now });
    } catch {
      const retry = await db.select().from(tagDefinitions).where(eq(tagDefinitions.ownerId, userId));
      const dup = retry.find((r: any) => r.name === name);
      if (dup) return { tag: dup.name, color: dup.color };
      throw new Error("insert failed");
    }
    return reply.code(201).send({ tag: name, color });
  });

  app.patch("/api/tags/:name", {
    schema: {
      params: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
      body: {
        type: "object",
        properties: { newName: { type: "string" }, color: { type: "string" } },
      },
    },
  }, async (req, reply) => {
    const userId = (req as any).userId as string;
    const rawName = decodeURIComponent((req.params as any).name ?? "");
    const oldName = normalizeTagName(rawName);
    if (!oldName) return reply.code(400).send({ error: "invalid tag name" });
    const body = (req.body ?? {}) as any;
    const hasNewName = body.newName !== undefined;
    const hasColor = body.color !== undefined;
    if (!hasNewName && !hasColor) return reply.code(400).send({ error: "newName or color is required" });
    const newName = hasNewName ? normalizeTagName(body.newName) : null;
    if (hasNewName && !newName) return reply.code(400).send({ error: "invalid newName" });
    if (hasColor && !isPaletteColor(body.color)) return reply.code(400).send({ error: "color must be a palette entry" });

    const defs = await db.select().from(tagDefinitions).where(eq(tagDefinitions.ownerId, userId));
    const source = defs.find((r: any) => r.name === oldName);
    if (!source) return reply.code(404).send({ error: "not_found" });

    // Recolor only.
    if (!hasNewName || newName === oldName) {
      if (!hasColor) return { tag: oldName, color: source.color };
      const now = Date.now();
      await db.update(tagDefinitions)
        .set({ color: body.color, updatedAt: now })
        .where(and(eq(tagDefinitions.ownerId, userId), eq(tagDefinitions.name, oldName)));
      return { tag: oldName, color: body.color };
    }

    // Rename (possibly merge).
    const target = defs.find((r: any) => r.name === newName);
    const now = Date.now();

    const rewritePlaces = async () => {
      const rows = await db.select().from(places).where(eq(places.ownerId, userId));
      for (const r of rows) {
        let tags: string[] = [];
        try { tags = JSON.parse(r.tagsJson ?? "[]"); } catch { tags = []; }
        if (!tags.includes(oldName)) continue;
        let next: string[];
        if (target) {
          // merge into target: replace old with target, dedupe
          next = [];
          const seen = new Set<string>();
          for (const t of tags) {
            const mapped = t === oldName ? (newName as string) : t;
            if (seen.has(mapped)) continue;
            seen.add(mapped);
            next.push(mapped);
          }
        } else {
          next = [];
          const seen = new Set<string>();
          for (const t of tags) {
            const mapped = t === oldName ? (newName as string) : t;
            if (seen.has(mapped)) continue;
            seen.add(mapped);
            next.push(mapped);
          }
        }
        await db.update(places).set({ tagsJson: JSON.stringify(next), updatedAt: now }).where(eq(places.id, r.id));
      }
    };

    if (target) {
      // merge: keep target color, drop source
      await rewritePlaces();
      await db.delete(tagDefinitions).where(and(eq(tagDefinitions.ownerId, userId), eq(tagDefinitions.name, oldName))).catch(() => {});
      return { tag: target.name, color: target.color, merged: true };
    }

    const finalColor = hasColor ? body.color : (source.color as string);
    await rewritePlaces();
    await db.delete(tagDefinitions).where(and(eq(tagDefinitions.ownerId, userId), eq(tagDefinitions.name, oldName))).catch(() => {});
    try {
      await db.insert(tagDefinitions).values({
        ownerId: userId, name: newName, color: finalColor, createdAt: (source as any).createdAt ?? now, updatedAt: now,
      });
    } catch {
      // concurrent creation of target between check and insert -> merge instead
      const rows = await db.select().from(places).where(eq(places.ownerId, userId));
      for (const r of rows) {
        let tags: string[] = [];
        try { tags = JSON.parse(r.tagsJson ?? "[]"); } catch { tags = []; }
        if (!tags.includes(oldName)) continue;
        const next: string[] = [];
        const seen = new Set<string>();
        for (const t of tags) {
          const mapped = t === oldName ? (newName as string) : t;
          if (seen.has(mapped)) continue;
          seen.add(mapped);
          next.push(mapped);
        }
        await db.update(places).set({ tagsJson: JSON.stringify(next), updatedAt: now }).where(eq(places.id, r.id));
      }
      await db.delete(tagDefinitions).where(and(eq(tagDefinitions.ownerId, userId), eq(tagDefinitions.name, oldName))).catch(() => {});
      const latest = await db.select().from(tagDefinitions).where(eq(tagDefinitions.ownerId, userId));
      const t2 = latest.find((r: any) => r.name === newName);
      return { tag: newName, color: t2?.color ?? finalColor, merged: true };
    }
    return { tag: newName, color: finalColor };
  });

  app.delete("/api/tags/:name", async (req, reply) => {
    const userId = (req as any).userId as string;
    const rawName = decodeURIComponent((req.params as any).name ?? "");
    const name = normalizeTagName(rawName);
    if (!name) return reply.code(400).send({ error: "invalid tag name" });
    const defs = await db.select().from(tagDefinitions).where(eq(tagDefinitions.ownerId, userId));
    const found = defs.find((r: any) => r.name === name);
    const rows = await db.select().from(places).where(eq(places.ownerId, userId));
    const now = Date.now();
    for (const r of rows) {
      let tags: string[] = [];
      try { tags = JSON.parse(r.tagsJson ?? "[]"); } catch { tags = []; }
      if (!tags.includes(name)) continue;
      const next = tags.filter((t) => t !== name);
      await db.update(places).set({ tagsJson: JSON.stringify(next), updatedAt: now }).where(eq(places.id, r.id));
    }
    if (found) {
      await db.delete(tagDefinitions).where(and(eq(tagDefinitions.ownerId, userId), eq(tagDefinitions.name, name))).catch(() => {});
    }
    // Deleting a zero-count or orphan tag is idempotent success.
    return { ok: true };
  });
}

export { ensureTagDefinitions };
