# Proposal

## Why

The Map tab always opens centered on Paris at city zoom, even when the user is elsewhere. Users exploring nearby bars, cafes, and restaurants must manually pan from Paris to their own neighbourhood on every visit.

## What Changes

- On Map open, request one-shot browser geolocation in parallel with map init; on success ease the viewport to the user location at neighbourhood zoom (~14) without altering pin data.
- On geolocation denial, timeout, unavailability, or insecure context, keep the existing Paris center at city zoom (11.5) and show a small inline note.
- Render a persistent user-location dot with an accuracy halo (standard blue, unthemed in all themes, drawn under pins) that survives panning, filtering, and pin selection.
- Add an explicit recenter (`◎ Locate`) button next to "Fit to results" that re-runs one-shot locate and eases back to the user; on failure it stays put and shows the same inline note.
- Preserve existing rules: filter/pin updates never move the viewport; fit-to-results moves only to pins and never touches the dot; no stored location (stateless per open); no `watchPosition`/tracking.
- If already zoomed closer than 14, recenter pans without zooming out.

## Capabilities

### New Capabilities

None — behaviour extends the existing map capability.

### Modified Capabilities

- `map`: first-open centering becomes conditional (user location when granted, Paris fallback otherwise); adds persistent user dot + halo and explicit locate/recenter action alongside the existing sticky-viewport and fit-to-results contract.

## Impact

- Frontend only: `web/src/pages/MapPage.tsx` (init flow, locate control, dot/halo layers, header button), possibly `web/src/theme/` for dot styling and `maplibre-themed` CSS.
- No backend, API, DB, or dependency changes; no new npm packages (browser `navigator.geolocation` + existing MapLibre GL).
- Browser permission prompt on Map open; requires secure context (HTTPS/localhost) for geolocation to succeed.
