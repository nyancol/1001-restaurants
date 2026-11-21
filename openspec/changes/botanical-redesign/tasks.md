# Tasks

## 1. Design tokens + Stitch sync

- [x] 1.1 Save Botanical designMd to `DESIGN.md`, run `stitch upload design DESIGN.md`, verify `stitch status --flow=design` is READY with screenshots of both Stitch screens archived in change.
- [x] 1.2 Add `web/src/theme/themes/botanical.css` (light+dark butter/forest roles, Literata+Nunito Sans, 12px radii, warm shadow) and verify `npm run typecheck` passes and ThemeSwitcher lists botanical.
- [x] 1.3 Flip default to `botanical` in `registry.ts`, `ThemeContext`, `web/index.html` boot, import in `index.css`, verify reload with empty localStorage renders botanical and xp/retro still selectable without flash.

## 2. App shell branding

- [x] 2.1 Restyle `App.tsx` header (cloche mark, In my Belly + subtitle, + New Memory `/add`, bell dot, user chip with entry count) and butter footer (tagline + 3 guide links + ©), verify desktop + phone header/footer match screenshots and logout/login still work.
- [x] 2.2 Update `ViewToggle` to journal card/grid toggle style and `OwnerPicker` to Me/Friends segmented with counts, verify scope switching still drives list+map fetch and `npm test` related suites pass.

## 3. Journal rail + feed

- [x] 3.1 Rework `SplitPage.tsx` to lg 3-pane grid (280px rail / feed / 1.2x map, sticky rail+map) reusing single `usePlaceFilters`+`usePlaces`, verify pin→card scroll and card→pin highlight work.
- [x] 3.2 Restyle `FilterBar layout=rail` to journal rail (search ⌘K, LISTS & STATE with live counts, TAGS cloud + add input + reset) and `ListPage` phone stacking, verify clear-all resets status/tags/q/openAt and tests in `TagCombobox.test` still pass.
- [x] 3.3 Restyle `PlaceListPane` + `PlaceCard` to journal cards (title+★ honey pill+Been/Want pill, butter quote wash, photo placeholders, address•price•visited footer, tag pills, hide missing) and verify `vitest run` card/list suites pass + visual check vs Le Servan/Clamato cards.
- [x] 3.4 Add feed header (Saved Tables (N) + Recently Saved sort + card/grid toggle with working sort) and themed empty state with New Memory CTA, verify sort toggle preserves filters.

## 4. Edit mode + map preview

- [x] 4.1 Rework `PlaceEditor` to Clamato edit mode (Editing place badge, Want/Bееn segmented, VISITS stepper, ICON row, TAGS box + suggestions + count, stars + `x.x / 5.0` + label, NOTE textarea, Delete/Cancel/Save), verify save/cancel/delete flows + `ConfirmDialog` still work and failed save shows inline error.
- [x] 4.2 Add `MapPreviewCard.tsx`, restyle `MapView` chrome (location + RE-CENTER, Artisan/Transit, +/- , rounded warm container) with preview CTA scrolling to feed card, verify locate/fit/cluster/selection unchanged and OSM attribution retained.
- [x] 4.3 Polish phone `/map` bottom sheet + `SplitPage` responsive (`<lg` rail→feed stack, Tags scroll), verify `useMediaQuery` breakpoints and no horizontal overflow at 360px.

## 5. Integration check

- [x] 5.1 Run `npm run typecheck`, `npm test`, `npm run build:web`, fix regressions, and capture before/after screenshots (desktop journal, edit mode, phone list, phone map) attached to change for review.
