// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { LanguageProvider, getInitialLanguage, LANG_STORAGE_KEY, useLanguage } from "./LanguageContext";

function langOf(nav: string | undefined, stored: string | null): string {
  const navDesc = Object.getOwnPropertyDescriptor(window.navigator, "language");
  Object.defineProperty(window.navigator, "language", { value: nav ?? "en-US", configurable: true });
  try {
    if (stored === null) localStorage.removeItem(LANG_STORAGE_KEY);
    else localStorage.setItem(LANG_STORAGE_KEY, stored);
  } catch { /* ignore */ }
  const out = getInitialLanguage();
  if (navDesc) Object.defineProperty(window.navigator, "language", navDesc);
  return out;
}

describe("getInitialLanguage", () => {
  afterEach(() => { cleanup(); localStorage.clear(); });
  it("maps fr* to fr", () => expect(langOf("fr-FR", null)).toBe("fr"));
  it("maps en* to en", () => expect(langOf("en-US", null)).toBe("en"));
  it("falls back to en otherwise", () => expect(langOf("de-DE", null)).toBe("en"));
  it("stored value wins over navigator", () => expect(langOf("fr-FR", "en")).toBe("en"));
});

describe("LanguageProvider fr", () => {
  afterEach(() => { cleanup(); localStorage.clear(); });
  it("renders French strings and sets lang=fr with toggle back to en", () => {
    localStorage.setItem(LANG_STORAGE_KEY, "fr");
    document.documentElement.lang = "en";
    function Probe() {
      const { t, lang, setLanguage } = useLanguage();
      return (
        <div>
          <span>{t["filter.title"]}</span>
          <span>{t["empty.noPlaces"]}</span>
          <button type="button" onClick={() => setLanguage("en")}>to-en</button>
          <span data-testid="lang">{lang}</span>
        </div>
      );
    }
    render(<LanguageProvider><Probe /></LanguageProvider>);
    expect(document.documentElement.lang).toBe("fr");
    expect(screen.getByText("Filtres")).toBeTruthy();
    expect(screen.getByText("Aucun lieu pour le moment")).toBeTruthy();
    expect(screen.getByTestId("lang").textContent).toBe("fr");
    fireEvent.click(screen.getByText("to-en"));
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe("en");
    expect(document.documentElement.lang).toBe("en");
    expect(screen.getByText("Filters")).toBeTruthy();
  });
});
