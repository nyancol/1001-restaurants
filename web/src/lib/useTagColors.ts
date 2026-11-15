import { useEffect, useState } from "react";
import { getTags } from "./api";
import { colorForTag } from "./tagPalette";

export const TAG_COLORS_EVENT = "oyster:tags-changed";

let cache: Map<string, string> | null = null;
let inflight: Promise<Map<string, string>> | null = null;

export function invalidateTagColors() {
  cache = null;
  inflight = null;
  try {
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
      window.dispatchEvent(new CustomEvent(TAG_COLORS_EVENT));
    }
  } catch { /* ignore */ }
}

async function loadColors(): Promise<Map<string, string>> {
  if (cache) return cache;
  if (!inflight) {
    inflight = getTags("")
      .then((tags) => {
        cache = new Map(tags.map((t) => [t.tag, t.color]));
        return cache;
      })
      .catch(() => {
        cache = new Map();
        return cache;
      })
      .finally(() => {
        inflight = null;
      }) as Promise<Map<string, string>>;
  }
  return inflight;
}

export function useTagColors() {
  const [colors, setColors] = useState<Map<string, string>>(() => cache ?? new Map());
  useEffect(() => {
    let cancelled = false;
    loadColors().then((m) => {
      if (!cancelled) setColors(new Map(m));
    });
    function onChange() {
      loadColors().then((m) => {
        if (!cancelled) setColors(new Map(m));
      });
    }
    window.addEventListener(TAG_COLORS_EVENT, onChange);
    return () => {
      cancelled = true;
      window.removeEventListener(TAG_COLORS_EVENT, onChange);
    };
  }, []);
  return colors;
}

export function colorForDisplay(name: string, colors?: Map<string, string>): string {
  return colors?.get(name) ?? colorForTag(name);
}
