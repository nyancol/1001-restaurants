# Design

## Context

See `proposal.md` for motivation. Current state (verified 2026-11-23):
- `src/google/routes.ts` details FieldMask already requests `primaryType`, `primaryTypeDisplayName`, `types` — no server change needed.
- `web/src/lib/api.ts` `parseDetails()` drops all three after using them only for `inferIcon()`; `PlaceDetails` carries no type label.
- `VenueDataCard` shows Google rating chip, price chip, hours — no type row.
- Desktop `AddPage` renders `<Stars value onChange>` and sends `rating`; mobile `AddPlaceSheet` has no Stars, sends `rating: null`, and `duplicatePatchLenient` deletes `rating` (“this form has no rating input”).
- Owner answers 2026-11-23: source = Places API type (`primaryTypeDisplayName` + sensible fallback); placement = matched `VenueDataCard` only; persistence = display-only; rating = mobile/desktop parity.

## Goals / Non-Goals

**Goals:**
- Show a one-line venue-type label in `VenueDataCard` whenever Google returns usable type data.
- Give mobile add the same nullable 1–5 Stars control as desktop, wired into create + duplicate-merge without data loss.

**Non-Goals:**
- No autocomplete-row type columns; no DB snapshot columns; no FieldMask expansion; no desktop rating changes; no edit/list/map behavior changes. See proposal Out of Scope.

## Decisions

1. **Type label source: `primaryTypeDisplayName.text` first, prettified code fallback, else hidden.**
   - Why: matches owner wording (“use what the API returns, e.g. `primaryTypeDisplayName`”); localized by Google; zero extra billing.
   - Fallback order: (a) `primaryTypeDisplayName.text` trimmed non-empty → use verbatim; (b) else prettify `primaryType` (`indian_restaurant` → `Indian restaurant`); (c) else prettify first entry of `types[]` after filtering generic `point_of_interest`/`establishment`; (d) else render nothing (card layout unchanged).
   - Alternative considered: `editorialSummary` — rejected: not in current mask, extra SKU + snapshot questions, owner said use type.
2. **Placement: `VenueDataCard` enrichment block only.**
   - Why: owner explicitly scoped out autocomplete rows; card is shared by desktop `AddPage` and mobile sheet so one change covers both.
   - Visual: small muted row with type label (e.g. “✦ Indian restaurant”), hidden when empty; read-only badge behavior unchanged.
   - Alternative: suggestion-row subtitles — rejected per owner.
3. **Display-only, no persistence.**
   - `PlaceDetails` gains optional `venueTypeLabel?: string | null` (or equivalent) plumbed from `parseDetails`; `VenueDataCard` renders it. No `places` table columns, no create/patch payload additions, no refresh-endpoint changes.
   - Why: owner decision; avoids migration + snapshot-staleness semantics.
4. **Rating parity: reuse `Stars` in mobile sheet.**
   - State `rating: number | null` default `null`; `<Stars value={rating} onChange={setRating}>` placed above note (mirrors desktop grouping); payload sends `rating` (not hardcoded `null`).
   - Duplicate paths: `duplicatePatch` keeps `rating: existing.rating` fallback already; `duplicatePatchLenient` must stop deleting `rating` and instead omit only when local rating is `null` (preserve stored value on 409 without form value). Create-then-409 without fetched existing keeps local rating.
   - Why: smallest change that reaches desktop parity and fixes silent `null` overwrite.
5. **i18n: reuse `stars.*` keys + one new `add.venueType` label if needed; add `en`/`fr` strings.**
   - Why: existing `LanguageContext` pattern; no new locale plumbing.

## Risks / Trade-offs

- [Google returns unlocalized or ALL-CAPS type text] → render verbatim; fallback prettify uses Title Case, acceptable for v1.
- [Generic types only (`point_of_interest`)] → filtered; card shows nothing rather than a useless label.
- [`primaryTypeDisplayName` shape drift (`{text, languageCode}` vs string)] → `parseDetails` accepts both, trims, guards non-strings.
- [Mobile layout crowding] → Stars row reuses existing spacing scale; no new sheet height (scrollable form).
- [Duplicate-merge regression] → explicit unit tests for `rating:null` preserving stored rating vs explicit rating overwriting.

## Migration Plan

Docs-only change; no migration. Implementation is additive UI + parser plumbing; rollback is revert. No backfill (display-only).

## Open Questions

None — owner answered all five scope questions on #48 (2026-11-23). Deferrable polish (exact glyph, casing) left to implementer within existing theme tokens.
