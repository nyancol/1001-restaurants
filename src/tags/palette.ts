/**
 * Fixed 32-color accessible palette for user-owned tags.
 *
 * Choice: hand-tuned mid-tone hues spaced around the color wheel.
 * Dots render on neutral pills (never colored text), so contrast is safe
 * in light + dark mode; color is decorative only (label always present).
 * Server validates `color IN PALETTE` (400 otherwise); client mirrors it.
 * Keep in sync with `web/src/lib/tagPalette.ts`.
 */
export const TAG_PALETTE = [
  "#D64545",
  "#E67E22",
  "#D9932B",
  "#C9A227",
  "#8BA634",
  "#5BA829",
  "#2FA84F",
  "#12A594",
  "#0E9D9B",
  "#0090FF",
  "#3E63DD",
  "#6E56CF",
  "#8E4EC6",
  "#AD4E9D",
  "#D6409F",
  "#E93D82",
  "#F2555A",
  "#8B5E34",
  "#7C5CBF",
  "#6B7280",
  "#4D7C0F",
  "#0F766E",
  "#0E7490",
  "#1D4ED8",
  "#7C3AED",
  "#A21CAF",
  "#BE123C",
  "#9A3412",
  "#3F6212",
  "#134E4A",
  "#1E3A8A",
  "#581C87",
] as const;

export type TagColor = (typeof TAG_PALETTE)[number];

export function isPaletteColor(color: unknown): color is TagColor {
  return typeof color === "string" && (TAG_PALETTE as readonly string[]).includes(color);
}

/**
 * FNV-1a 32-bit hash (stable across processes; no per-process salt).
 * Used for deterministic backfill: PALETTE[hash(name) % 32].
 */
export function stableHash(name: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function colorForTag(name: string): TagColor {
  return TAG_PALETTE[stableHash(name) % TAG_PALETTE.length];
}

export function randomPaletteColor(exclude?: Set<string>): TagColor {
  const available = exclude?.size
    ? TAG_PALETTE.filter((c) => !exclude!.has(c))
    : [...TAG_PALETTE];
  const pool = available.length ? available : [...TAG_PALETTE];
  return pool[Math.floor(Math.random() * pool.length)];
}
