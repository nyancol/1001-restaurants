import type { FastifyInstance } from "fastify";
import { places, users } from "../db/schema.js";

// User directory for the Users scope picker (`Me`, `Everyone`, each user).
// All app users are considered friends: any authenticated user may list them.
// Returns [{ id, displayName, placeCount }] sorted by displayName
// (nulls last, case-insensitive), with placeCount = number of places owned.
export function registerUserRoutes(app: FastifyInstance, deps: { db: any }) {
  const { db } = deps;
  app.get("/api/users", async () => {
    const userRows = await db.select().from(users);
    const placeRows = await db.select().from(places);
    const counts = new Map<string, number>();
    for (const p of placeRows) {
      counts.set(p.ownerId, (counts.get(p.ownerId) ?? 0) + 1);
    }
    const out = userRows.map((u: any) => ({
      id: u.id,
      displayName: u.displayName ?? null,
      placeCount: counts.get(u.id) ?? 0,
    }));
    out.sort((a: any, b: any) => {
      if (a.displayName == null && b.displayName == null) return 0;
      if (a.displayName == null) return 1;
      if (b.displayName == null) return -1;
      return String(a.displayName).localeCompare(String(b.displayName), undefined, { sensitivity: "base" });
    });
    return { users: out };
  });
}
