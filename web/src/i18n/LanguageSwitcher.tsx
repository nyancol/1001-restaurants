import React from "react";
import { useLanguage } from "./LanguageContext";

const LANGS = [
  { id: "en", label: "EN" },
  { id: "fr", label: "FR" },
] as const;

export default function LanguageSwitcher() {
  const { lang, setLanguage, t } = useLanguage();
  return (
    <div className="flex shrink-0 items-center gap-1 text-xs">
      <div className="edge radius-pill flex overflow-hidden border-line" role="group" aria-label={t["language.groupAria"]}>
        {LANGS.map((l) => (
          <button
            key={l.id}
            type="button"
            aria-pressed={lang === l.id}
            onClick={() => setLanguage(l.id)}
            title={l.label}
            aria-label={l.label}
            className={`inline-flex min-h-[36px] items-center px-2 py-1 font-medium ${lang === l.id ? "bg-accent text-accent-ink" : "bg-surface text-muted hover:bg-surface-2"}`}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}
