# Tasks

## 1. API + state

- [x] 1.1 Add `deletePlace(id)` to `web/src/lib/api.ts` calling `DELETE /api/places/:id` and verify `DELETE` returns `{ok:true}` via manual fetch/unit check.
- [x] 1.2 Add `deleteOne` to `web/src/lib/usePlaces.ts` with optimistic removal, rollback/refetch and localized error on `403`/`404`/network, and verify list removes the place on success and restores it on failure.

## 2. Edit-section UI

- [x] 2.1 Add owner-only Delete button + `window.confirm` flow to `PlaceEditor.tsx` (props `onDelete`), styled as danger/secondary away from Save, and verify button renders in edit section and Cancel aborts with no API call.
- [x] 2.2 Wire `onDelete` in `PlaceListPane.tsx` (close `editingId`, call `deleteOne`) and `MapView.tsx` popup editor so both entry points delete, and verify card disappears and editor closes on confirm in each view.
- [x] 2.3 Confirm no Delete/edit affordance in read-only views (`owner !== "me"` in `ListPage`/`SplitPage`/`MapPage`) and verify Bob-scoped view shows no Edit/Delete controls.

## 3. Localization + verification

- [x] 3.1 Add `editor.delete`, `editor.deleteConfirm`, `editor.deleteFailed` to `web/src/i18n/en.ts` and `fr.ts`, and verify EN and FR render with `document.documentElement.lang` set correctly.
- [x] 3.2 Run existing backend ownership test (`tests/api.test.ts` delete `403` case) plus typecheck/lint for touched frontend files, and verify all pass with no backend changes.
