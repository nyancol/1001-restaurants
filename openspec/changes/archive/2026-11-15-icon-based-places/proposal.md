# Proposal

## Why

The fixed `placeType` taxonomy (restaurant / bar / café / bakery) forces every place into four buckets, blocks saves until a type is picked, and duplicates what tags already express. Replacing it with a small inferred-then-overridable icon set removes a required field, kills a filter nobody needs, and lets pins and cards stay visual without words.

## What Changes

- Add a 12-icon vocabulary: `fork`, `burger`, `pizza`, `soup`, `hotdog`, `bagel`, `croissant`, `ice-cream`, `cocktail`, `wine`, `beer`, `coffee` (emoji: 🍴 🍔 🍕 🍲 🌭 🥯 🥐 🍨 🍸 🍷 🍺 ☕).
- Infer `icon` once at Google-pick time from `primaryType` exact lookup only; miss / null / manual place → `fork`. Inference is frozen afterwards; only the icon picker changes it.
- Replace `TypeCombobox` (required, blocks save) with a 12-grid icon picker (preselected, never blocks save) in capture and edit.
- Store `icon` only on the place; drop the raw Google type. Refresh never touches `icon`.
- Pins use one neutral fill + icon glyph on top; cards/sheets show the icon alone with no label text (aria-label/tooltip only).
- **BREAKING**: remove `placeType` from API (create/patch/list/filter), remove `GET /api/place-types` and the `place_types` table, remove the type filter from FilterBar/URLs. No tag backfill: old category findability moves to user tags at users' pace.
- **BREAKING**: migrate existing rows `restaurant→fork`, `café→coffee`, `bakery→croissant`, `bar→cocktail` (cocktail is the generic nightlife heir; wine/beer fixed by hand).

## Capabilities

### New Capabilities
- `place-icon`: icon vocabulary, primaryType-only frozen inference with fork default, storage/validation, picker behavior, pin/card rendering without labels.

### Modified Capabilities
- `places`: replace `placeType` storage/validation/filter with `icon`.
- `capture`: replace required type + Google type suggestion with preselected icon + never-block save.
- `map`: pins encode icon on neutral fill; drop type filter.
- `places-list`: drop type filter; cards show icon alone.
- `place-type`: requirements removed/superseded by `place-icon` (retire capability).
- `localization`: remove visible type strings; keep icon aria-labels/tooltips + picker search in FR/EN.
- `place-refresh`: clarify `icon` is a user field never rewritten by refresh.

## Impact

- Backend: `src/db/schema.ts`, migrations, `src/places/routes.ts` (validation/filter/migration), `src/place-types/*` removal, `src/google/routes.ts` unchanged (mask already has `primaryType`).
- Frontend: `AddPage`, `PlaceEditor`, new `IconPicker` (replaces `TypeCombobox`), `FilterBar`, `usePlaceFilters`, `MapView`/`pins.ts`, `PlaceCard`, `api.ts` (`Place.icon`, `parseDetails`, `mapGoogleType`→`inferIcon`), i18n FR/EN.
- Tests: api/places, place-refresh, usePlaces, google mask tests.
