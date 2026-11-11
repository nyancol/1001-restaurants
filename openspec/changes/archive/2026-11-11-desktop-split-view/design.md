# Design

## Context

See proposal.md Why. Current state: `App.tsx` shell is `max-w-xl` with a `ViewToggle` for `/` vs `/map`; `ListPage` and `MapPage` each own `usePlaceFilters()` (URL-param synced) plus their own `listPlaces()` fetch, `flipStatus`, and `saveEdit`; `MapPage` detail is `absolute inset-x-0 bottom-0` with bottom-biased `fitBounds` padding; `FilterBar` is a top card with tag filtering behind `<details>` + `TagCombobox` that only fetches on non-empty input; `/api/tags` aggregates all users' rows with no owner filter while `/api/places` filters to `owner=me`.

## Goals / Non-Goals

**Goals:**
- One desktop split (rail + list + map) sharing filters, one fetch, synced selection; phone untouched.
- Visible sorted tag list with own-total counts on both form factors.
- Scope tag suggestions to the authenticated user.

**Non-Goals:**
- Add-page redesign beyond centering (`max-w-2xl`); no modal in this change.
- Faceted (filter-aware) tag counts; counts stay global totals per user.
- New themes, tokens, or auth changes; no DB migration.

## Decisions

- **Same routes, responsive rendering over separate desktop routes.** `/` renders split at `lg:` (Tailwind) and stacked tabs below; `/map` renders the same split at `lg:` (alias component, preserves deep links and shared filter URLs). Alternative (new `/explore` route) rejected: duplicates truth and breaks link sharing.
- **New split parent + `usePlaces` hook.** Extract `fetchList`/`flipStatus`/`saveEdit` duplication from both pages into `usePlaces(filterParams)` owned by the split parent; `ListPage`/`MapPage` become thin panes (phone) or are composed by the parent (desktop). Alternative (keep dual fetches, sync via events) rejected: double requests per keystroke and transient pin/card disagreement.
- **CSS-first adaptivity, JS only where MapLibre needs it.** Layout via `lg:` classes (`ViewToggle lg:hidden`, `aside hidden lg:block w-72 xl:w-80 sticky`, list grid `sm:grid-cols-2 2xl:grid-cols-3` inside pane, map `h-[60dvh] lg:h-[calc(100dvh-header)] sticky`). `matchMedia('(min-width:1024px)')` only for detail container choice (sheet vs docked panel), `fitBounds` padding bias, and `map.resize()` on container change. Alternative (two codebases) rejected: 3 pages + shared components do not justify a fork.
- **Reuse `FilterBar`/`TagCombobox`, change containers.** `FilterBar` unwrapped from top card into rail aside; `<details>` disclosure stays on phone, always-open section on desktop (`lg:`). `TagCombobox` gains fetch-on-open (`q=""` returns ranked own tags) + listbox rendering with counts; filter context keeps `allowCreate=false`, edit contexts keep creation. Alternative (separate tag components per form factor) rejected: same data contract, divergent bugs.
- **Detail surface swaps container, not content.** Same `PlaceCard`+`PlaceEditor`; phone `absolute inset-x-0 bottom-0 max-h-[55%]`, desktop `absolute right-3 top-3 bottom-3 w-96 overflow-y-auto`. `fitToResults` padding switches from bottom-bias (260) to right-bias when docked panel is open.
- **Scope `/api/tags` to requester (`owner=me` default).** Filter rows by `userId` like `/api/places`; keep `?q=` prefix matching and `count desc, lastUsed desc` ordering; return `{tag, count}` totals. Intentional behavior fix: old global counts contradict own-places filtering. Alternative (new `owner` param defaulting to all) rejected: preserves the bug by default.

## Risks / Trade-offs

- [Risk] MapLibre grey half-map after pane resize → Mitigation: `map.resize()` on container/breakpoint change + `ResizeObserver`; sticky container with explicit height.
- [Risk] URL-param sync loops with two filter writers → Mitigation: single `usePlaceFilters` instance per mounted tree; panes receive params as props, never mount two writers in split.
- [Risk] Tag scope change surprises multi-user vocab consumers → Mitigation: documented as fix; capture/add flows unaffected (creation stays); no migration needed.
- [Risk] `min-h-[44/48px]` targets feel chunky with mouse → Mitigation: desktop density pass (`lg:min-h-9`, `lg:text-sm`) without touching phone sizes.
- [Risk] Long tag lists push rail → Mitigation: rail section `max-h` + independent scroll; search narrows client-side after one fetch.
- [Trade-off] Total counts (not faceted) can overpromise inside narrow filters — accepted per user decision for stability and zero extra requests.

## Migration Plan

- Ship backend tag scoping + frontend split together (frontend expects own-scoped counts).
- No data migration; rollback is revert-only.
- Validate: desktop split at 1024/1280/1440, phone tabs at 360-430, pin/card parity, tag counts equal own totals, `/map` deep links on both.

## Open Questions

- `lg:` (1024) vs `xl:` (1280) as the split breakpoint — default `lg:`, confirm on a real laptop.
- `/map` on desktop: alias-render split (default) vs redirect to `/` — no spec impact either way.
