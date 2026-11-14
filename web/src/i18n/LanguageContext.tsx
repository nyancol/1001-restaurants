import React from "react";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { en, type Dict } from "./en";
import { fr } from "./fr";

export type Lang = "en" | "fr";

export const LANG_STORAGE_KEY = "oyster-lang";

export function localeFor(lang: Lang): string {
  return lang === "fr" ? "fr-FR" : "en-US";
}

function detectLanguage(): Lang {
  try {
    const nav = typeof navigator !== "undefined" ? navigator.language.toLowerCase() : "";
    if (nav.startsWith("fr")) return "fr";
    if (nav.startsWith("en")) return "en";
  } catch {
    // ignore
  }
  return "en";
}

export function getInitialLanguage(): Lang {
  try {
    const v = localStorage.getItem(LANG_STORAGE_KEY);
    if (v === "en" || v === "fr") return v;
  } catch {
    // ignore
  }
  return detectLanguage();
}

interface LangCtx {
  lang: Lang;
  locale: string;
  t: Dict;
  setLanguage: (l: Lang) => void;
}

const Ctx = createContext<LangCtx>({ lang: "en", locale: "en-US", t: en, setLanguage: () => {} });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => getInitialLanguage());

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  }, [lang]);

  const setLanguage = useCallback((l: Lang) => setLangState(l), []);

  const t = lang === "fr" ? fr : en;
  const locale = localeFor(lang);

  return <Ctx.Provider value={{ lang, locale, t, setLanguage }}>{children}</Ctx.Provider>;
}

export function useLanguage() {
  return useContext(Ctx);
}
