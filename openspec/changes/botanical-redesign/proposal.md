# Proposal: Botanical Butter & Earth Redesign

## Why

The current XP/Retro UI is functional but generic and dense. Stitch explorations converged on a warm “In my Belly” dining-journal identity (Botanical Butter & Earth, Literata + Nunito Sans, butter/forest/sage) with a 3-column journal layout that users already approved in 2 screens.

## What Changes

- Add `botanical` theme (default) implementing Botanical Butter & Earth tokens; keep `xp`/`retro` working via ThemeSwitcher.
- Reskin app shell: header with “In my Belly / Personal dining journal & shared taste”, `+ New Memory` CTA, user chip; warm footer with tagline + guide links.
- Desktop (`lg+`) 3-pane journal: left filter rail (Me/Friends, search, Lists & State counts, Tags with counts + reset), center Saved Tables feed (header + sort + card/grid toggle + journal cards), right sticky map with Artisan/Transit + RE-CENTER + preview card + “View Tasting Notes”.
- Mobile: stacked — header, Me/Friends + search, Lists collapsible, Tags horizontal scroll, Saved Tables feed; map via existing `/map` route with bottom preview sheet.
- Journal cards: title + `★ rating` honey pill + `Been 3x` / `Want to go` status pill, italic quote note on butter wash, photo duo placeholders, address/price/visited footer.
- In-place edit mode (Clamato pattern): `Editing place` badge, Want-to-go/Been-here segmented, VISITS stepper, ICON picker row, TAGS & CUISINE pill editor with suggestions + count, YOUR RATING stars + `4.8 / 5.0` + label, NOTE textarea, Delete / Cancel / Save Changes bar.
- Best-effort data mapping: use existing `Place` fields (name, rating, tags, note, address); `Been Nx` derived from status/visits when available else hidden; price `$$` from `priceLevel` when present; friend rec line from note prefix when present; photos are grey placeholders until photo support lands.
- Extract `DESIGN.md` from Stitch Botanical system and `stitch upload design` to bind tokens.

## Capabilities

### New Capabilities
- `journal-layout`: 3-column dining-journal shell, rails, and responsive fallback described above.

### Modified Capabilities
- `theming`: add `botanical` theme as default, keep contract roles, add Literata/Nunito Sans + butter/forest tokens.
- `places-list`: restyle list feed + cards + inline edit mode to journal pattern; counts, sort, card/grid toggle.
- `map`: restyle map pane chrome + preview card (“View Tasting Notes”, No Reservations line), keep pins/clusters/locate/fit behavior.
- `app-branding`: rename shell to “In my Belly” with subtitle, New Memory CTA, footer copy.

## Impact

- Touched: `web/src/theme/*` (new `botanical.css`, registry, ThemeContext default, index.html boot), `web/src/App.tsx`, `web/src/pages/SplitPage.tsx`, `ListPage.tsx`, `MapPage.tsx`, `web/src/components/*` (FilterBar, OwnerPicker, PlaceCard, PlaceEditor, PlaceListPane, MapView, ViewToggle, Stars, IconPicker), `web/src/index.css`, `openspec/*`.
- No API/DB migration in this change; missing fields hidden, not mocked in prod.
- Stitch: `DESIGN.md` upload binds Botanical tokens to project `17221535513795953947`.
