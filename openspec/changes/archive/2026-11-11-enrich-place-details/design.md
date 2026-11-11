# Design

## Context

See proposal.md Why. Current state: `src/google/routes.ts` proxies autocomplete/details with a lean FieldMask (`id, displayName, formattedAddress, location, types`); `src/db/schema.ts` places row has no hours/type/enrichment; `src/places/routes.ts` validates status/tags/rating/note and filters in memory; `web/src/theme/pins.ts` + `MapPage.tsx` encode status in pin fill (amber/green); `FilterBar.tsx` + `usePlaceFilters.ts` share status/tags/q. Tags are the precedent for a global free-text vocabulary with `/api/tags` suggestions.

## Goals / Non-Goals

**Goals:**
- Snapshot richer Google data once at save; infer open-state locally for now/open-at filtering.
- Single required global placeType with curated color+icon used by pins, badges, and filters.
- Keep list/map filter parity via the shared FilterBar.

**Non-Goals:**
- Live refresh or backfill of hours/enrichment (deferred; snapshot + `fetchedAt` only).
- Map legend, type rename/merge tooling, review/photo display, routing or nearby search.
- Changing auth, sharing (read-all/edit-own), theming tokens, or tile provider.

## Decisions

- **Snapshot shape over live fetch:** store `hoursJson { periods, weekdayDescriptions, fetchedAt }`, `businessStatus`, `priceLevel`, `priceRange`, `googleRating`, `googleRatingCount`, `websiteUri`, `mapsLinks`, plus existing link fields. Rationale: offline list/map, one Enterprise call per pick, no polling. Alternative (fetch details on every card open) rejected: latency, quota, key exposure surface.
- **Enterprise FieldMask in one call:** add `regularOpeningHours, businessStatus, priceLevel, priceRange, rating, userRatingCount, websiteUri, googleMapsLinks, primaryType, primaryTypeDisplayName, utcOffsetMinutes` to details mask. Rationale: single round trip; cost bounded by explicit user picks. Alternative (two-tier fetch: cheap first, enrich on demand) rejected for capture complexity.
- **Infer open locally, ignore Google openNow:** evaluate stored periods against requested datetime (handle overnight spans and multiple periods per day; use snapshotted `utcOffsetMinutes` for Paris/DST correctness). Rationale: deterministic, testable, matches "our app infers" requirement. Holiday/special-hours ignored in v1 and documented.
- **`place_types` table + `places.placeType` text:** `place_types(label PK, color, icon, createdAt, updatedAt)` seeded with the fixed trio; `places.placeType` normalized to the fixed set (`cafe`/`coffee` → `café`), migration maps legacy `coffee` to `café` and unknown labels to `restaurant`, and unknown `place_types` rows are removed. Rationale: fixed set, no curation UI; FK avoided so a future vocabulary change stays explicit.
- **Type suggestions endpoint:** `GET /api/place-types?q=` returns the fixed trio with usage counts, auth-required, same shape as `/api/tags`. Rationale: keeps filter dropdowns stable; no free-text creation.
- **Pins by type, status leaves pin:** `pinsFor(type)` returns fill from mapping; drop SVG embeds curated icon glyph; `toGeoJSON` carries `type` property and layer uses `match` on type instead of status; selected halo unchanged; clusters unchanged. Status remains filter + card/sheet field. Rationale: satisfies type-color requirement; icon preserves readability without legend.
- **FilterBar extension:** add type select (All + known types) and open-filter toggle defaulting to now plus datetime-local input; extend `usePlaceFilters` query params (`placeType`, `openAt`, `openNow`) and pass through to `listPlaces`; server filters type/open in the same in-memory pass as status/tags/q.
- **Closed-state styling:** `CLOSED_PERMANENTLY` greyed card/pin-sheet + badge and `CLOSED_TEMPORARILY` WIP (striped/hazard accent) + badge; both excluded from open-filtered sets. Rationale: distinct non-verbal states without new filter dimension.
- **Share via clipboard, no Maps URL in details:** snapshotted `mapsLinks`/`googleMapsUri` are never rendered as links in cards or sheets; a share control offers `google maps link` which copies the URL via `navigator.clipboard` (with fallback) and confirms inline. Rationale: keeps details clean while keeping the Maps handoff one tap away. Alternative (rendered Maps link alongside website) rejected per user request.

## Risks / Trade-offs

- [Enterprise SKU per pick] → Mitigation: one details call per explicit pick only; in-session autocomplete cache retained; document cost in code comment.
- [Stale hours/prices/ratings] → Mitigation: show `fetchedAt`-derived "snapshot" hint in UI; refresh explicitly out of scope.
- [Overnight/multi-period inference bugs] → Mitigation: pure `isOpenAt(periods, datetime)` helper with unit tests for overnight, split service, Sunday boundary.
- [Accented label handling] → Mitigation: canonical `café` stored; `cafe`/`coffee`/`Coffee Shop` accepted as aliases on write and in Google mapping.
- [Status no longer glanceable on map] → Mitigation: accepted by spec change; status filter + card flip retained.

## Migration Plan

- Drizzle migration: add `places.placeType` (default `restaurant` for existing), new enrichment columns, `place_types` table seeded from distinct normalized types plus `restaurant/coffee/bar` defaults.
- Deploy order: migrate → backend routes → frontend; old clients sending no type get `400` with clear error (capture is the only writer).
- Rollback: drop added columns/table only if no new data relied upon; pins fall back to status fills by reverting `pins.ts` + layer expression.

## Open Questions

- None blocking specs or tasks; palette + icon set choices can be finalized during implementation.
