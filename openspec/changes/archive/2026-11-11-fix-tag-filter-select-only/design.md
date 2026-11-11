# Design

## Context

See proposal.md for why. Current state: `web/src/components/TagCombobox.tsx` is shared by three callers — `FilterBar.tsx` (list/map filter), `AddPage.tsx` (create), `PlaceEditor.tsx` (inline edit). It always enables free-text creation: Enter adds any input, and a "Create …" row plus "No matches — press Enter to create" hint appear when there is no exact suggestion match. `FilterBar` renders `TagCombobox` with `value`/`onChange` only.

## Goals / Non-Goals

**Goals:**
- Single `TagCombobox` implementation serving both modes via an explicit prop; filter caller opts into select-only.
- No visual/behavioral change in add and edit flows.

**Non-Goals:**
- No backend, API, URL-param, or suggestion-ranking changes.
- No new filter UI beyond removing creation affordances (no redesign of `FilterBar`).
- No validation changes on the server; unknown tags in URL params keep filtering to empty.

## Decisions

- **Add `allowCreate` prop (default `true`) to `TagCombobox`; `FilterBar` passes `allowCreate={false}`.**
  - Rationale: smallest diff, preserves current behavior for the two edit callers without touching them; call sites read declaratively.
  - Alternative (separate `TagFilterSelect` component) rejected: duplicates suggestion-fetch, debounce, cache, and chip UI for no behavioral gain.
  - Alternative (`mode: "create" | "select"`) rejected: boolean is sufficient for two states; rename later if a third mode appears.
- **Gate all three creation paths on the flag:** Enter-to-add, the "Create …" button, and the "No matches — press Enter to create" hint.
  - In select-only mode Enter with no exact suggestion match is a no-op (keeps dropdown open, input preserved); the empty state reads "No matches.".
  - Placeholder/label adjust by mode: edit keeps "Type to suggest, Enter to create"; filter uses "Type to filter by existing tags".
- **Suggestion selection path unchanged in both modes:** clicking a suggestion calls the existing `addTag` (duplicate-guarded, normalized).

## Risks / Trade-offs

- [Risk] Users who coined tags via the filter lose that shortcut → Mitigation: creation remains one tap away in add/edit flows where the tag is actually persisted; filter empty-state copy points at existing tags only.
- [Risk] Stale `allowCreate` default (`true`) could reintroduce creation if a future filter reuses the component without the flag → Mitigation: name the prop positively and note in code comment that filter contexts must pass `false`; verify in review that `FilterBar` is the only `false` caller.

## Migration Plan

- Frontend-only change; no migration. Rollback by reverting the two files.
- Verify: existing-tag filter select still narrows list + map; unknown text + Enter in filter adds nothing; add/edit flows still create via Enter and "Create …".

## Open Questions

- None.
