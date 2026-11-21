# Proposal

## Why

The current phone UI buries results under 2–3 screens of filters, and the XP / retro novelty themes feel like a demo rather than a food app. Filters, layout order, and visual style ship together — fixing one without the others leaves the first-run impression broken.

## What Changes

- **BREAKING** Remove `xp` / `retro` theme choice; ship a single clean theme with `light` + `dark` modes only (OS default, persisted per device).
- Add clean visual language: neutral surfaces, system font stack, 1px lines, small radius, no hard comic shadows; add `theme-color`, `color-scheme`, safe-area, touch (`manipulation`, tap-highlight), `overscroll-behavior` for sheets, `hover:` states, `break-words` / truncation fixes.
- Phone-first layout: sticky top bar with `[search] [Filters(n)] [List|Map]`; move full `FilterBar` (status, open-now/at, tags, owner scope) into a collapsed sheet / disclosure behind the Filters button; move `ViewToggle` above the fold.
- Reduce card + filter density so first results are visible without scrolling past chrome: collapse hours to one summary line, keep dual ratings compact, keep tag chips removable from bar.
- Keep all existing filter power and URL sync (`owner/status/tags/q/openAt/openNow`); no filter capability removed.

## Capabilities

### New Capabilities

- None — this change reworks existing behavior, no durable new capability.

### Modified Capabilities

- `theming`: single theme + light/dark only, no theme picker; token contract + system integration requirements change.
- `responsive-layout`: phone order changes to sticky search/toggle + filter sheet; desktop split unchanged except tokens.
- `places-list`: card density + list chrome order (toggle before filters, add-entry placement) change.

## Impact

- `web/src/theme/*` (delete `xp.css`/`retro.css`, add `clean` tokens), `registry.ts`, `ThemeContext.tsx`, `ThemeSwitcher.tsx`, `web/index.html` boot script, `tokens.css` / `index.css`.
- `web/src/pages/ListPage.tsx`, `pages/MapPage.tsx`, `components/FilterBar.tsx`, `components/ViewToggle.tsx`, `components/OwnerPicker.tsx`, `components/PlaceListPane.tsx`, `components/PlaceCard.tsx`, `components/PlaceEditor.tsx`.
- Specs: `theming`, `responsive-layout`, `places-list`. No API / DB change.
