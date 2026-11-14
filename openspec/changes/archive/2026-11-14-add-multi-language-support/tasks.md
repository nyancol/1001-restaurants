# Tasks

## 1. i18n foundation

- [x] 1.1 Create `web/src/i18n/en.ts` string inventory covering App/login/footer, filters, list/map/add, cards, editor, comboboxes, validation/lookup/refresh/share messages, duplicate prompts, placeholders, aria/title, theme-modeswitcher labels, and verify `npx tsc --noEmit` passes on the new file.
- [x] 1.2 Create `web/src/i18n/fr.ts` typed as `typeof en` with full French copy (functions for interpolated strings) and verify `npx tsc --noEmit` fails if any key is removed.
- [x] 1.3 Implement `web/src/i18n/LanguageContext.tsx` with `getInitialLanguage` (storage → `navigator.language` prefix → EN), `LanguageProvider` persisting `oyster-lang` and syncing `document.documentElement.lang`, and verify with a unit test that `fr-FR`→fr, `en-US`→en, `de-DE`→en and stored value wins.
- [x] 1.4 Implement `web/src/i18n/LanguageSwitcher.tsx` EN|FR pill (role group `language`, `aria-pressed`) and wire `LanguageProvider` in `web/src/main.tsx`, and verify toggle switches `localStorage` and `document.documentElement.lang`.

## 2. UI string migration

- [x] 2.1 Migrate `App.tsx`, footer, login/dev-login, and `ThemeSwitcher` labels to `useLanguage()` and verify EN/FR render of header, login, logout, and footer by inspection.
- [x] 2.2 Migrate filters + list/map/split views (`FilterBar.tsx`, `ListPage.tsx`, `MapPage.tsx`, `SplitPage.tsx`, `ViewToggle.tsx`, `OwnerPicker.tsx`, `PlaceListPane.tsx`, `MapView.tsx`) including empty states and `GEO_FALLBACK_NOTE`, and verify FR pass shows no English chrome.
- [x] 2.3 Migrate add flow + editor inputs (`AddPage.tsx`, `PlaceEditor.tsx`, `LookupField.tsx`, `TypeCombobox.tsx`, `TagCombobox.tsx`, `Stars.tsx`) including validation, placeholders, aria-labels, and translated `window.confirm()` texts, and verify duplicate-place and validation paths in both languages.
- [x] 2.4 Migrate card + API-code mappings (`PlaceCard.tsx` refresh/share/toasts, `lib/api.ts` consumers) so backend codes stay unchanged and only frontend text translates, and verify 422/429/503/403 mappings render translated.

## 3. Locale-aware shell

- [x] 3.1 Bind `formatOpenAt`/`dayLabel` in `FilterBar.tsx` to the active locale (`fr-FR`/`en-US`) without changing `HH:MM` input parsing, and verify French weekday/month names plus unchanged 24h input behavior.
- [x] 3.2 Place `LanguageSwitcher` next to `ThemeSwitcher` in the `App.tsx` footer for all authenticated views and verify layout on mobile and desktop (`lg:` breakpoint) without overlap.

## 4. Tests and verification

- [x] 4.1 Pin existing component tests (`TagCombobox.test.tsx`, `usePlaces.test.tsx`) to English provider and add one French render test asserting key translated strings and `lang="fr"`, and verify `npm test` passes.
- [x] 4.2 Run full verification — `npm run typecheck`, `npm test`, French/English click-through of login, filters, add/validation, duplicate confirm, refresh/share, reload persistence — and verify no English chrome remains in FR and no French remains in EN.
