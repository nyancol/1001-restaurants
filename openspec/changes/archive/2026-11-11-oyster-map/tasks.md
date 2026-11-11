# Tasks

## 1. Setup

- [x] 1.1 Add `maplibre-gl` dependency and lazy-loaded `/map` route with nav `Map` tab and verify list-first bundle stays light and tab navigation works logged in.
- [x] 1.2 Extract shared filter hook (`status/tags/q`, URL-synced, debounced) from ListPage for reuse by list and map and verify both tabs read/write the same params.

## 2. Map core

- [x] 2.1 Implement MapPage with MapLibre + free tiles (attribution shown) defaulting to Paris center/zoom and verify tiles render with no key or billing.
- [x] 2.2 Render pins for filtered `GET /api/places?owner=me` results with status-colored clustered markers and verify pin set equals list set for a filtered query.
- [x] 2.3 Show unlocated-places count banner and verify places without coords are hidden from pins but counted.

## 3. Selection and edit

- [x] 3.1 Implement pin tap → bottom sheet reusing shared PlaceCard content (name/address/status/tags/stars/note) and verify sheet mirrors the list card for the same place.
- [x] 3.2 Implement edit-from-sheet via shared PlaceEditor and existing PATCH with optimistic update and verify changes persist and reflect after tab switch.
- [x] 3.3 Verify filter changes refresh pins without moving the viewport.

## 4. Viewport and polish

- [x] 4.1 Implement explicit fit-to-results honoring bottom-sheet padding and verify it includes all current pins.
- [x] 4.2 Verify phone layout (360px): sheet collapsible, map usable, tabs reachable; verify desktop layout side behavior unchanged.

## 5. Robustness follow-ups

- [x] 5.1 Pin the map worker to the installed maplibre version via `prebuild:web` copy step and verify a build with the worker deleted restores it into served `public/`.
- [x] 5.2 Document `VITE_MAP_TILE_URL` in `.env.sample` and verify the sample still describes every variable the app reads.
