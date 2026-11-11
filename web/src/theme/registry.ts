export type ThemeId = "xp" | "retro";
export type ModeId = "light" | "dark";

export const THEMES: { id: ThemeId; label: string }[] = [
  { id: "xp", label: "XP" },
  { id: "retro", label: "Retro" },
];

export const MODES: { id: ModeId; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

export const THEME_STORAGE_KEY = "oyster-theme";
export const MODE_STORAGE_KEY = "oyster-mode";

export function getInitialTheme(): ThemeId {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === "xp" || v === "retro") return v;
  } catch {
    // ignore
  }
  return "xp";
}

export function getInitialMode(): ModeId {
  try {
    const v = localStorage.getItem(MODE_STORAGE_KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    // ignore
  }
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}
