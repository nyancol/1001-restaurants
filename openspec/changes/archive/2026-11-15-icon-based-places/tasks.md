# Tasks

## 1. Backend icon storage and migration

- [x] 1.1 Add `icon` column + migration 5 (add, backfill restaurant→fork/café→coffee/bakery→croissant/bar→cocktail/else→fork, recreate without `place_type`, drop `place_types`) and verify migration applies on fresh and seeded sqlite DBs with legacy rows landing on expected icons
- [x] 1.2 Replace `placeType` validation/filter with `icon` (optional-in, normalized, default `fork`, `400` on unknown `icon` or any `placeType`, ignore `?placeType=`) and verify API tests cover create-default, patch-icon, and placeType-rejected cases
- [x] 1.3 Remove `src/place-types/*` routes/table helpers and `GET /api/place-types`, and verify no references remain (`grep`) and app boots without the route
- [x] 1.4 Add shared `PRIMARY_TYPE_TO_ICON` exact-lookup inference (+ `types[]` scan, miss/null→`fork`) with unit tests for known types, unknown/long-tail→fork, and null, and verify tests pass

## 2. Capture and edit picker

- [x] 2.1 Replace `TypeCombobox` with 12-grid `IconPicker` (emoji + localized aria, preselected, never blocks save) in `AddPage`/`PlaceEditor` with `parseDetails().icon` preselect, and verify manual save without touching picker stores `fork` and override persists
- [x] 2.2 Update `api.ts` `Place` type (`icon`, no `placeType`), `createPlace`/`patchPlace` payloads, `listPlaces` params (drop `placeType`), and `inferIcon`, and verify existing `usePlaces` tests updated and passing

## 3. List, map, and filters

- [x] 3.1 Remove type select/chip from `FilterBar`, drop `placeType` from `usePlaceFilters`/split/map pages, ignore legacy `?placeType=` URLs, and verify list+map show identical unfiltered results with unknown param present
- [x] 3.2 Rework `pins.ts` to single neutral fill + 12 icon glyphs (+ `drop-generic`, legacy `drop-restaurant/bar/café/bakery` aliases) preserving grey/WIP closed styling, and verify `ensurePinImages`/`pinImageFor` tests cover all 12 plus fallback
- [x] 3.3 Render icon alone (no label) in `PlaceCard`, bottom sheet, and desktop panel with localized aria-label/tooltip, and verify cards show icon with no category word in FR and EN

## 4. Localization and refresh contract

- [x] 4.1 Replace removed `type.*`/`filter.type*`/`add.typeRequired` strings with 12 `icon.<id>` FR/EN labels (aria/tooltip/picker-search only), and verify full FR/EN pass shows no visible type words and `document.documentElement.lang` still set
- [x] 4.2 Pin refresh contract: `icon` treated as user field (preserved on refresh, excluded from snapshot columns), update `place-refresh` tests to assert icon preserved, and verify refresh test suite passes

## 5. Integration verification

- [x] 5.1 Run full test suites (backend + web) and fix regressions, and verify `openspec validate --strict` passes for the change
- [x] 5.2 Manual smoke: Google pick preselects icon, override saves, manual place defaults fork, tag edit never changes icon, closed pins grey/WIP on neutral, tag filter replaces old type filtering, and verify each behavior observed in dev
