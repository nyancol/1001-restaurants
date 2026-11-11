# Design

## Context

See proposal.md Why. Current web UI uses raw Tailwind colors per component (`bg-green-200`, `text-slate-500`, `bg-black` in PlaceCard, Stars, FilterBar, PlaceEditor, AddPage, ListPage) with `index.css` as bare `@import "tailwindcss"`. Map pins are MapLibre `circle` layers in `MapPage.tsx:138-160` with status paint, circle clusters, halo selection. Basemap is OSM raster, untouched by decision.

## Goals / Non-Goals

**Goals:**
- 4 variants from 2 themes x 2 modes with one component codebase.
- Third theme costs one token file + registry line.
- Drop pins tip-anchored with semantic colors preserved across themes.

**Non-Goals:**
- No basemap reskin, no venue-type taxonomy or pin icons, no backend/API/DB changes, no email or sharing changes.

## Decisions

**1. Two axes: `data-theme` x `data-mode` on `<html>`.**
Theme sets hues, radii, fonts; mode remaps surfaces/ink/line only. One combo explosion avoided: new theme gets both modes free. Alternative (single `xp-dark` id) rejected — N*M files.

**2. Tailwind v4 `@theme inline` role utilities.**
Define `--surface: var(--surface)` style mapping so components use `bg-surface`, `text-ink`, `border-line`, `bg-accent`, etc. Lint rule: no raw `slate-*`/`amber-*`/`black` in components after migration. Alternative (CSS modules per theme) rejected — duplicates markup.

**3. Token contract (~28 vars) as the extension point.**
Surfaces: `--bg, --surface, --surface-2`. Text: `--ink, --muted`. Structure: `--line, --radius-sm/md/pill, --edge, --shadow`. Actions: `--accent, --accent-ink, --focus`. Semantics: `--want, --want-ink, --been, --been-ink, --star, --star-idle`. Feedback themed: `--danger-bg/ink/line, --info-bg/ink/line`. Type: `--font-body/display/mono`. Each theme file fills all vars; `xp` uses 1px edges + 4px radii + Tahoma stack, `retro` uses 2px ink edges + 14px radii + rounded display + mono telemetry. Mode files remap only bg/surface/ink/muted/line/accent-ink.

**4. State: React context + localStorage + early script.**
`ThemeContext` reads `localStorage(oyster-theme, oyster-mode)`, falls back mode to `matchMedia(prefers-color-scheme)`, theme default `xp`. Inline 5-line script in `index.html` sets `data-*` pre-React to avoid FOUC. Header holds `[XP|Retro]` segmented + `[Light|Dark]` toggle.

**5. Pins via `symbol` + sprite + JS mirror.**
Replace `circle` pins layer with `symbol` `icon-image: drop-{status}` (SVG data-URL sprite generated per theme/mode from same hexes as CSS vars), `icon-anchor: bottom`, `icon-allow-overlap`. Keep `clusters` circle layer and counts; selection becomes enlarged drop + tip ring instead of halo. `pinsFor(theme,mode,status)` mirrors CSS vars — single source of truth. Alternative (HTML markers with CSS) rejected for perf at scale; canvas symbols keep clustering path intact.

**6. Flat surfaces, texture budget.**
Grain/starfield allowed only on login hero and list empty state; cards/inputs/sheets flat for readability and mobile map legibility.

## Risks / Trade-offs

- [Low contrast in dark retro] -> Mitigation: fix `--want-ink/--been-ink` per mode, run contrast check on banners/pills/stars in all 4 variants.
- [Pin tip misperceived as offset] -> Mitigation: bottom anchor + `icon-offset` tuning, verify tip equals coords at zooms 11-16 Paris.
- [FOUC on slow load] -> Mitigation: inline `index.html` script; test with cache disabled.
- [Token drift when adding theme 3] -> Mitigation: vitest contract test asserting every theme file defines all vars; `openpec validate` on specs.
- [MapLibre control styling leaks] -> Mitigation: override `.maplibregl-ctrl` with `--surface/--line/--ink` vars; controls inherit theme.

## Migration Plan

- Web-only deploy; no migration, no rollback data. Rollback = revert `web/` + `index.html` script. Feature is default-on with `xp` fallback; no flag needed.

## Open Questions

- None blocking. Visual QA will confirm retro display font choice and drop SVG proportions during implementation.
