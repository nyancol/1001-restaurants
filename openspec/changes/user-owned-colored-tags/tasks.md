# Tasks

## 1. Backend foundation (palette, hash, schema, backfill)

- [x] 1.1 Add shared 32-color accessible palette constant plus stable hash helper (FNV-1a) and verify unit tests assert 32 unique palette entries, server rejection of off-palette values, and hash determinism for sample names.
- [x] 1.2 Add `tag_definitions(ownerId, name, color, createdAt, updatedAt)` table with unique `(ownerId, name)` plus migration that backfills one row per distinct normalized own-place tag with `PALETTE[hash(name) % 32]`, and verify migration test on a seeded DB creates expected rows and leaves `tagsJson` untouched.
- [x] 1.3 Document palette and hash choice in code comments and verify `bun test tests/tags.test.ts` (extended) passes.

## 2. Tag API (CRUD, rename/merge, delete, suggestions)

- [x] 2.1 Extend `GET /api/tags` to return definitions with `{tag, color, count}` including zero-count rows sorted `count DESC, lastUsed DESC, name ASC`, and verify API tests cover colors present, zeros included, ranking, `q` filter, and `401` unauthenticated.
- [x] 2.2 Implement `POST /api/tags` (normalize, palette-validate, idempotent on race) and `PATCH /api/tags/:name` recolor path, and verify API tests for create-with-random-color, create-with-explicit-color, `400` off-palette, and `404` foreign-name access.
- [x] 2.3 Implement `PATCH /api/tags/:name` rename and merge (definition update plus transactional bulk `tagsJson` rewrite, target-color-wins, per-place dedupe) and verify API tests for simple rename, merge collapse, ownership enforcement, and transaction atomicity on failure.
- [x] 2.4 Implement `DELETE /api/tags/:name` (delete definition plus transactional strip from own places) and verify API tests for strip-everywhere, deleting zero-count tags, and ownership enforcement.
- [x] 2.5 Wire tag-definition ensure-on-save into place `POST/PATCH` (create missing definitions with random palette colors) and verify API tests for auto-creation on place save and normalization consistency.

## 3. Frontend display (viewer-color dots everywhere)

- [x] 3.1 Add shared palette + viewer-color resolver (`myDefinition ?? hash fallback`) and dot-on-neutral pill component, and verify component tests for known-name, unknown-name fallback, and light/dark contrast (no colored text).
- [x] 3.2 Render color dots in filter `FilterTagList`, active filter chips, edit `Combobox` pills/suggestions, and `PlaceCard` chips (display-only outside edit mode), and verify component tests plus manual check on desktop rail and phone disclosure.
- [x] 3.3 Update `getTags` client typing to `{tag, color, count}` with backward-compatible fallback and verify `TagCombobox` tests pass with colored payloads and legacy payloads.

## 4. Frontend management (edit-mode context menu only)

- [x] 4.1 Build edit-pill context menu (right-click + ~500ms long-press with haptics/`preventDefault` + keyboard-accessible `…` button) offering Rename, Change color (32-swatch grid), Delete with confirm, and verify component tests for all three triggers and menu actions.
- [x] 4.2 Wire rename (including merge confirm when targeting an existing name), recolor, and delete to the new API with optimistic updates and rollback on failure, and verify component/integration tests for rename rewrite, merge keep-target-color, recolor without place churn, and delete strip.
- [x] 4.3 Add creation-with-random-color preview in edit `Combobox` (provisional color until save) and verify manual test: type new tag, see provisional dot, save, reload, color persists.

## 5. Integration, i18n, and acceptance

- [x] 5.1 Add `en`/`fr` strings for rename, recolor, delete, palette, confirms, and zero-count empty-state clarification, and verify missing-key lint passes and French UI renders correctly.
- [x] 5.2 Update `TagCombobox`/`FilterBar` tests for zero-count selectable rows, alphabetical tiebreak, and no-management-affordance in filter/cards, and verify full web test suite passes.
- [x] 5.3 Run end-to-end acceptance (backfilled user sees deterministic colors; new user starts empty; edit-mode rename/recolor/delete propagate; viewing another owner's scope uses viewer colors; `owner=all` renders without errors) and verify against spec scenarios checklist.
