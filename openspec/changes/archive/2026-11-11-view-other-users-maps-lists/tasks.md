# Tasks

## 1. Backend user directory and owner attribution

- [x] 1.1 Add `GET /api/users` returning `id`, `displayName`, `placeCount` sorted by display name (auth required, `401` without session) and verify with injected request asserting counts update after place create
- [x] 1.2 Include `ownerDisplayName` on `GET /api/places` list and `GET /api/places/:id` via users lookup and verify existing `owner=me|all|<userId>` cases return the name plus `owner=all` aggregates all users
- [x] 1.3 Document `GET /api/users` and `owner` values plus `ownerDisplayName` in OpenAPI/README and verify the documented endpoint responds as written

## 2. Frontend owner scope plumbing

- [x] 2.1 Extend `web/src/lib/api.ts` with `listUsers` and `ownerDisplayName` on `Place` plus `owner` passthrough in `listPlaces` and verify typecheck passes
- [x] 2.2 Persist owner scope in URL (`me` omitted or user id) following `usePlaceFilters` pattern and pass it into `usePlaces`, keeping List/Map tab-switch consistency, and verify reload and shared URL restore the Bob view
- [x] 2.3 Keep single-fetch list-equals-pins invariant for every owner scope in List, Map, and Split views and verify filter change updates both panes with one query and viewport stays put

## 3. Picker and read-only presentation

- [x] 3.1 Build `OwnerPicker` (`Me (<name>)`, each other user with count) into `FilterBar` stack and rail layouts and verify keyboard/screen-reader labels plus counts match `GET /api/users`
- [x] 3.2 Enforce read-only outside `Me` by hiding `+ Add a place`, Edit entry, and status toggle in `PlaceListPane`, `MapView` detail, and `PlaceCard` while keeping Website/Copy link and note/tags/ratings visible, and verify PATCH from another user's card is unreachable and direct API still `403`s
- [x] 3.3 Show scope-aware header (`Viewing Bob`), and user-aware empty states, and verify per-user views show scope only in header

## 4. Integration checks

- [x] 4.1 Add/extend API tests for users directory auth, counts, unknown owner id empty `200`, and `ownerDisplayName` presence, and verify `npm test` passes
- [x] 4.2 Verify phone List/Map and desktop Split for `Me` and Bob with combined status/tag/text/open filters, and verify `npm run typecheck` passes
