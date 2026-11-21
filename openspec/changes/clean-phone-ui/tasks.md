# Tasks

## 1. Single clean theme

- [ ] 1.1 Add `themes/clean.css` + `theme-color`/`color-scheme`/safe-area/touch tokens and verify `npm run build` passes with no raw colors in views
- [ ] 1.2 Cut `ThemeId`/theme picker to mode-only (`registry.ts`, `ThemeContext.tsx`, `ThemeSwitcher.tsx`, `web/index.html` boot ignores legacy `oyster-theme`) and verify header shows mode toggle only and reload persists mode
- [ ] 1.3 Delete `xp.css`/`retro.css` references and update i18n/docs and verify `grep -r "xp.*retro\\|oyster-theme" web/src --include="*.tsx" --include="*.ts" --include="*.css"` shows only migration-ignore code

## 2. Phone sticky bar + filter sheet

- [ ] 2.1 Decide sheet shell (reuse `ConfirmDialog` focus-trap vs new `FilterSheet`) and verify decision recorded in `design.md` Open Questions
- [ ] 2.2 Implement sticky phone bar (`search + Filters(n) + ViewToggle`) in `ListPage.tsx`/`MapPage.tsx` above results and verify first results visible without scrolling on 360px viewport
- [ ] 2.3 Move full `FilterBar.tsx` + `OwnerPicker.tsx` into collapsed sheet with count badge, URL sync intact, `overscroll-behavior:contain`, reduced-motion guard, and verify filter→URL→list/map still narrows and toggle stays reachable while scrolling

## 3. Card density + system polish

- [ ] 3.1 Compact `PlaceCard.tsx` (one-line hours summary, compact dual-rating pills, `break-words`/`truncate`, `hover:` states) and verify long name/note render with no horizontal scroll
- [ ] 3.2 Add `scroll-margin-top`, focus-visible, `aria-live` count, empty-state copy, and verify keyboard tab reaches toggle/filters/cards with visible focus and no sticky overlap
- [ ] 3.3 Update `en.ts`/`fr.ts` keys for Filters(n)/sheet titles and verify both locales render with no missing-key fallback

## 4. Integration verification

- [ ] 4.1 Run `npm test` + `npm run build` and verify green
- [ ] 4.2 Manual pass on phone (light/dark) and desktop split and verify tokens, map/list sync, and no `xp`/`retro` UI remains
