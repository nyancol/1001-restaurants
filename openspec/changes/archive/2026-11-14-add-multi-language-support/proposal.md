# Proposal

## Why

The app UI is hardcoded in English, blocking French-speaking users. Adding English/French with system-language default and a persistent manual override makes the app usable for both audiences without backend changes.

## What Changes

- Detect initial language from `navigator.language` (prefix match): `fr*` → French, `en*` → English, anything else → English.
- Add a 2-state EN | FR language switcher next to the `ThemeSwitcher` in the footer, persisted per device in `localStorage` (e.g. `oyster-lang`). Once set, the stored value wins over detection; no "Auto" reset option.
- Translate all frontend UI chrome (header, login, filters, list/map/add views, cards, editor, comboboxes, validation and lookup/refresh/share messages, placeholders, `aria-label`/`title`, theme/mode labels) via `en` / `fr` dictionaries.
- Localize date/time display with `Intl.DateTimeFormat` bound to the active locale (e.g. `formatOpenAt`, `dayLabel` in `FilterBar.tsx`); keep free-typed 24h `HH:MM` input format unchanged.
- Sync `document.documentElement.lang` with the active language.
- Keep `window.confirm()` duplicate-place prompts translated through the same dictionaries (native dialog chrome itself stays browser-locale).

## Capabilities

### New Capabilities
- `localization`: UI language selection, persistence, dictionary coverage, and locale-aware date formatting for English and French.

### Modified Capabilities
- None. Backend error codes (`not_found`, `forbidden`, `google_*`, …) are unchanged; only frontend mappings are translated. No existing spec requirements change.

## Impact

- Frontend only: new `web/src/i18n/` module (`en.ts`, `fr.ts`, `LanguageContext.tsx`, `LanguageSwitcher.tsx`), wiring in `main.tsx` + `App.tsx` footer, string replacement across ~15 files in `web/src/pages/` and `web/src/components/`.
- No new runtime dependencies (hand-rolled context mirroring `ThemeContext.tsx`, no `react-i18next`).
- User content (names, notes, tags) and Google-sourced data (hours text, ratings, place metadata) are NOT translated.
- Tests asserting on rendered English text (`TagCombobox.test.tsx`, `usePlaces.test.tsx`) need locale pinning.
