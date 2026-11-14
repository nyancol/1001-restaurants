import { MODES, THEMES } from "./registry";
import { useTheme } from "./ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";

export default function ThemeSwitcher() {
  const { theme, mode, setTheme, setMode } = useTheme();
  const { t } = useLanguage();
  const themeLabel = (id: string) => (id === "retro" ? t["theme.retro"] : t["theme.xp"]);
  const modeLabel = (id: string) => (id === "dark" ? t["theme.dark"] : t["theme.light"]);
  return (
    <div className="flex shrink-0 items-center gap-1 text-xs">
      <div className="edge radius-pill flex overflow-hidden border-line" role="group" aria-label={t["theme.groupAria"]}>
        {THEMES.map((tm) => (
          <button
            key={tm.id}
            type="button"
            aria-pressed={theme === tm.id}
            onClick={() => setTheme(tm.id)}
            title={themeLabel(tm.id)}
            aria-label={themeLabel(tm.id)}
            className={`inline-flex min-h-[36px] items-center px-2 py-1 font-medium ${theme === tm.id ? "bg-accent text-accent-ink" : "bg-surface text-muted hover:bg-surface-2"}`}
          >
            {themeLabel(tm.id)}
          </button>
        ))}
      </div>
      <div className="edge radius-pill flex overflow-hidden border-line" role="group" aria-label={t["theme.modeAria"]}>
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={mode === m.id}
            onClick={() => setMode(m.id)}
            title={modeLabel(m.id)}
            aria-label={modeLabel(m.id)}
            className={`inline-flex min-h-[36px] items-center px-2 py-1 font-medium ${mode === m.id ? "bg-accent text-accent-ink" : "bg-surface text-muted hover:bg-surface-2"}`}
          >
            {m.id === "light" ? "☀️" : "🌙"}
          </button>
        ))}
      </div>
    </div>
  );
}
