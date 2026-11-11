# Design

## Context

See proposal.md Why. Current `web/src/pages/MapPage.tsx` inits a MapLibre GL raster map once at `PARIS { 2.3522, 48.8566, zoom 11.5 }`, adds `places` GeoJSON source with clustering plus `pins` / `clusters` layers, and enforces a sticky viewport: only `fitToResults()` and cluster expansion move it. Pin images come from `web/src/theme/pins.ts` and stay semantic (amber/green) in all themes. No geolocation exists today.

## Goals / Non-Goals

**Goals:**
- One-shot locate on open with Paris fallback, plus on-demand recenter, without disturbing pin logic.
- Persistent dot + accuracy halo that reads as "you", distinct from amber/green drops.
- Preserve sticky-viewport contract for filters and fit.

**Non-Goals:**
- No continuous tracking / `watchPosition` / heading / follow-mode.
- No stored position (no localStorage, no backend field).
- No custom `GeolocateControl` theming fork; no routing, no nearby search.

## Decisions

- **Custom `navigator.geolocation.getCurrentPosition`, not `GeolocateControl`.** Rationale: auto-center on open needs a programmatic one-shot anyway; control's built-in button would duplicate the header row and need style overrides to match `edge radius-input` buttons. Alternative considered: `GeolocateControl` with `trackUserLocation` — rejected for styling cost and unwanted watch behaviour.
  - Options: `{ enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }`.
- **Dot as two circle layers under pins.** `user-halo` (translucent blue, radius derived from `accuracy` meters via `circle-radius` with `circle-radius-transition` or scale-by-zoom approximation) below `user-dot` (solid `#2E7CF6`, white stroke), both below `pins-selected`/`pins` in layer order. Alternative: single marker element — rejected because circle layers respect map transforms and stay unthemed like the basemap.
- **Race handling via queued intent.** Geolocation promise runs in parallel with map `load`; if position resolves before `mapReady`, store `pendingCenter` ref and apply in the `load` completion / `mapReady` effect. Pins `setData` path untouched — it never calls `easeTo`/`fitBounds`.
- **Zoom policy: target 14, never zoom out.** `locate()` computes `targetZoom = max(currentZoom, 14)`; first-open granted path uses `easeTo({ center, zoom: 14 })` from Paris 11.5. Keeps neighbourhood context while respecting a user already zoomed into a street.
- **Separate notice state from fatal `error`.** `geoNote: string | null` renders the existing muted `surface-2` banner style (like the unlocated-count banner), not the danger banner, so tile/WebGL errors stay distinct.
- **Header placement.** `◎ Locate` button beside existing "Fit to results" in the same flex row, same classes, `disabled` only while a locate is in flight (not on `!located.length` — locate works with zero pins).

## Risks / Trade-offs

- [Insecure context returns failure] → Treat as fallback path (stay Paris + note); document HTTPS/localhost requirement.
- [Permission prompt on every open may annoy] → Mitigation: one-shot only, no re-prompt loops; denied `PERMISSION_DENIED` sets note once per mount and locate button re-triggers explicitly.
- [Indoor accuracy halo huge (hundreds of meters)] → Mitigation: cap halo pixel radius, still center on coordinates; halo is informational.
- [Position resolves after user already panned] → Mitigation: first-open auto-center applies only once per mount (guard flag); later positions only via explicit `◎` tap.
- [MapLibre layer order regression hiding dot under clusters] → Mitigation: add `user-*` layers after `places` source creation but insert with `beforeId: 'pins-selected'`; verify visually in light + dark.

## Migration Plan

- Frontend-only, no migration. Rollback: remove locate effect + button + layers; Paris default restores. No data to backfill.

## Open Questions

None — zoom (~14), statelessness, and fallback wording are set in exploration; remaining polish (exact blue hex, note copy) is implementation detail within spec bounds.
