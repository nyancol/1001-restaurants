# Design

## Context

See proposal.md Why. Current: `ThemeId xp|retro` + `ModeId light|dark` in `registry.ts` / `ThemeContext.tsx` / `ThemeSwitcher.tsx` / `xp.css` / `retro.css` / `web/index.html` boot script; phone `ListPage.tsx` renders `OwnerPicker` + full `FilterBar.tsx` (~350 lines) + Add + `ViewToggle.tsx` before `PlaceListPane.tsx`; cards in `PlaceCard.tsx` show full hours list, dual ratings, 4 actions. Token contract in `tokens.css` already isolates theme via vars.

## Goals / Non-Goals

**Goals:**
- One clean theme, light/dark only, with system integration (theme-color, color-scheme, safe-area, touch).
- Phone results above fold with full filter power preserved via sheet.
- Scannable cards without losing ratings/status/hours signal.

**Non-Goals:**
- No filter capability removal; no API/DB change; no desktop split rework beyond tokens; no new themes.

## Decisions

- **Single theme, delete xp/retro:** new `themes/clean.css` (neutral: system-ui stack, 1px `--edge`, 6/10px radius, subtle shadow; light slate / dark slate palettes). Delete `xp.css`/`retro.css`, remove `ThemeId`/`THEME_STORAGE_KEY`, keep `ModeId` + OS default. `ThemeSwitcher` becomes mode-only; boot script drops theme read, ignores legacy `oyster-theme`. Alternative: keep xp/retro as options — rejected per user: simplify to one.
- **Phone sticky bar + sheet, not inline filters:** sticky `search + Filters(n) + List|Map` under header (`position:sticky`, `scroll-margin-top` for targets). Full `FilterBar` moves into `<dialog>`-style sheet (reuse `ConfirmDialog` focus-trap pattern) with `overscroll-behavior:contain`, `aria-live` count, `prefers-reduced-motion` guard on `scrollIntoView`. Alternative: collapsed `<details>` inline — rejected: still pushes toggle down and loses sticky reach.
- **Card compaction:** hours `<details>` stays but summary is one line (`openLabel` + open badge); ratings row compact pills; `break-words` + `min-w-0` on name/note; action row keeps 44px targets but adds `hover:` states. Alternative: remove ratings/hours — rejected: spec requires dual ratings + hours summary.
- **Tokens first:** all views keep using `var(--*)` roles; no raw colors. Add `color-scheme`, `theme-color` meta per mode, `env(safe-area-inset-*)` in header/sticky/footer, `touch-action:manipulation`.

## Risks / Trade-offs

- [Stored xp/retro users see different look] → ignore legacy key, no migration UI; announce as BREAKING in proposal.
- [Sheet hides active filters] → Filters button shows count badge + active chips remain visible in bar; URL still deep-links.
- [Sticky bar covers focused card on pin→card scroll] → `scroll-margin-top` = header + bar height; smooth scroll gated on reduced-motion.
- [i18n churn] → new keys for Filters(n), sheet titles; fallback to English if missing.

## Migration Plan

1. Land tokens + clean theme + mode-only switcher + boot script.
2. Land phone sticky bar + sheet + ListPage order + card compaction.
3. Delete xp/retro files + theme registry code; validate `openspec validate clean-phone-ui`.
4. Rollback: revert change dir + theme files; legacy `oyster-theme` ignored so no data fix needed.

## Open Questions

- Sheet component: reuse `ConfirmDialog` shell vs new `FilterSheet`? Resolve in tasks (prefer reuse if focus-trap fits).
- Clean palette final hexes: pick during implementation, keep contrast AA.
