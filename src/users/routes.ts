import type { FastifyInstance } from "fastify";
import { places, users } from "../db/schema.js";
import { decodeOffset, encodeOffset, envelope, parseLimit } from "../pagination.js";

// User directory for the Users scope picker (`Me`, `Everyone`, each user).
export function registerUserRoutes(app: FastifyInstance, deps: { db: any }) {
  const { db } = deps;
  app.get(
    "/api/v1/users",
    {
      schema: {
        querystring: {
          type: "object",
          properties: { limit: { type: "string" }, cursor: { type: "string" } },
        },
      },
    },
    async (req, reply) => {
      const limit = parseLimit((req.query as any)?.limit);
      const offset = decodeOffset((req.query as any)?.cursor);
      if (offset === null) return reply.code(400).send({ error: "invalid_cursor" });
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
        return String(a.displayName).localeCompare(String(b.displayName), undefined, {
          sensitivity: "base",
        });
      });
      const total = out.length;
      const slice = out.slice(offset, offset + limit);
      const nextCursor = offset + limit < total ? encodeOffset(offset + limit) : null;
      return envelope(slice, limit, nextCursor, total);
    },
  );
}
