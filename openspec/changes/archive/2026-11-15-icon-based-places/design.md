# Design

## Context

See proposal.md for motivation. Current state: `places.place_type` (NOT NULL, default `restaurant`) with normalization in `src/place-types/looks.ts`, `place_types` table + `GET /api/place-types`, `placeType` required on create, `?placeType=` server filter, client `mapGoogleType()` substring matching, `TypeCombobox` (4 options, blocks save), pins via `colorForType`/`glyphFor` letters R/C/B/P, `FilterBar` type select, `PlaceCard` emoji+label. Migrations 1–4 in `src/db/index.ts` own the `place_type` column lifecycle.

## Goals / Non-Goals

**Goals:**
- Single `icon` column replaces `placeType` end-to-end with zero required taxonomy.
- Inference is deterministic, testable, and frozen (no background updates).
- Map/list stay consistent (same icon source, neutral pin).

**Non-Goals:**
- No cuisine expansion beyond the 12 icons; long-tail Google types intentionally collapse to `fork`.
- No tag auto-creation, no backfill, no icon search beyond aria labels.
- No change to auth, sharing, open-hours logic, or refresh snapshot columns.

## Decisions

**1. `icon` column + migration 5 (add, backfill, drop via recreate).**
SQLite cannot drop a column with a default cleanly across old DBs, so migration 5: `ALTER TABLE places ADD COLUMN icon TEXT`, backfill `restaurant→fork / café,cafe,coffee→coffee / bakery→croissant / bar→cocktail / else→fork`, then recreate table without `place_type` (copy + drop + rename) to keep schema clean. `DROP TABLE place_types`. Rationale: explicit removal over lingering nullable column; recreate is safe inside the existing `sqlite.transaction` pattern. Alternative (keep `place_type` nullable, ignore it) rejected: leaves dead contract surface.

**2. Shared inference table, exact match only.**
New module (e.g. `src/place-icons/infer.ts`, mirrored client-side or served via `parseDetails`) exports `ICONS` (12 ids) + `PRIMARY_TYPE_TO_ICON: Record<string, IconId>`: `hamburger_restaurant→burger`, `pizza_restaurant→pizza`, `ramen_restaurant/noodle/soup→soup`, `hot_dog→hotdog`, `bagel_shop→bagel`, `bakery/patisserie/croissant→croissant`, `ice_cream/gelateria/dessert/yogurt→ice-cream`, `cocktail_bar/pub/speakeasy→cocktail`, `wine_bar→wine`, `brewery/beer_garden/irish_pub→beer`, `cafe/coffee_shop/tea_house/brunch_restaurant→coffee`; everything else → `fork`. Exact lowercased match on `primaryType`, then scan of `types[]` in order, no substring on names. Rationale: deterministic, no FR/EN dictionary, trivial unit tests. Alternative (substring/name matching) rejected per exploration: tags/names excluded.

**3. Validation: `icon` optional-in, normalized, default `fork`.**
`normalizeIcon` trims/lowercases; `ice cream`/`ice_cream`→`ice-cream` alias. Create without `icon` stores `fork`; patch accepts `icon`; `placeType` in payloads → `400`; `?placeType=` ignored (no error, for shared URLs). `GET /api/place-types` removed (404 via route deletion).

**4. Frontend: `IconPicker` replaces `TypeCombobox`, `inferIcon` replaces `mapGoogleType`.**
`AddPage.handlePick` preselects from `parseDetails().icon`; picker is a 12-button radiogroup with emoji + visually-hidden localized name; save never validates icon. `PlaceEditor` same picker bound to `p.icon ?? fork`. `usePlaceFilters`/`listPlaces` drop `placeType`; `FilterBar` drops the type select and active-chip branch. `Place` type: `icon: string`, `placeType` removed.

**5. Pins: single neutral fill + Lucide-style stroke glyphs.**
`pins.ts`: `PIN_FILL` constant, glyphs from `theme/iconSvg.ts` — 10 Lucide icons (ISC, attributed in-file) plus `hotdog`/`bagel` hand-drawn in the same 24-grid stroke style — drawn in the white circle at ~0.58 scale with stroke-width ~3.4 (≈2px effective, round caps) and reused via `IconGlyph` in cards (22px) and picker (24px, stroke 2). No painted colors inside glyphs: single `currentColor` only. Rationale over hand-drawn fills and emoji: professional stroke icons stay legible at zoom and identical across platforms. Closed-status grey/WIP overlays unchanged on the neutral base.

**6. i18n: remove visible strings, keep aria/search metadata.**
Delete `type.*`, `filter.type*`, `card.typeTitle`, `add.suggestedType`/`add.typeRequired`/`add.editableAbove` type wording (keep snapshot box minus type line); add `icon.<id>` FR/EN labels (12×2) used only for aria-label, title, and picker filter. No category word rendered next to the icon.

## Risks / Trade-offs

- [Fork-heavy map] Most Google types collapse to fork → mitigation: picker one tap away, documented as intended.
- [Bar→cocktail mislabels wine/beer] → Mitigation: stated as lossy in proposal/specs; no auto-fix.
- [Shared `?placeType=` URLs silently widen results] → Mitigation: ignore (not error); specs pin this behavior.
- [Emoji-in-canvas variance] Emoji glyphs render slightly differently per OS → Mitigation: white-circle backdrop + large glyph keeps them legible; fallback `•` if image fails.
- [Migration recreate risk on large DBs] → Mitigation: single transaction, copy-then-swap, existing tests run migration on fresh + seeded DBs.

## Migration Plan

1. Deploy backend migration 5 (add `icon`, backfill, recreate without `place_type`, drop `place_types`) — runs inside `runMigrations` transaction; rollback = restore DB file (no down-migration).
2. Deploy API changes (validation/filter/route removal) + frontend in the same release (no mixed-version window: old clients sending `placeType` get `400` with clear message).
3. Post-deploy: verify `openspec` specs (icon inference unit tests, 400-on-placeType tests, pin image tests) and manual pass FR/EN.

## Open Questions

- Final neutral `PIN_FILL` hex (theming token vs hardcoded) — answerable in implementation without changing specs.
- Whether `brunch_restaurant→coffee` vs `croissant` and `sports_bar→beer` vs `cocktail` deserve swaps — table is in specs; minor swaps don't change the approach.
