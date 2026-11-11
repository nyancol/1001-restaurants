# Proposal

## Why

The list recalls places by name but not by neighborhood. With hundreds of Paris spots, a map answers "what's near me / what did I save around here?" in one glance — the core Mapstr-like loop the list alone can't close.

## What Changes

- New `Map` tab next to `My places`, sharing the exact filter state (`status/tags/q`, URL-synced) and showing the same result set as pins (`owner=me` only).
- Tap a pin → bottom sheet with the same content as a list card (name, address, status, tags, stars, note) + Edit → same editor (tags/stars/note, status flip) via existing `PATCH /api/places/:id`.
- Viewport: fixed Paris center/zoom on first open, sticky afterwards; filter changes never move the map; explicit `Fit to results` button only. Geolocation-based centering deferred.
- Pins for places with `lat/lng` only; unlocated count shown ("N places without location hidden"). Clustering enabled for dense areas.
- No friend overlay, no new backend endpoints, no tile key (free tiles with attribution).
- Out of scope: friend overlay, geolocation centering, bounding-box query, CSV import, photos.

## Capabilities

### New Capabilities

- `map`: map view of own filtered places as pins, pin selection with bottom-sheet detail and edit entry, sticky viewport with explicit fit.

### Modified Capabilities

- None (existing `places`, `places-list`, `capture`, `tags`, `auth` requirements unchanged; map reuses their behavior).

## Impact

- Frontend: new `maplibre-gl` dependency, `MapPage` + shared `PlaceCard`/`PlaceEditor` with list, new `/map` route + nav tab.
- API: no changes; reuses `GET /api/places?owner=me&status=&tags=&q=` and `PATCH /api/places/:id`.
- Tiles: free Carto/OSM raster via MapLibre, attribution displayed; no key, no billing.
