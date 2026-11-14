# Design

## Context

- Backend `POST /api/places/:id/refresh` exists (`src/places/routes.ts:318`): owner-only via session cookie, M2M via `refresh:places` scope; sync fetch with `REFRESH_DETAILS_MASK`, snapshot-only rewrite + `updatedAt` bump. See proposal.md Why.
- No frontend caller exists today. Places UI: `PlaceCard.tsx` (card + Edit/Share actions, `readOnly` prop for non-`Me` scopes), `PlaceListPane.tsx` (edit state), `usePlaces.ts` (single fetch, optimistic `flipStatus`/`saveEdit`), `lib/api.ts` (`apiFetch`, `Place` type). List/Split/Map pages all funnel through `usePlaces`.

## Goals / Non-Goals

**Goals:**
- One reusable per-card refresh control with loading/error/success matching existing card UX.
- Ownership gating identical to Edit: visible only when `readOnly` is false.
- State update reuses `usePlaces` pattern (replace item with server response).

**Non-Goals:**
- No backend, auth, scope, or schema changes.
- No bulk/sweep refresh, background polling, or `refreshedAt` column.
- No change to sort semantics (`updatedAt` bump already accepted).

## Decisions

- **Client `refreshPlace(id)` in `lib/api.ts` over ad-hoc fetch:** wraps `apiFetch POST /api/places/:id/refresh`, throws typed errors with `status` already attached. Alternative (inline fetch in card) rejected: duplicates 401/error handling.
- **`refreshPlace` action in `usePlaces.ts` (like `flipStatus`) over local card state only:** hook owns `places` array, so it can replace the refreshed item for list + split + map panes at once; card keeps only `refreshing` + local error display. Alternative (card fetches and lifts via `setPlaces`) rejected: leaks list-state logic into presentational card.
- **Button in `PlaceCard` action row, gated by `!readOnly && place.googlePlaceId`:** consistent with Edit toggle; manual places (null id) render disabled with tooltip "No Google link — refresh unavailable" rather than hidden, so users learn why. Alternative (hide entirely) rejected: silent absence confuses owners of manual entries.
- **No optimistic snapshot:** unlike status flip, Google data is unpredictable — show spinner/disabled, then swap on 200. Rollback path is "keep old data + error message".
- **Error mapping in card:** 422 → "No Google link"; 503/502 → "Google unavailable, try later"; 429 → "Rate-limited, try later"; 403 → hide control (should not happen for owners; refetch list); generic → `err.message`. Uses existing `error`/`setError` plumbing plus per-card inline message.

## Risks / Trade-offs

- [Rapid per-row clicks → Google 429 / quota burn] → Mitigation: per-card in-flight disable; no auto-retry; document sequential use.
- [`updatedAt` bump reorders list if sorted by recency] → Mitigation: accepted (same as backend behavior); list sorts by `createdAt` client-side today so no visible jump, split/map share one fetch.
- [Stale error text persists across cards] → Mitigation: per-card local error state cleared on next refresh or filter change, plus global `setError` only for unexpected failures.

## Migration Plan

- Additive frontend only; no migration. Rollback: remove button + hook action; backend endpoint untouched.
- Verify: owner refresh succeeds and card updates; other-user scope shows no button; manual place shows disabled; 429/503 show message and preserve data.
