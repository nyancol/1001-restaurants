import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { getInitialMode, getInitialTheme, MODE_STORAGE_KEY, THEME_STORAGE_KEY, type ModeId, type ThemeId } from "./registry";

interface ThemeCtx {
  theme: ThemeId;
  mode: ModeId;
  setTheme: (t: ThemeId) => void;
  setMode: (m: ModeId) => void;
}

const Ctx = createContext<ThemeCtx>({ theme: "xp", mode: "light", setTheme: () => {}, setMode: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => getInitialTheme());
  const [mode, setModeState] = useState<ModeId>(() => getInitialMode());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.mode = mode;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      localStorage.setItem(MODE_STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  }, [theme, mode]);

  const setTheme = useCallback((t: ThemeId) => setThemeState(t), []);
  const setMode = useCallback((m: ModeId) => setModeState(m), []);

  return <Ctx.Provider value={{ theme, mode, setTheme, setMode }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  return useContext(Ctx);
}
