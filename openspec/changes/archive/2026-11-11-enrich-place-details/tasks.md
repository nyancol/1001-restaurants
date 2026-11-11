# Tasks

## 1. Data model and migration

- [x] 1.1 Add `placeType`, enrichment columns (`hoursJson`, `businessStatus`, `priceLevel`, `priceRange`, `googleRating`, `googleRatingCount`, `websiteUri`, `mapsLinks`), and `place_types(label, color, icon)` table plus migration defaulting existing rows to `restaurant`, and verify `drizzle` migration applies on a fresh and existing sqlite db
- [x] 1.2 Seed `place_types` with `restaurant/coffee/bar` plus distinct legacy labels and verify seed query returns curated rows

## 2. Google proxy enrichment

- [x] 2.1 Extend details FieldMask with hours/business/price/rating/website/links/primaryType/utcOffset and verify `tests/google.test.ts` asserts the new mask fields without leaking the key in URL
- [x] 2.2 Extend `parseDetails` to return hours periods, businessStatus, price, ratings, website, maps links, and suggested type, and verify unit coverage for missing-field fallbacks

## 3. Places and place-types API

- [x] 3.1 Implement `GET /api/place-types?q=` (auth, frequency-ranked suggestions) mirroring `/api/tags` and verify 401 when logged out and prefix filtering works
- [x] 3.2 Require/normalize `placeType` on create/patch, persist snapshot fields, enforce edit-own, and verify `400` on missing type plus duplicate-googlePlaceId update preserves snapshot
- [x] 3.3 Implement `isOpenAt(periods, datetime)` helper handling overnight and split service plus server `placeType`/`openAt` filtering excluding unknown-hours and closed statuses, and verify unit tests for overnight/Sunday-boundary plus API filter tests

## 4. Capture flow

- [x] 4.1 Add required type picker with suggestions + Google primaryType suggestion and hours/enrichment preview to AddPage/LookupField, blocking save on empty type, and verify manual entry plus Google pick both persist type and snapshot
- [x] 4.2 Persist snapshot on create/patch from the frontend payload and verify Place response round-trips hours, prices, ratings, website, and maps links

## 5. List, map, and pins

- [x] 5.1 Extend FilterBar + usePlaceFilters + listPlaces with type and open-now/open-at controls (open defaults to now, unknown-hours hidden) and verify list narrows for type and datetime combos
- [x] 5.2 Recode `pins.ts`/`MapPage.tsx` to type fill + icon from curated mapping, greyed/WIP pin sheets for closed statuses, viewport-stable updates, and verify pins match filtered list and selection halo still works
- [x] 5.3 Enrich PlaceCard/PlaceEditor and map bottom sheet with type badge, hours + open badge, price level/range, dual personal/Google ratings, website link, share button copying the Google Maps URL (no Maps URL rendered in details), and closed/WIP styling, and verify visual states for operational/temporarily/permanently closed plus clipboard copy confirmation

## 6. Integration verification

- [x] 6.1 Update `tests/api.test.ts` and `tests/google.test.ts` for new fields, filters, and migration default, and verify `npm test` passes
- [x] 6.2 Walk through capture → list filter → map pins for a restaurant/coffee/bar with hours set and verify open-now, open-at, type filter, and closed-state displays behave as specified
