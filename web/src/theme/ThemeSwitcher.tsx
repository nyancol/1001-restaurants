import { MODES, THEMES } from "./registry";
import { useTheme } from "./ThemeContext";

export default function ThemeSwitcher() {
  const { theme, mode, setTheme, setMode } = useTheme();
  return (
    <div className="flex shrink-0 items-center gap-1 text-xs">
      <div className="edge radius-pill flex overflow-hidden border-line" role="group" aria-label="theme">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={theme === t.id}
            onClick={() => setTheme(t.id)}
            title={t.label}
            className={`inline-flex min-h-[36px] items-center px-2 py-1 font-medium ${theme === t.id ? "bg-accent text-accent-ink" : "bg-surface text-muted hover:bg-surface-2"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="edge radius-pill flex overflow-hidden border-line" role="group" aria-label="mode">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={mode === m.id}
            onClick={() => setMode(m.id)}
            title={m.id}
            aria-label={m.id}
            className={`inline-flex min-h-[36px] items-center px-2 py-1 font-medium ${mode === m.id ? "bg-accent text-accent-ink" : "bg-surface text-muted hover:bg-surface-2"}`}
          >
            {m.id === "light" ? "☀️" : "🌙"}
          </button>
        ))}
      </div>
    </div>
  );
}
