# Design

## Context

See proposal.md for why. Current state: Fastify API + SQLite, `GET /api/places` with `lat/lng`, React SPA with `/` (ListPage, URL-synced `status/tags/q`) and `/add`. No map dependency. Constraints from exploration: Option A tabs, filters never move viewport, Paris default first, bottom sheet mirrors list card + edit, free tiles only.

## Goals / Non-Goals

**Goals:**
- Pins always equal the filtered list; one shared filter state between tabs.
- Pin tap → bottom sheet → edit without leaving the map; single `PATCH` path.
- Phone-friendly, performant at ~500 pins.

**Non-Goals:**
- Friend overlay, geolocation centering, bbox query, offline tiles.

## Decisions

- **MapLibre GL + Carto Voyager (or OSM) raster tiles with attribution:** no key, no billing, matches agreed Google-data/free-display split. Alternative Google Maps JS rejected (per-load billing, key handling behind tunnel); Leaflet rejected (fine but weaker vector/cluster story for 500 dense Paris pins).
- **New `/map` route + `MapPage`, shared filter hook with `ListPage`:** extract existing URL-synced `status/tags/q` logic so both tabs read/write the same params; switching tabs preserves filters. Alternative (separate map-local filters) rejected — it forks truth.
- **Shared `PlaceCard` + `PlaceEditor` components:** ListPage's card/editor extracted and reused in the map bottom sheet; both call the same `patchPlace` helper with optimistic update + rollback. No duplicated validation or edit logic.
- **Markers: clustered source (supercluster via MapLibre) with status-colored dots; selected pin highlighted:** cluster count at city zoom, expand on click; unlocated places excluded with count banner. Alternative (one marker per place, no clustering) rejected at 500 pins.
- **Viewport: Paris `[48.8566, 2.3522]` zoom ~11.5 initial, kept in component state (not URL); `Fit to results` computes bounds of current pins with bottom-sheet padding:** filters only update the source data, never call fit. Geolocation hook stubbed but unwired (future: center on user when granted).

## Risks / Trade-offs

- [MapLibre bundle (~700KB)] → Mitigation: lazy-load `MapPage` via `React.lazy` so list-first load stays light.
- [Bottom sheet covering pins] → Mitigation: fit-bounds and popup padding account for sheet height; sheet collapsible.
- [Tile availability (free Carto/OSM)] → Mitigation: style URL configurable via env; attribution always shown; no backend dependency.
- [Filter thrash refetching 500 rows per keystroke] → Mitigation: reuse existing 300ms debounce + URL-synced fetch; map source updates, no extra endpoint.

## Migration Plan

- Additive frontend only; no DB or API migration. Rollback by removing `/map` route + nav tab.

## Open Questions

- None that change specs or tasks; exact Paris zoom and cluster radius tuned at implementation.
