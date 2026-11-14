export type PinStatus = "WANT_TO_GO" | "BEEN_TO";

export const TYPE_COLORS: Record<string, string> = {
  restaurant: "#D64545",
  "café": "#8B5E34",
  bar: "#7C5CBF",
  bakery: "#D9932B",
};

const FALLBACK = ["#2E7CF6", "#3FA15A", "#D9932B", "#4FA3A3", "#C86AA0"];

export function colorForType(type: string): string {
  const t = (type ?? "").trim().toLowerCase() || "restaurant";
  if (TYPE_COLORS[t]) return TYPE_COLORS[t];
  let h = 0;
  for (const c of t) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return FALLBACK[h % FALLBACK.length];
}

export const TYPE_EMOJI: Record<string, string> = {
  restaurant: "🍴",
  "café": "☕",
  bar: "🍸",
  bakery: "🥖",
};

const TYPE_LETTERS: Record<string, string> = {
  restaurant: "R",
  "café": "C",
  bar: "B",
  bakery: "P",
};

export function emojiFor(type: string): string {
  return TYPE_EMOJI[(type ?? "").trim().toLowerCase()] ?? "📍";
}

/** Letter drawn inside the map pin (reliable in canvas images, unlike emoji). */
export function glyphFor(type: string): string {
  const t = (type ?? "").trim().toLowerCase();
  return TYPE_LETTERS[t] ?? "•";
}

/** Mirror of CSS contract for canvas pins. Fill encodes place type; icon adds a second channel. */
export function pinsFor(_theme: string, _mode: string, typeOrStatus: string): string {
  return colorForType(typeOrStatus);
}

function dropSvg(fill: string, letter: string): string {
  const safe = letter.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48"><path d="M18 1 C9 1 2.5 7.5 2.5 15.5 C2.5 26 18 47 18 47 C18 47 33.5 26 33.5 15.5 C33.5 7.5 27 1 18 1 Z" fill="${fill}" stroke="white" stroke-width="2.5"/><circle cx="18" cy="15.5" r="8.5" fill="white" fill-opacity="0.92"/><text x="18" y="20" font-size="11" font-weight="700" font-family="system-ui,sans-serif" text-anchor="middle" fill="${fill}">${safe}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const ADDED = new Set<string>();

export function knownTypes(): string[] {
  return ["restaurant", "café", "bar", "bakery"];
}

async function addImage(map: any, mode: string, name: string, url: string): Promise<void> {
  if (ADDED.has(`${mode}:${name}`) && map.hasImage?.(name)) return;
  await new Promise<void>((resolve) => {
    const img = new Image(36, 48);
    img.onload = () => {
      try {
        if (!map.hasImage?.(name)) map.addImage(name, img);
        ADDED.add(`${mode}:${name}`);
      } catch {
        // ignore re-add races
      }
      resolve();
    };
    img.onerror = () => resolve();
    img.src = url;
  });
}

export async function ensurePinImages(map: any, mode: string, extraTypes: string[] = []): Promise<void> {
  const all = [...new Set([...knownTypes(), ...extraTypes.map((t) => (t ?? "").trim().toLowerCase()).filter(Boolean)])];
  const defs: [string, string][] = all.map((t) => [`drop-${t}`, dropSvg(colorForType(t), glyphFor(t))]);
  defs.push(["drop-generic", dropSvg("#666666", "•")]);
  // Back-compat: old status-based names resolve to neutral type fills.
  defs.push(["drop-WANT_TO_GO", dropSvg(colorForType("restaurant"), glyphFor("restaurant"))]);
  defs.push(["drop-BEEN_TO", dropSvg(colorForType("café"), glyphFor("café"))]);
  await Promise.all(defs.map(([name, url]) => addImage(map, mode, name, url)));
}

export function pinImageFor(placeType: string): string {
  const t = (placeType ?? "").trim().toLowerCase() || "restaurant";
  if (knownTypes().includes(t)) return `drop-${t}`;
  return "drop-generic";
}
