# Tasks

## 1. Tag suggestions scoped to own places

- [x] 1.1 Scope `GET /api/tags` rows to the authenticated user and return `{tag, count}` totals ranked by count desc then recency, including empty-`q` full list, and verify with `npx vitest run tests/tags.test.ts` plus a new/updated API test asserting other users' tags are excluded and counts match own totals
- [x] 1.2 Document the scoped `/api/tags` contract (own totals, `q` optional) in code-adjacent comments or API notes and verify the documented query runs as written

## 2. Shared places data for the split

- [x] 2.1 Extract shared `usePlaces(filterParams)` hook (list fetch, optimistic `flipStatus`/`saveEdit` with rollback, `UnauthorizedError` passthrough) reused by list and map panes and verify with `npm run typecheck`
- [x] 2.2 Add hook-level tests for shared fetch, optimistic update, and rollback on patch failure and verify with `npx vitest run`

## 3. Desktop split shell with permanent rail

- [x] 3.1 Widen `App.tsx` shell/header to full width on `lg:`, gate `ViewToggle` with `lg:hidden`, and add the split parent composing rail + list + map panes sharing one `usePlaceFilters` instance and one `usePlaces` result, and verify by resizing to 1280px: split visible without tabs, and to 390px: tabs unchanged
- [x] 3.2 Render `/map` as the same split on desktop viewports with identical applied filters and verify deep links (`/map?tags=japonais`) show the split with matching pins and cards
- [x] 3.3 House `FilterBar` in a sticky `aside w-72 xl:w-80` rail on desktop (always-open tag section) while keeping the collapsible `<details>` on phone, and verify rail persists during list scroll with no horizontal overflow at 1024px and 1440px

## 4. Visible selectable tag list with counts

- [x] 4.1 Extend tag filter UI to fetch on open (empty `q`), render the sorted list with total counts beside names, toggle filters on select, and narrow on typing with no create affordance in filter context, and verify on phone (expand shows ranked list with counts, tap toggles chip) and desktop rail (list visible without typing)
- [x] 4.2 Add component tests for sorted-with-counts rendering, toggle behavior, search narrowing, and no-creation in filter vs creation in edit contexts, and verify with `npx vitest run`

## 5. Map and list panes in split

- [x] 5.1 Convert map detail from bottom sheet to right-docked panel on desktop (same `PlaceCard`+`PlaceEditor`), bias `fitToResults` padding to the unobscured area, call `map.resize()` on pane/breakpoint change, and verify pin tap docks the panel without moving viewport and fit keeps pins visible with panel open
- [x] 5.2 Apply desktop list density in the split pane (compact targets via `lg:` overrides, pane-local scroll, synced highlight + scroll-to-card on pin select) without changing phone card layout, and verify card tap highlights the pin and pin tap scrolls to and highlights the card
- [x] 5.3 Center `/add` content (`max-w-2xl`) on desktop and verify no full-bleed bottom-bar overlap at 1280px while phone layout is unchanged

## 6. Integration verification

- [x] 6.1 Run `npm test`, `npm run typecheck`, and `npm run build`, fix failures, and verify all pass
- [x] 6.2 Walk phone (390px) and desktop (1280px) flows — filter, tag toggle with counts, card/pin selection sync, edit persistence, fit/locate — and verify pins equal cards for each filter set and detail edits persist to both panes
