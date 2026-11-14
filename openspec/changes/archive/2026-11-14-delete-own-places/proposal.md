# Proposal

## Why

Users cannot remove their own places from the UI: the backend `DELETE /api/places/:id` (owner-checked, tested) exists, but the web app exposes no delete affordance. Own places therefore accumulate with no self-service cleanup.

## What Changes

- Add a **Delete** button inside the place edit section (`PlaceEditor`, opened from list and map via `Edit`), visible only for own places (`owner === "me"` / non-`readOnly`).
- Require explicit confirmation (native confirm dialog in first version) before deleting; Cancel aborts with no change.
- Wire the button to existing `DELETE /api/places/:id` via a new `deletePlace` API helper and `usePlaces` hook action with optimistic removal and rollback/error toast on failure (`404`/`403`/network).
- Keep delete unavailable on other users' places (read-only views show no edit section at all, hence no delete).
- Add EN/FR strings for delete button, confirm prompt, and failure message; keep backend error codes untranslated.

## Capabilities

### New Capabilities

- None: backend delete and ownership enforcement already exist and are specified.

### Modified Capabilities

- `places`: clarify the owner delete success path (currently only the `403` forbidden case is specified) — owner `DELETE` removes the row and returns `{ok:true}`.
- `places-list`: extend "Inline edit from list" to include owner-only delete from the edit section with confirmation, hidden in read-only views.
- `localization`: cover the new delete UI chrome (button, confirm, failure message) under complete UI translation.

## Impact

- Frontend only: `web/src/lib/api.ts`, `web/src/lib/usePlaces.ts`, `PlaceEditor.tsx`, `PlaceCard.tsx`/`PlaceListPane.tsx`/`MapView.tsx` wiring, `web/src/i18n/en.ts` + `fr.ts`.
- Reuses existing backend `DELETE /api/places/:id`; no API, schema, or migration changes.
- No breaking changes. Risk is accidental deletion — mitigated by owner-only gating plus explicit confirmation.
