# Design

## Context

See proposal.md Why. Current state: Vite + React SPA with hardcoded English strings across ~15 files (`web/src/App.tsx`, `web/src/pages/*`, `web/src/components/*`); theme preference via `ThemeContext.tsx` + `registry.ts` + `ThemeSwitcher.tsx` with `localStorage` keys; backend returns machine error codes mapped to human text in the frontend (e.g. `PlaceCard.tsx`). Dates use `Intl.DateTimeFormat(undefined, …)` (system locale) in `FilterBar.tsx`. Tests assert on rendered English text.

## Goals / Non-Goals

**Goals:**
- Zero-dependency EN/FR dictionaries with compile-time completeness and a context mirroring the theme pattern.
- Detection + 2-state persisted override with no flash of the wrong language.
- Locale-bound date display without changing input parsing.

**Non-Goals:**
- No `react-i18next` / detector packages; no backend `Accept-Language` negotiation; no translation of user content or Google data; no RTL, plural-rule engine, or translator tooling.

## Decisions

- **Hand-rolled `web/src/i18n/` module over `react-i18next`**: `en.ts` as source of truth, `fr.ts` typed as `typeof en` so a missing key is a compile error; `LanguageContext.tsx` (`useLanguage()` + `LanguageProvider`) mirroring `ThemeContext`; `LanguageSwitcher.tsx` pill reusing `ThemeSwitcher` classes. Rationale: ~150 keys, 2 languages — a dep adds config without payoff. Alternative considered: `react-i18next` — deferred until 3+ languages or external translators.
- **Resolution order: storage → `navigator.language` prefix → EN**: `getInitialLanguage()` reads `localStorage["oyster-lang"]` (`en`/`fr`), else `navigator.language.toLowerCase().startsWith("fr")` → `fr`, `startsWith("en")` → `en`, else `en`. Rationale: matches "neither → English" exactly; prefix covers `fr-FR`/`fr-CA`/`en-US` etc. No "Auto" state per confirmed 2-state decision.
- **Provider composition in `main.tsx`**: `<LanguageProvider>` alongside `<ThemeProvider>` (inside `BrowserRouter`, order irrelevant); provider sets `document.documentElement.lang` in an effect and persists on `setLanguage`. Rationale: same lifecycle as theme, avoids prop drilling.
- **Interpolation via functions, not a template engine**: dictionary values are `string | ((vars) => string)` for cases like `` `${scopeName} has no places yet` `` and duplicate-place confirms. Rationale: type-safe, no parser; keeps `window.confirm()` callsites translated with native chrome accepted as-is.
- **Dates: bind existing `Intl` to active locale**: replace `new Intl.DateTimeFormat(undefined, …)` with `new Intl.DateTimeFormat(locale, …)` where `locale = lang === "fr" ? "fr-FR" : "en-US"`; `formatOpenAt`/`dayLabel` take locale as arg or read the hook. Input parsing (`normalizeTimeDraft`, `isValid24h`) untouched.
- **Footer placement**: `<ThemeSwitcher /> <LanguageSwitcher />` side by side in `App.tsx` footer with `role="group" aria-label="language"`, `aria-pressed`, `EN | FR` labels. Rationale: confirmed placement; pill styling keeps visual consistency.

## Risks / Trade-offs

- [Stale string risk] New hardcoded English added later bypasses dict → Mitigation: code-review rule + test that pins locale and greps for known-English fallbacks in French render.
- [`window.confirm()` native chrome stays browser-locale] → Mitigation: accepted; message text itself is translated; a custom modal is future work.
- [Google hours/weekday strings stay source-locale] → Mitigation: documented boundary in spec; no attempt to translate.
- [First-paint flash if provider reads storage lazily] → Mitigation: synchronous `useState(getInitialLanguage)` initializer like theme; `lang` attribute set in the same effect as `data-theme`.
- [Test churn on English assertions] → Mitigation: wrap test renders with pinned `LanguageProvider` value (`en`) and add one FR snapshot test.

## Migration Plan

No data migration. Deploy is a pure frontend change; rollback is revert. `localStorage` key is additive — unknown values are ignored and fall back to detection.

## Open Questions

- None that change specs, approach, or tasks. Translator review of the FR copy can happen against the `fr.ts` file after implementation.
