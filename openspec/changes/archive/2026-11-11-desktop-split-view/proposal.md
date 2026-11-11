# Proposal

## Why

The web UI is phone-first (`max-w-xl` single column everywhere): fine on mobile, wasteful on desktop with empty margins, stacked map, and tag filtering hidden behind typing. Desktop users need a split list+map workspace with a permanent filter rail and pickable tag lists.

## What Changes

- Desktop (`lg:`+) renders a single split view: permanent filter rail left, scrollable list center, sticky map right — no List/Map tabs.
- Phone keeps current tabs (`/` list, `/map` full map + bottom sheet) with no behavior change.
- Header widens to full width on desktop; `ViewToggle` becomes phone-only (`lg:hidden`).
- Filter rail is always visible on desktop; tag filter becomes a visible sorted list with total counts, toggle to filter.
- Phone tag filter becomes a tappable sorted list with counts on expand (typing narrows, no manual entry).
- Tag suggestion counts mean "N of my places have this tag, total" and `/api/tags` is scoped to the authenticated user.
- List+map share one fetch and selection state on desktop: click card highlights pin, click pin highlights/scrolls to card.
- Map detail becomes a right-docked panel on desktop (same `PlaceCard`+`PlaceEditor`), bottom sheet stays on phone; fit-to-results padding shifts accordingly.
- `/map` on desktop renders the same split (alias/redirect); `/add` stays a page but centered (`max-w-2xl`) on desktop.

## Capabilities

### New Capabilities

- `responsive-layout`: adaptive phone/desktop shell — when the split view renders, how panes are arranged, what is hidden/shown per breakpoint, and selection/fetch sharing between panes.

### Modified Capabilities

- `places-list`: list participates in the desktop split (shared fetch, selection sync with pins) instead of standalone fetching.
- `map`: map participates in the desktop split (shared fetch, side-panel detail instead of bottom sheet, desktop fit padding, `/map` alias behavior).
- `tags`: tag suggestions scoped to own places with total counts; filter UI exposes a visible sorted selectable list with counts on both form factors.

## Impact

- Frontend: `web/src/App.tsx` shell/header, new split parent + `usePlaces` hook, `FilterBar`/`TagCombobox` presentation, `MapPage` detail container + `fitBounds` padding, `ListPage` pane reuse, Tailwind `lg:` classes, `map.resize()` handling.
- Backend: `src/tags/routes.ts` owner scoping (`owner=me` default); no schema change.
- No auth, capture, or theming token changes. No breaking API change except tag counts becoming per-user (bug fix toward documented own-places behavior).
