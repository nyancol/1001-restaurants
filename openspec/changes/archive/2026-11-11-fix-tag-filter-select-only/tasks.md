# Tasks

## 1. TagCombobox select-only mode

- [x] 1.1 Add `allowCreate` prop (default `true`) to `TagCombobox` gating Enter-to-add, the "Create …" row, and the "press Enter to create" hint, with mode-appropriate placeholder/copy, and verify `npm run typecheck` passes
- [x] 1.2 Keep suggestion-select path identical in both modes (duplicate-guarded normalized add) and verify existing backend tests still pass via `npm test`

## 2. Filter wiring

- [x] 2.1 Pass `allowCreate={false}` from `FilterBar` tag filter and verify typing an unknown tag shows no "Create …" option and Enter adds no chip, while picking a suggested tag still adds the filter chip
- [x] 2.2 Confirm add-place (`AddPage`) and inline edit (`PlaceEditor`) still allow creation via Enter and "Create …" and verify manually in both flows

## 3. Filter/map regression

- [x] 3.1 Verify list and map narrow identically when selecting/removing existing tag filters via shared `FilterBar`, and that a pre-set unknown `?tags=` value still yields the empty result set with a removable chip
- [x] 3.2 Run full verification (`npm run typecheck`, `npm test`, `npm run build:web`) and verify all succeed
