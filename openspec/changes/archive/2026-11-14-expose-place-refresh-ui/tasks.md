# Tasks

## 1. Frontend refresh plumbing

- [x] 1.1 Add `refreshPlace(id)` client in `web/src/lib/api.ts` calling `POST /api/places/:id/refresh` and verify a manual fetch against dev server returns the updated place or typed error with `status`.
- [x] 1.2 Add `refreshOne` action in `web/src/lib/usePlaces.ts` (in-flight guard, replace item with server response, surface error) and verify unit/integration check: refreshing one id updates only that entry and clears loading on both success and failure.

## 2. Card UI

- [x] 2.1 Add refresh button to `web/src/components/PlaceCard.tsx` action row gated by `!readOnly`, disabled with explanatory title when `googlePlaceId` is null and spinner/disabled while in flight, and verify visually: owner sees enabled control, other-user scope shows none, manual place shows disabled.
- [x] 2.2 Wire per-card error display for 422/503/502/429/generic cases preserving existing card data and verify each error path shows the mapped message and re-enables the button.

## 3. Integration and verification

- [x] 3.1 Wire refresh through `PlaceListPane` and List/Split/Map pages via `usePlaces` and verify end-to-end on dev: refresh an owned place updates hours/rating/price snapshot in list and map without full reload.
- [x] 3.2 Run existing frontend checks (`npm test` / `tsc`) plus targeted refresh interaction test and verify no regressions and new behavior covered.
