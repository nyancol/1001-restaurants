import { and, eq } from "drizzle-orm";
import { tagDefinitions } from "../db/schema.js";
import { normalizeTags } from "./normalize.js";
import { colorForTag, isPaletteColor, randomPaletteColor } from "./palette.js";

export function normalizeTagName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim().toLowerCase();
  return t ? t : null;
}

/** Ensure definitions exist for each name; creates missing with random palette colors. */
export async function ensureTagDefinitions(
  db: any,
  ownerId: string,
  names: string[],
): Promise<void> {
  const normalized = normalizeTags(names);
  if (!normalized.length) return;
  const existing = await db
    .select()
    .from(tagDefinitions)
    .where(eq(tagDefinitions.ownerId, ownerId));
  const have = new Set(existing.map((r: any) => r.name as string));
  const missing = normalized.filter((n) => !have.has(n));
  if (!missing.length) return;
  const usedColors = new Set<string>(existing.map((r: any) => r.color as string));
  const now = Date.now();
  for (const name of missing) {
    const color = randomPaletteColor(usedColors);
    usedColors.add(color);
    try {
      await db
        .insert(tagDefinitions)
        .values({ ownerId, name, color, createdAt: now, updatedAt: now });
    } catch {
      // race: unique (ownerId, name) — treat as idempotent success
    }
  }
}

export function deterministicColor(name: string): string {
  return colorForTag(name);
}

export function assertPaletteColor(color: unknown): string | null {
  return isPaletteColor(color) ? (color as string) : null;
}

/** Rewrite helper: replace oldName with newName across owner's places (dedupe). */
export function rewriteTagInList(
  tags: string[],
  oldName: string,
  newName: string | null,
): string[] {
  if (newName == null) {
    return tags.filter((t) => t !== oldName);
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of tags) {
    const mapped = t === oldName ? newName : t;
    if (!mapped || seen.has(mapped)) continue;
    seen.add(mapped);
    out.push(mapped);
  }
  // ensure newName present even if oldName wasn't (defensive; callers filter by oldName)
  if (!seen.has(newName)) {
    out.push(newName);
  }
  return out;
}
