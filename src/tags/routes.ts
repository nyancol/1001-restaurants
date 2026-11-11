import type { FastifyInstance } from "fastify";
import { desc, eq } from "drizzle-orm";
import { places } from "../db/schema.js";

// Scoped contract (own totals): returns tags from the authenticated user's
// own places only, ranked by total usage count desc then recency desc.
// `q` is optional; empty/missing returns the full ranked list.
// Each entry is `{ tag, count }` where count = number of the user's places carrying the tag.
export function registerTagRoutes(app: FastifyInstance, deps: { db: any }) {
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
    const rows = await db.select().from(places).where(eq(places.ownerId, userId)).orderBy(desc(places.updatedAt));
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
    let out = [...counts.entries()].map(([tag, v]) => ({ tag, count: v.count, lastUsed: v.lastUsed }));
    if (q) out = out.filter((t) => t.tag.startsWith(q) || t.tag.includes(q));
    out.sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed);
    return { tags: out.map(({ tag, count }) => ({ tag, count })) };
  });
}
