# Design: Botanical Butter & Earth Redesign

## Context

See proposal.md Why. Current: `web/src` React+Vite+Tailwind v4 with semantic CSS vars (`--bg,--surface,--ink,--accent…`) in `tokens.css`, themes `xp`/`retro` + modes in `theme/themes/*.css`, shell in `App.tsx`, feeds in `SplitPage/ListPage/MapPage`, cards `PlaceCard`, edit `PlaceEditor`, map `MapView` (MapLibre OSM), filters `FilterBar` + `OwnerPicker`. Stitch source: project `17221535513795953947`, system Botanical `34371148…` (Literata+Nunito Sans, butter/forest/sage), screens Map View (Terra) + Card Edit Mode.

## Goals / Non-Goals

Goals: add `botanical` theme default without breaking xp/retro; 3-pane desktop journal + stacked phone; journal cards + Clamato edit parity via best-effort mapping; Stitch DESIGN.md upload.
Non-Goals: no API/DB migration, no photo upload, no visits-count backend, no map tile restyle, no i18n string freeze changes (reuse keys).

## Decisions

- **New `theme/themes/botanical.css` + registry `botanical` default**: one-file theme like xp, defines light+dark warm roles; update `registry.ts`, `ThemeContext` default, `index.html` boot, `index.css` import. Alt: overwrite light mode — rejected (breaks existing users).
- **Fonts via Google Fonts + `--font-display: Literata`, `--font-body: Nunito Sans`**: `@import` in botanical.css with system fallbacks; display for titles/quotes, body elsewhere. Alt: self-host — deferred (build weight).
- **Shell in `App.tsx` only**: header (logo cloche SVG, title/sub, New Memory `/add`, bell dot, user chip from `useUsers`) + butter footer; keeps routes intact. Alt: new layout component — unnecessary indirection.
- **SplitPage becomes journal grid**: `grid [280px_1fr_1.2fr]` on lg, sticky rail + sticky map; rail composes existing `OwnerPicker` (restyled Me/Friends segmented) + `FilterBar layout=rail` (search, Lists & State counts from `places`, Tags cloud). Center keeps `PlaceListPane` + new sort/toggle header. Right `MapView showDetails=false` + custom preview card component. Phone `ListPage` reuses same rail components stacked; `MapPage` keeps bottom sheet restyled.
- **Cards/edit as pure restyle + small props**: `PlaceCard` gains `layout=journal`, quote wash, honey/sage pills, footer line (address from `address`, price via existing `priceLabel`, visited from `updatedAt`/note date), tag pills; hide missing. `PlaceEditor` gains segmented status, visits stepper (local state, persisted only if API accepts else note suffix — default local-only + TODO), icon row (existing `IconPicker`), tag editor (existing `TagCombobox` wrapped in butter box + suggestions), stars + score (`rating/5.0` + label map), note textarea. Alt: rewrite editor — rejected (risk to save path).
- **Map preview as `MapPreviewCard.tsx`**: thumbnail (grey block until photos), title+★, meta line, info line (openLabel/hours when present), CTA scrolls to `[data-place-id]` and sets selection. Keeps MapLibre logic untouched.
- **DESIGN.md sync**: save Stitch designMd to `DESIGN.md`, `stitch upload design DESIGN.md`, verify `stitch status --flow=design` READY. Alt: hand-author — rejected (drift).

## Risks / Trade-offs

- [Stitch token drift] → pin `DESIGN.md` copy in change + upload same file; visual diff vs screenshots in review.
- [Missing visits/photos/recs] → hide, not fake; placeholders clearly grey; spec notes best-effort.
- [Dark botanical contrast] → espresso-tinted surfaces, keep cream text ≥4.5:1; verify with axe + manual.
- [MapLibre OSM tiles stay cool] → warm container + pills carry identity; full tile restyle out of scope.
- [i18n keys] → reuse existing keys + small additions; no locale file restructure.

## Migration Plan

1. Land theme + shell behind default `botanical` (stored pref overrides preserved). 2. Roll feed/cards/editor/map preview incrementally, tests green each step. Rollback: set default back to `xp` in registry + index.html.

## Open Questions

- None blocking; visits persistence (field vs note) to confirm during apply if API allows cheap patch.
