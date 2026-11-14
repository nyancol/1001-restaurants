# Design

## Context

See proposal.md Why. Current state (verified in code):
- Backend `DELETE /api/places/:id` in `src/places/routes.ts` is owner-checked (`ownerId === userId`, else `403`; missing → `404`) and covered by `tests/api.test.ts`.
- Editing is inline, not a route: `PlaceListPane` / `MapView` popup render `PlaceCard` + conditional `PlaceEditor` (`onSave` → `PATCH`, `onCancel`). Gated by `readOnly` (`owner !== "me"`) in `ListPage`/`SplitPage`/`MapPage`.
- Web client (`web/src/lib/api.ts`) has `patchPlace`/`refreshPlace` but no `deletePlace`; `usePlaces` has `flipStatus`/`saveEdit` with optimistic update + rollback but no delete; no delete i18n keys.

## Goals / Non-Goals

**Goals:**
- Owner-only Delete control inside the edit section with confirmation, wired to the existing DELETE endpoint.
- Consistent behavior in list, split, and map edit sections; localized EN/FR.

**Non-Goals:**
- No backend/API/schema/migration changes; no bulk delete, undo, soft-delete, or cascade changes.
- No custom modal design system — native `window.confirm` for v1.
- No change to read-only views beyond staying hidden.

## Decisions

1. **Placement: inside `PlaceEditor` footer, left-aligned danger button; Save/Cancel stay right.**
   - Rationale: user asked for edit-section location; one place covers list + split + map (all reuse `PlaceEditor`). Alternatives (card-level trash icon, separate route) rejected: more surface, easier accidental taps.
2. **Confirmation via native `window.confirm` with localized string.**
   - Rationale: zero new UI state/a11y burden, matches existing minimal editor; custom modal deferred. Trade-off: native chrome is not translated by us (allowed by localization spec boundaries).
3. **New `deletePlace(id)` in `api.ts` + `deleteOne(p)` in `usePlaces` with optimistic removal + rollback.**
   - Rationale: mirrors `saveEdit`/`flipStatus` pattern (`setPlaces` filter-out, `await deletePlace`, on error refetch/rollback + `setError` with localized `editor.deleteFailed`). `PlaceListPane` closes `editingId` on success. Alternatives (pessimistic only) rejected: list feels stale.
4. **Owner gating by existing `readOnly` prop only — no new permission logic.**
   - Rationale: `readOnly = owner !== "me"` already hides the whole editor for others, so delete inherits it; server remains source of truth (`403`).
5. **i18n keys: `editor.delete`, `editor.deleteConfirm`, `editor.deleteFailed` in `en.ts`/`fr.ts`.**
   - Rationale: fits existing `editor.*` namespace and `Complete UI chrome translation` requirement.

## Risks / Trade-offs

- [Accidental delete] → Mitigation: confirmation + button styled danger/secondary, placed away from Save.
- [Optimistic removal hides failure] → Mitigation: rollback/refetch + error toast; `404` (already deleted elsewhere) treated as success-remooval.
- [Native confirm UX inconsistency] → Mitigation: acceptable for v1; replaceable without spec change.

## Migration Plan

- Frontend-only deploy; no migration. Rollback = revert web bundle. Existing places untouched.

## Open Questions

- None. Copy wording for confirm/failure to be finalized in implementation within EN/FR keys.
