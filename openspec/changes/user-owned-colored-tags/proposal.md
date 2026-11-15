# Proposal

## Why

Tags are currently free-form strings derived from places, with no identity, color, rename, or delete. Users cannot visually distinguish tags or curate their own vocabulary, and any rename requires editing places one by one.

## What Changes

- Introduce user-owned tag entities (`ownerId`, normalized `name`, `color`) stored on the server; each user starts from an empty set except for a one-time deterministic backfill from their existing place tags.
- New tags created in edit contexts get a random color from a fixed 32-color accessible palette; color is editable only to another palette entry (server-validated).
- Tag management (rename, recolor, delete) is available only in edit contexts (add-place form and inline place editor) via right-click / long-press context menu plus a keyboard-accessible affordance.
- Rename applies to the definition plus a bulk rewrite of all of the owner's places carrying that name; renaming to an existing name merges (keeps target color, collapses duplicates).
- Delete removes the definition and strips the tag from all of the owner's places (with confirm); zero-count tags remain selectable and are not garbage-collected.
- `GET /api/tags` returns definitions with colors and live usage counts (including zeros); filter rail and place chips render viewer-owned colors with hash fallback for unknown names.
- One-time migration backfills definitions via `stableHash(normalizedName) % 32`; new users start empty.

## Capabilities

### New Capabilities

None — this change enriches the existing tag vocabulary rather than introducing a separate durable behavior.

### Modified Capabilities

- `tags`: from derived flat string arrays to user-owned entities with color, CRUD, rename/merge, delete, palette constraint, deterministic backfill, and viewer-color display rule.

## Impact

- Backend: new `tag_definitions` table + migration, new `POST/PATCH/DELETE /api/tags` endpoints, extended `GET /api/tags` contract (`{tag, color, count}`), bulk place-tag rewrites in transactions.
- Frontend: `TagCombobox` edit variant gains create-with-random-color + context menu (rename/recolor/delete), colored dot rendering in pills/filter list/`PlaceCard` chips, palette picker UI, i18n additions.
- Data: one-time backfill migration; `places.tagsJson` format unchanged (still string arrays).
- Out of scope: sharing tag definitions across users, free-form hex colors, tag management outside edit mode, tag history/audit.
