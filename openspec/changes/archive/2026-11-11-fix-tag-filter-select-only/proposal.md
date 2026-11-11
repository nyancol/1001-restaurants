# Proposal

## Why

The tag filter in the list/map views reuses the same tag combobox as place creation and editing, so it offers "Create …" for arbitrary text. Creating a tag from the filter is misleading: it selects a tag that matches zero places and implicitly invents vocabulary outside the edit flow where tags should be coined.

## What Changes

- Tag filter (used by list and map via shared `FilterBar`) becomes select-only: it only adds tags chosen from existing-tag suggestions; free-text Enter and "Create …" affordances are removed in that context.
- Tag creation stays allowed in edit contexts only: add-place form and inline place editor keep current create-via-Enter / "Create …" behavior.
- Filtering an unknown/zero-match tag by URL or pasted value keeps working as a filter (shows empty result set); the change only removes the UI path that proposes creation from the filter.
- No API, data model, URL param, or ranking changes.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `tags`: clarify where new tags may be coined (edit contexts only) vs. where selection is restricted to existing tags (filter).
- `places-list`: tag filter narrows to existing tags only and no longer proposes tag creation.

## Impact

- Affected code: `web/src/components/TagCombobox.tsx` (needs a select-only mode), `web/src/components/FilterBar.tsx` (uses select-only mode); `AddPage.tsx` and `PlaceEditor.tsx` keep creation mode unchanged.
- Map tab inherits the fix automatically via the shared `FilterBar` / `usePlaceFilters` state; no map-specific code change expected.
- No backend, migration, or API changes.
