/** Fixed place-type vocabulary: restaurant, bar, café. */
export const PLACE_TYPES = ["restaurant", "bar", "café"] as const;
export type PlaceType = (typeof PLACE_TYPES)[number];

const ALIASES: Record<string, PlaceType> = {
  restaurant: "restaurant",
  resto: "restaurant",
  bar: "bar",
  bars: "bar",
  "café": "café",
  cafe: "café",
  coffee: "café",
  "coffee shop": "café",
};

/** Normalize a place type to the fixed vocabulary (accepts cafe/coffee aliases). */
export function normalizePlaceType(input: unknown): string {
  if (typeof input !== "string") return "";
  const t = input.trim().toLowerCase();
  if (!t) return "";
  if ((ALIASES as Record<string, string>)[t]) return ALIASES[t];
  return t;
}

export function isValidPlaceType(t: string): boolean {
  return (PLACE_TYPES as readonly string[]).includes(t);
}

export function defaultLookFor(label: string): { color: string; icon: string } {
  if (label === "restaurant") return { color: "#D64545", icon: "fork" };
  if (label === "café") return { color: "#8B5E34", icon: "cup" };
  if (label === "bar") return { color: "#7C5CBF", icon: "glass" };
  return { color: "#666666", icon: "dot" };
}

export async function ensurePlaceType(db: any, label: string): Promise<void> {
  if (!isValidPlaceType(label)) return;
  const look = defaultLookFor(label);
  const now = Date.now();
  try {
    await db.insert((await import("../db/schema.js")).placeTypes).values({
      label,
      color: look.color,
      icon: look.icon,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoNothing();
  } catch {
    // ignore races / missing table in very old test dbs (migration covers it)
  }
}
