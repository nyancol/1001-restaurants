# Tasks

## 1. Backend: full-set places list

- [ ] 1.1 Remove page slicing from `GET /api/v1/places` in `src/places/routes.ts` (drop `LIMIT ?` over-fetch, always `nextCursor: null`, `total` equals returned count) and verify `mise run check` typechecks
- [ ] 1.2 Retire `limit`/`cursor` on the places route (remove from schema/OpenAPI, accept-and-ignore on the wire, no `400 invalid_cursor`) and verify a request with `limit=1&cursor=nope` returns the full set with `200`
- [ ] 1.3 Rewrite places pagination cases in `tests/api-v1-contract.test.ts` (full-set envelope, retired-params ignored, cursor-walk removal) keeping tags/users cases green, and verify with the contract test run

## 2. Web client: stop paging, render all matches

- [ ] 2.1 Drop `limit`/`cursor` from `listPlaces` in `web/src/lib/api.ts` and verify `usePlaces` consumers (`ListPage`, `MapPage`, `SplitPage`) typecheck with no call-site changes
- [ ] 2.2 Confirm list scrolls all matches and map pins the full shared result set for a >20-place owner, and verify with a manual pass plus existing `usePlaces` tests

## 3. Spec deltas and docs consistency

- [ ] 3.1 Update `openspec/specs/places/spec.md` and `openspec/specs/api-contract/spec.md` main specs from the change deltas (full-set listing, retired params, tags/users-only envelope), and verify `openspec validate --change disable-pagination` passes
- [ ] 3.2 Update `openspec/specs/places-list/spec.md` and `openspec/specs/map/spec.md` main specs from the change deltas (all-matches scroll, full-set pins), and verify the delta scenarios read consistently with the main specs
- [ ] 3.3 Update `README.md` API lines for `GET /api/v1/places` (full set, no `limit`/`cursor`) and verify the documented shape matches the new envelope

## 4. Integration verification

- [ ] 4.1 Run `mise run check` (typecheck + lint + format:check + tests) green and verify CI scope is docs-plus-tests only with no `src/`/`web/` behavior change beyond this change's tasks
