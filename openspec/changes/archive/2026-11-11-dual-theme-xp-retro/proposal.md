# Proposal

## Why

The app works but looks generic (raw Tailwind slate/black). Two distinct art directions were explored — XP-inspired modern and Space Age pulp (astronaut poster) — each needing Light + Dark. To ship those and make a third theme cheap later, theming needs a token contract instead of hardcoded colors.

## What Changes

- Adds a theme system with 2 themes (`xp`, `retro`) x 2 modes (`light`, `dark`) = 4 variants, switchable from a small header control.
- Introduces a semantic token contract (~28 vars) covering surfaces, text, actions, status, stars, feedback banners, radius, shadow, fonts; components use roles (`bg-surface`) not raw colors.
- Adds per-device persistence (`localStorage`) with OS `prefers-color-scheme` default for mode; theme defaults to `xp`; no flash via early inline script in `index.html`.
- Swaps map pins from canvas circles to classic tip-anchored drop shape, keeping semantic fills (green/amber by status) and circle clusters; basemap tiles untouched.
- Themes map sheets/controls, list, filter bar, add form, auth/empty states; keeps surfaces flat with texture reserved for hero/empty states.
- Defers venue-type (restaurant/cafe/bar) color-coding and icons; no data-model change.

## Capabilities

### New Capabilities

- `theming`: theme + mode selection, persistence, token contract, and themed application of all views including feedback banners.

### Modified Capabilities

- `map`: pin rendering changes from center-anchored circles to tip-anchored drop shape with preserved status colors and selection behavior; clusters unchanged.

## Impact

- Affected code: `web/src/*` (App header, pages, components, `index.css`, `index.html` inline theme script), `web/src/theme/` (new tokens + per-theme files + registry + context), MapLibre pin layers in `MapPage.tsx` plus JS color mirror.
- No API, DB, or auth changes. No basemap tile changes. Pure web presentation layer.
- Risks: contrast regressions in dark variants; FOUC if early script missed; pin anchor offset shifting perceived location (mitigated by tip-anchored alignment).
