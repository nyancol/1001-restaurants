# Tasks

## 1. Backend: full-set places list

- [x] 1.1 Remove page slicing from `GET /api/v1/places` in `src/places/routes.ts` (drop the `LIMIT ?` over-fetch and the COUNT query, respond `{ data }` with no `pagination` object, remove the `pagination.ts` imports) and verify `mise run check` typechecks
- [x] 1.2 Remove `limit`/`cursor` from the places route schema/OpenAPI with no compatibility layer (no accept-and-ignore code, no `400 invalid_cursor`) and verify a request with stray `limit=1&cursor=nope` still returns the full set with `200`
- [x] 1.3 Rewrite places pagination cases in `tests/api-v1-contract.test.ts` (full-set `{ data }` shape, stray paging params ignored, cursor-walk removal) keeping tags/users cases green, and verify with the contract test run

## 2. Web client: stop paging, render all matches

- [x] 2.1 Drop `limit`/`cursor` from `listPlaces` in `web/src/lib/api.ts` and verify `usePlaces` consumers (`ListPage`, `MapPage`, `SplitPage`) typecheck with no call-site changes
- [ ] 2.2 Confirm list scrolls all matches and map pins the full shared result set for a >20-place owner, and verify with a manual pass plus existing `usePlaces` tests

## 3. Spec deltas and docs consistency

- [x] 3.1 Update `README.md` API lines for `GET /api/v1/places` (full set as `{ data }`, no `limit`/`cursor`, no `pagination` object) and verify the documented shape matches the new response
- [x] 3.2 Verify `openspec validate --change disable-pagination` passes and every delta scenario traces to a task; the main specs under `openspec/specs/` are updated by the archive step at merge, not by tasks

## 4. Integration verification

- [x] 4.1 Run `mise run check` (typecheck + lint + format:check + tests) green
