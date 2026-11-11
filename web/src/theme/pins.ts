export type PinStatus = "WANT_TO_GO" | "BEEN_TO";

const WANT_LIGHT = "#F5B942";
const BEEN_LIGHT = "#3FA15A";
const BEEN_DARK = "#4CC07A";

/** Mirror of CSS contract for canvas pins. Theme param kept for future venue-type coding. */
export function pinsFor(_theme: string, mode: string, status: string): string {
  if (status === "BEEN_TO") return mode === "dark" ? BEEN_DARK : BEEN_LIGHT;
  return WANT_LIGHT;
}

function dropSvg(fill: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48"><path d="M18 1 C9 1 2.5 7.5 2.5 15.5 C2.5 26 18 47 18 47 C18 47 33.5 26 33.5 15.5 C33.5 7.5 27 1 18 1 Z" fill="${fill}" stroke="white" stroke-width="2.5"/><circle cx="18" cy="15.5" r="5.5" fill="white"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const ADDED = new Set<string>();

export async function ensurePinImages(map: any, mode: string): Promise<void> {
  const defs: [string, string][] = [
    ["drop-WANT_TO_GO", dropSvg(pinsFor("xp", mode, "WANT_TO_GO"))],
    ["drop-BEEN_TO", dropSvg(pinsFor("xp", mode, "BEEN_TO"))],
  ];
  await Promise.all(
    defs.map(
      ([name, url]) =>
        new Promise<void>((resolve) => {
          if (ADDED.has(`${mode}:${name}`) && map.hasImage?.(name)) return resolve();
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
        }),
    ),
  );
}
