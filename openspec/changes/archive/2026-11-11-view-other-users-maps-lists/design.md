# Design

## Context

See proposal.md Why. Current state: `GET /api/places?owner=me|all|<userId>` already implements read-any/edit-own (`src/places/routes.ts` filters in memory, `403` on PATCH/DELETE for non-owners, `ownerId` forced on create). The UI hardcodes `owner:"me"` (`web/src/lib/usePlaces.ts:35`), filters sync to URL (`web/src/lib/usePlaceFilters.ts:39`), and List/Map/Split share one fetch with list-equals-pins invariant. There is no `GET /api/users` and places carry only `ownerId` (no display name). All users are friends; notes/tags/ratings stay visible.

## Goals / Non-Goals

**Goals:**
- Per-user viewer (`Me (<name>)`, specific user) across List, Map, and desktop Split with identical filters
- Read-only enforcement in UI backed by existing `403`s
- Shareable/persistent owner scope via URL

**Non-Goals:**
- Combined multi-owner overlays with per-owner pin colors; copy/save-to-my-list; privacy controls or hiding notes; pagination or DB query rewrite; auth changes

## Decisions

- **New `GET /api/users` (auth required):** returns `[{ id, displayName, placeCount }]` sorted by `displayName` (nulls last, case-insensitive). Count via existing `places` rows per `ownerId`. Picker shows `Me (<name>)` plus each other user; no `Everyone` entry. Alternative rejected: embedding user list inside `GET /api/places` — separate endpoint keeps picker independent of filter state and cacheable.
- **`ownerDisplayName` joined server-side on every place read:** single `users` lookup per request (small friends group) mapped onto `toPlace`. Alternative rejected: client-side join only — breaks single-place read (`GET /:id`) attribution and forces every consumer to fetch users first.
- **Explicit `owner=me|all|<userId>` contract:** default stays `me`; unknown user id returns empty set with `200` (not `404`) so bad shared URLs degrade to empty state, not error page. Backend retains `owner=all`; UI does not offer it.
- **Owner in URL (`?owner=`):** extend `usePlaceFilters` pattern — `me` omitted (default, keeps existing URLs clean), raw id otherwise. Picker, `usePlaces`, and Split single-fetch all key off this value. Alternative rejected: local-only state — loses refresh/share and breaks tab-switch consistency.
- **Single `readOnly = owner !== 'me'` rule:** hides `+ Add`, `Edit`, status toggle in `PlaceListPane`, `MapView` detail, and `PlaceCard`. Keeps `Website` and `Copy Maps link` (non-mutating). Backend `403`s remain the authority.
- **No aggregated view:** per-user views show scope in header (`Viewing Bob`); no owner badges in the UI. Backend still returns `ownerDisplayName` and retains `owner=all` for API compatibility.

## Risks / Trade-offs

- [User enumeration] `GET /api/users` exposes all display names to any authenticated user → Accepted: all users are friends per scope; document in OpenAPI.
- [In-memory filtering] `GET /api/places` loads all rows then filters; `owner=all` grows payload → Mitigation: acceptable for homelab scale; no pagination in this change; monitor response size.
- [Stale owner URLs] bookmarked user id may vanish → Mitigation: empty result + user-aware empty state with reset-to-Me action.
- [Tag filter scope] global tag suggestions stay global (matches no-secrets); filtered counts still per-scope → No change to `/api/tags`.

## Migration Plan

- Additive only: new endpoint, new optional query values already tolerated, new optional `ownerDisplayName` field, new optional URL param. No migration, no rollback beyond redeploy. Old `?status=&tags=` URLs resolve to `Me`.

## Open Questions

- None blocking. Picker ordering beyond name sort (e.g. most places first) and `placeCount` staleness window can be tuned during implementation without spec changes.
