# Proposal

## Why

`POST /api/places/:id/refresh` already lets owners re-fetch Google snapshots, but there is no UI entry point — users cannot trigger it without curl or the Hermes agent. Stale hours/ratings/prices stay stale from the user's perspective.

## What Changes

- Add a per-place refresh action in the UI (place card) that calls `POST /api/places/:id/refresh` and updates the card in place.
- Show the action only for places the viewer owns (same gating as Edit/status-toggle: `Me` scope, non-`readOnly` cards); never offer refresh on another user's places.
- Handle refresh states in the card: loading/disabled while in flight, success replaces snapshot fields, errors surfaced without losing user data.
- Disable or explain refresh for manually entered places with no `googlePlaceId` (backend returns `422`).
- No backend auth or endpoint changes; existing owner-only vs `refresh:places` M2M policy stays as-is.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `place-refresh`: add user-initiated refresh from the UI — per-place action visibility (owner-only), invocation, loading/error/success behavior.

## Impact

- Frontend: `web/src/lib/api.ts` (refresh client), `web/src/lib/usePlaces.ts` (state update), `web/src/components/PlaceCard.tsx` + `PlaceListPane.tsx` (button, states), List/Split/Map pages wiring.
- Backend: none (reuse existing `POST /api/places/:id/refresh` with current 403/422/503/502/429 semantics).
- No DB migration, no new scopes, no breaking API change.
