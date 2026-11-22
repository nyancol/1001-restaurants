/**
 * Client mirror of server TAG_PALETTE (see src/tags/palette.ts — keep in sync).
 * Viewer-color resolution: myDefinition ?? deterministic fallback hash.
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

export function stableHash(name: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function colorForTag(name: string): string {
  return TAG_PALETTE[stableHash(name) % TAG_PALETTE.length];
}

/** Viewer-color rule: own definition wins, else deterministic fallback. */
export function resolveTagColor(
  name: string,
  definitions: Map<string, string> | Record<string, string> | { tag: string; color: string }[],
): string {
  if (Array.isArray(definitions)) {
    const found = definitions.find((d) => d.tag === name);
    if (found?.color) return found.color;
    return colorForTag(name);
  }
  if (definitions instanceof Map) {
    return definitions.get(name) ?? colorForTag(name);
  }
  const record = definitions as Record<string, string> | null | undefined;
  return record && Object.hasOwn(record, name) ? record[name] : colorForTag(name);
}
