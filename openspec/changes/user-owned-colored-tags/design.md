# Design

## Context

See proposal.md Why. Current state: `places.tagsJson` string arrays, no tag table (`src/db/schema.ts`, `src/db/index.ts`); `GET /api/tags` derives `{tag, count}` from own places (`src/tags/routes.ts`); `normalizeTags` is the single normalization (`src/tags/normalize.ts`); frontend `TagCombobox` has `combobox` (edit, `allowCreate=true`) vs `filter-list` (read-only) variants, `PlaceCard` chips and `FilterBar` are display/toggle only; no color, rename, context-menu, or long-press exists. Tags spec scopes suggestions to own places; places spec allows `owner=me|<id>|all` browsing with `readOnly = owner !== "me"`.

## Goals / Non-Goals

**Goals:**
- Server-owned per-user tag definitions with palette colors; single scope browsing stays conflict-free via viewer-color resolution.
- Rename (with merge), recolor, delete with transactional place rewrites.
- Accessible 32-color palette, deterministic backfill, zero-count retention.
- Management confined to edit contexts; filters/cards stay display-only.

**Non-Goals:**
- Cross-user shared palettes, free hex colors, management outside edit mode, history/audit, `tagsJson` format change.

## Decisions

- **Table `tag_definitions(ownerId, name, color, createdAt, updatedAt)`, PK `(ownerId, name)`.** Keeps `tagsJson` denormalized strings; definitions own `name+color`, places own usage. Alternative (place rows reference tag IDs / join table) rejected: churns every filter, edit form, and test for no v1 benefit.
- **Palette as server + client shared constant (32 hex entries), validated both sides, enforced server-side (`400` otherwise).** Hand-tuned OKLCH-spaced set checked for light/dark contrast as dot-on-neutral; dot rendering (never colored text) keeps contrast trivially safe. Alternative (free picker) rejected: breaks accessibility and viewer consistency guarantees. Random-new prefers a least-used palette slot; backfill uses `FNV-1a(lower(name)) % 32` (stable across processes; `djb2` equivalent acceptable — pick one and pin it in code).
- **API: extend `GET /api/tags -> [{tag, color, count}]` (definitions LEFT JOIN usage, zeros included, sort `count DESC, lastUsed DESC, name ASC`); add `POST /api/tags {name, color?}`, `PATCH /api/tags/:name {newName?, color?}`, `DELETE /api/tags/:name`.** All owner-scoped, `401` unauth, `404` for foreign names (no cross-user leak), `409` only if creation races — second writer wins idempotently when `(name,color)` compatible, else returns existing. `PATCH` rename + place rewrite + (merge ? drop source : update row) run in one SQLite transaction; delete = delete row + strip from `tagsJson` rows in one transaction.
- **Creation semantics: ensure-on-save + ensure-on-manage.** Typing in edit mode previews a provisional random color; the definition row is created at place `POST/PATCH` (and eagerly on explicit manage actions). Aborted forms may leave zero-count rows — accepted, since zeros stay selectable by design.
- **Viewer-color display rule.** Chips, pills, and filter list resolve `color = myDefinition(name) ?? PALETTE[hash(name)%32]`. No owner color enters place payloads, so `owner=<id>` and legacy `owner=all` need no payload change. Alternative (embed owner colors) rejected: leaks palettes and complicates every list response.
- **Edit-mode-only menu.** Context menu component lives in the edit `Combobox` pills only: `onContextMenu` (desktop) + `~500ms` press-and-hold timer with `preventDefault`/vibrate (touch) + visible `…`/keyboard-focusable button opening the same menu (rename dialog, 32-swatch grid, delete confirm). `FilterTagList`, `FilterBar` chips, `PlaceCard` chips unchanged except dot rendering.

## Risks / Trade-offs

- [Risk] Bulk rename/delete rewrites N place rows; large libraries could be slow → Mitigation: single transaction, `updatedAt` bump only on touched rows, no per-row enrichment calls.
- [Risk] Concurrent create of same name creates dupes → Mitigation: unique `(ownerId,name)` constraint; second writer treated as idempotent success.
- [Risk] Merge target ambiguity (which color/count wins) → Mitigation: target color wins by spec; counts recomputed from rewritten `tagsJson`; duplicates collapsed per place.
- [Risk] Filter-by-zero-count-tag yields empty while viewing another owner → Mitigation: keep selectable (spec) + clarify empty-state copy ("no places in this scope carry …").
- [Risk] 32-color adjacent distinguishability + colorblindness → Mitigation: color is decorative only (never sole signal; label always present), dot-on-neutral, palette spaced in hue/lightness and spot-checked with simulator.
- [Risk] Rename invalidates bookmarked `?tags=` URLs → Mitigation: accepted; filter holds raw strings and simply matches nothing post-rename (no redirect map in v1).

## Migration Plan

1. Deploy schema migration creating `tag_definitions` + unique index; backfill per user per distinct normalized name from own `tagsJson` with `PALETTE[FNV-1a(name)%32]`, `createdAt/updatedAt = now`.
2. Ship backend (new endpoints + extended `GET`) behind no flag — old clients ignore `color`.
3. Ship frontend (dot rendering, menu, palette picker); cache-bust `cachedTags` entries lacking `color`.
4. Rollback: drop new endpoints usage; definitions table left inert; `tagsJson` untouched so rollback is lossless.

## Open Questions

- None blocking; palette final hex values and menu trigger affordance (`…` vs hover-only) can be settled during implementation without changing specs or task shape.
