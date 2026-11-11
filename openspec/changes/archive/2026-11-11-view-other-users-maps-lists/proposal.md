# Proposal

## Why

All places are per-user today (`owner=me` hardcoded in the UI) while the API already supports read-any (`?owner=all|<userId>`). Users cannot discover or browse each other's lists and maps, so shared food knowledge stays siloed.

## What Changes

- Add a Users scope picker (`Me (<name>)`, each other user) visible on List, Map, and desktop Split views, using the term `users` throughout. No `Everyone` entry.
- Add `GET /api/users` returning `id`, `displayName`, `placeCount` for the picker (all app users are considered friends; any authenticated user may list them).
- Extend `GET /api/places` to support `owner=me|all|<userId>` explicitly and include `ownerDisplayName` on every place for attribution (backend retains `owner=all`; UI does not offer it).
- Persist the selected owner in the URL (`?owner=...`) alongside existing filters so refresh, tab-switch, and share keep the viewed user.
- Render other users' views read-only: hide `+ Add a place`, Edit entry, and status toggle; keep Website, Copy Maps link, hours, price, dual ratings, note, and tags visible (no secrets). Editable only in `Me`.
- Update empty states to name the viewed user (`Bob has no places yet`) and keep list-equals-pins invariant for every owner scope.

## Capabilities

### New Capabilities

- `users`: user directory for the picker — list all users with display name and place count.

### Modified Capabilities

- `places`: formalize `owner=me|all|<userId>` listing and `ownerDisplayName` attribution on read.
- `places-list`: support viewing `Me (<name>)` or a specific user with shared filters and read-only rules.
- `map`: support mirroring the same owner-scoped filtered set as pins with read-only detail surfaces.

## Impact

- Backend: `src/places/routes.ts` (owner filter + `ownerDisplayName`), new `src/users/routes.ts` (or equivalent), `src/app.ts` registration, `src/db/schema.ts` read-only usage.
- Frontend: `web/src/lib/usePlaces.ts`, `web/src/lib/usePlaceFilters.ts` (or new owner hook), new `OwnerPicker` component, `FilterBar.tsx`, `ListPage.tsx`, `MapPage.tsx`, `SplitPage.tsx`, `PlaceListPane.tsx`, `MapView.tsx`, `PlaceCard.tsx`, `web/src/lib/api.ts`.
- No auth changes (PocketID + dev-login unchanged); no pin-encoding or basemap changes; no copy/save-to-my-list in this change.
