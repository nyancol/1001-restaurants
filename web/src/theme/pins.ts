import { ICON_SVG, ICON_IDS } from "./iconSvg";

export type PinStatus = "WANT_TO_GO" | "BEEN_TO";

export const PIN_FILL = "#1F6F5B";

export const ICONS = [...ICON_IDS];

export const ICON_EMOJI: Record<string, string> = {
  fork: "🍴",
  burger: "🍔",
  pizza: "🍕",
  soup: "🍲",
  hotdog: "🌭",
  bagel: "🥯",
  croissant: "🥐",
  "ice-cream": "🍨",
  cocktail: "🍸",
  wine: "🍷",
  beer: "🍺",
  coffee: "☕",
};

// Back-compat shims for removed type vocabulary.
export const TYPE_COLORS: Record<string, string> = {
  restaurant: PIN_FILL,
  café: PIN_FILL,
  cafe: PIN_FILL,
  bar: PIN_FILL,
  bakery: PIN_FILL,
  fork: PIN_FILL,
  burger: PIN_FILL,
  pizza: PIN_FILL,
  soup: PIN_FILL,
  hotdog: PIN_FILL,
  bagel: PIN_FILL,
  croissant: PIN_FILL,
  "ice-cream": PIN_FILL,
  cocktail: PIN_FILL,
  wine: PIN_FILL,
  beer: PIN_FILL,
  coffee: PIN_FILL,
};

export const TYPE_EMOJI: Record<string, string> = { ...ICON_EMOJI };

export function colorForType(_type: string): string {
  return PIN_FILL;
}

export function emojiFor(icon: string): string {
  return ICON_EMOJI[(icon ?? "").trim().toLowerCase()] ?? "📍";
}

/** Icon glyph id drawn inside the map pin (bold vector path, not emoji). */
export function glyphFor(icon: string): string {
  const t = (icon ?? "").trim().toLowerCase() || "fork";
  return (ICONS as string[]).includes(t) ? t : "fork";
}

/** Inner SVG markup for an icon id (single-color silhouette). */
export function iconSvgFor(icon: string): string {
  const t = (icon ?? "").trim().toLowerCase() || "fork";
  return ICON_SVG[t] ?? ICON_SVG.fork;
}

/** Mirror of CSS contract for canvas pins. Single neutral fill. */
export function pinsFor(_iconOrStatus: string): string {
  return PIN_FILL;
}

function dropSvg(fill: string, iconId: string): string {
  const inner = ICON_SVG[iconId] ?? ICON_SVG.fork;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48"><path d="M18 1 C9 1 2.5 7.5 2.5 15.5 C2.5 26 18 47 18 47 C18 47 33.5 26 33.5 15.5 C33.5 7.5 27 1 18 1 Z" fill="${fill}" stroke="white" stroke-width="2.5"/><circle cx="18" cy="15.5" r="9.5" fill="white"/><g transform="translate(11, 8.5) scale(0.5833)" fill="none" color="${fill}" stroke="${fill}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">${inner}</g></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const ADDED = new Set<string>();

export function knownTypes(): string[] {
  return [...ICONS];
}

export function knownIcons(): string[] {
  return [...ICONS];
}

async function addImage(map: any, name: string, url: string): Promise<void> {
  if (ADDED.has(name) && map.hasImage?.(name)) return;
  await new Promise<void>((resolve) => {
    const img = new Image(36, 48);
    img.onload = () => {
      try {
        if (!map.hasImage?.(name)) map.addImage(name, img);
        ADDED.add(name);
      } catch {
        // ignore re-add races
      }
      resolve();
    };
    img.onerror = () => resolve();
    img.src = url;
  });
}

export async function ensurePinImages(map: any, extraTypes: string[] = []): Promise<void> {
  const all = [
    ...new Set([
      ...knownIcons(),
      ...extraTypes.map((t) => (t ?? "").trim().toLowerCase()).filter(Boolean),
    ]),
  ];
  const defs: [string, string][] = all.map((t) => [`drop-${t}`, dropSvg(PIN_FILL, glyphFor(t))]);
  defs.push(["drop-generic", dropSvg(PIN_FILL, "🍴")]);
  // Legacy aliases: old type/status pin names resolve to new icons.
  defs.push(["drop-restaurant", dropSvg(PIN_FILL, glyphFor("fork"))]);
  defs.push(["drop-café", dropSvg(PIN_FILL, glyphFor("coffee"))]);
  defs.push(["drop-bar", dropSvg(PIN_FILL, glyphFor("cocktail"))]);
  defs.push(["drop-bakery", dropSvg(PIN_FILL, glyphFor("croissant"))]);
  defs.push(["drop-WANT_TO_GO", dropSvg(PIN_FILL, glyphFor("fork"))]);
  defs.push(["drop-BEEN_TO", dropSvg(PIN_FILL, glyphFor("coffee"))]);
  await Promise.all(defs.map(([name, url]) => addImage(map, name, url)));
}

export function pinImageFor(icon: string): string {
  const t = (icon ?? "").trim().toLowerCase() || "fork";
  if ((knownIcons() as string[]).includes(t)) return `drop-${t}`;
  return "drop-generic";
}
