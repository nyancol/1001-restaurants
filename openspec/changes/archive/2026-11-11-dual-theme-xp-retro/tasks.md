# Tasks

## 1. Token foundation and theme registry

- [x] 1.1 Add `web/src/theme/tokens.css` with all contract vars + `@theme inline` role utilities and verify `npm run build:web` succeeds with no utility errors
- [x] 1.2 Add `web/src/theme/themes/xp.css`, `retro.css`, `modes/light.css`, `dark.css` with example fills from design and verify each file defines every contract var via visual inspection
- [x] 1.3 Add theme registry + `ThemeContext` setting `data-theme`/`data-mode` on `<html>` and verify unit test renders provider and toggles attributes
- [x] 1.4 Add contract test asserting every theme file defines all vars and verify `npm test` passes

## 2. Component migration to roles

- [x] 2.1 Migrate App shell, header, ListPage, FilterBar, PlaceCard to `bg-surface/text-ink/border-line` roles and verify `npm run build:web` plus visual check in xp-light shows no raw slate/black remnants
- [x] 2.2 Migrate AddPage, PlaceEditor, TagCombobox, Stars, auth and empty states including themed danger/info banners and verify error banner + duplicate info render in all 4 variants with readable contrast
- [x] 2.3 Apply per-theme radius/edge/fonts/shadows (XP 4px/1px Tahoma, retro 14px/2px display+mono) and verify cards/pills/inputs match design sketch in both themes

## 3. Switcher persistence and FOUC

- [x] 3.1 Add header `[XP|Retro]` segmented + `[Light|Dark]` toggle wired to context and verify switching restyles without reload or filter loss
- [x] 3.2 Add `localStorage` persistence with OS `prefers-color-scheme` default and verify reload restores choice and first visit follows OS in dev
- [x] 3.3 Add inline `index.html` pre-React theme script and verify no flash on hard reload with cache disabled in both modes

## 4. Map pins and chrome

- [x] 4.1 Replace `circle` pins with tip-anchored `symbol` drop sprites (`icon-anchor: bottom`) preserving amber/green status and circle clusters, verify pins render at Paris zooms 11-16 with tips at coords
- [x] 4.2 Add JS `pinsFor(theme,mode,status)` mirror + themed selection state and verify selection highlight distinct in all 4 variants without viewport move
- [x] 4.3 Theme bottom sheet, fit button, banners, and MapLibre controls via vars (tiles untouched) and verify controls/sheet match theme in light and dark

## 5. Integration verification

- [x] 5.1 Run `npm test`, `npm run typecheck`, `npm run build` and verify all green
- [x] 5.2 Visual QA all 4 variants across list, map, add, auth, error/info, empty states and verify contrast and pin legibility, logging fixes as follow-ups
