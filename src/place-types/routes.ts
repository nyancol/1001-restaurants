import type { FastifyInstance } from "fastify";
import { desc } from "drizzle-orm";
import { places } from "../db/schema.js";
import { normalizePlaceType, PLACE_TYPES } from "./looks.js";

export function registerPlaceTypeRoutes(app: FastifyInstance, deps: { db: any }) {
  const { db } = deps;
  app.get("/api/place-types", {
    schema: {
      querystring: {
        type: "object",
        properties: { q: { type: "string" } },
      },
    },
  }, async (req) => {
    const q = ((req.query as any)?.q as string | undefined)?.trim().toLowerCase() ?? "";
    const rows = await db.select().from(places).orderBy(desc(places.updatedAt));
    const counts = new Map<string, { count: number; lastUsed: number }>();
    for (const t of PLACE_TYPES) counts.set(t, { count: 0, lastUsed: 0 });
    for (const r of rows) {
      const t = normalizePlaceType((r as any).placeType ?? "");
      if (!t || !counts.has(t)) continue;
      const cur = counts.get(t)!;
      cur.count += 1;
      cur.lastUsed = Math.max(cur.lastUsed, (r as any).updatedAt ?? 0);
    }
    let out = [...counts.entries()].map(([type, v]) => ({ type, count: v.count }));
    if (q) out = out.filter((t) => t.type.toLowerCase().startsWith(q) || t.type.toLowerCase().includes(q));
    return { placeTypes: out };
  });
}
