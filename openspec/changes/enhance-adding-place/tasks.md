# Tasks

## 1. Venue type label plumbing

- [x] 1.1 Extend `PlaceDetails` + `parseDetails` to expose display-only venue type label (`primaryTypeDisplayName.text` verbatim, fallback prettified `primaryType` / first usable `types[]`, null when none) and verify unit tests cover verbatim, fallback, generic-filtered, and missing cases.
- [x] 1.2 Render the type row in `VenueDataCard` (hidden when null, shared desktop + mobile) with `en`/`fr` label strings and verify visual + locale tests pass.

## 2. Mobile rating parity

- [x] 2.1 Add nullable 1–5 `Stars` input to mobile `AddPlaceSheet` (default `null`, clearable), wire into create payload, and verify a new place saves the chosen rating and `null` when untouched.
- [x] 2.2 Fix mobile duplicate-merge to preserve stored rating on `null` draft and apply explicit rating when set (both pre-check and 409 paths) and verify unit tests for preserve vs overwrite pass.

## 3. Integration verification

- [x] 3.1 Run `mise run check` (typecheck + lint + format:check + tests) and verify green; document any new/updated test files in the spec PR.
- [x] 3.2 Verify no `src/` FieldMask, DB schema, or desktop `AddPage` rating behavior changes (diff review) and verify autocomplete rows remain type-free per scope.
