# Tasks

## 1. Tag join table + backfill

- [x] 1.1 Add `place_tags(owner_id, tag_name, place_id)` schema + migration with indexes and verify `npm run typecheck` plus migration applies on a scratch DB
- [x] 1.2 Backfill join rows from existing `tagsJson` (normalize, dedupe) and verify counts match `GET /api/tags` output on fixture DB
- [x] 1.3 Keep join in sync on place create/patch/delete and tag rename/merge/delete and verify `tests/tags.test.ts`-equivalent join assertions pass

## 2. Places server-side filtering + pagination

- [x] 2.1 Implement SQL `owner/status/q/price` predicates + join-based `tags` AND filter in `(updatedAt DESC, id DESC)` order and verify new unit tests for filter combinations pass
- [x] 2.2 Implement `limit` (default 20, max 100, clamp+echo) + base64url `cursor(updatedAt:id)` + exact `total` and verify cursor walk returns no dupes/skips across pages
- [x] 2.3 Apply `openAt/openNow` as documented post-filter (short pages allowed, `total` = pre-filter) and verify open-filter test with mixed hours snapshots passes

## 3. Tags + users versioned pagination

- [x] 3.1 Serve `GET /api/v1/tags` from join `GROUP BY` counts with `{ data, pagination }` + exact `total` and verify ranked + `q`-filtered ordering matches existing tag tests
- [x] 3.2 Serve `GET /api/v1/users` with `{ data, pagination }` + exact `total`, sorted by displayName, and verify user directory test passes

## 4. Versioned routing + contract + clients

- [x] 4.1 Move JSON routes to `/api/v1/*`, keep `/api/health` unversioned, strict 404 for old `/api/*` JSON + docs paths, and verify unversioned `GET /api/places` returns `404 not_found`
- [x] 4.2 Update session guard + `isPlacesPath`/`requiredScopeForPlaces` to `v1` paths and verify M2M `read:places` / `refresh:places` bearer tests pass
- [x] 4.3 Source OpenAPI `info.version` from `package.json` at `/api/v1/openapi.json` and verify `info.version` equals package version via `openspec validate`-adjacent curl check
- [x] 4.4 Migrate `web/src/lib/api.ts` to `/api/v1` envelope (`data`/`pagination`) incl. infinite scroll + short-page handling and verify `npm run typecheck` + UI list/map smoke pass
- [x] 4.5 Update `preprod-verify.sh`, `hermes.yaml`, and docs for `v1` paths and verify `mise run preprod-verify` logic (read-only) references new paths

## 5. Integration verification

- [x] 5.1 Add contract tests for envelope shape, invalid cursor `400`, limit clamping, and versioned 404s and verify `npm test` passes
- [x] 5.2 Run full `npm test && npm run typecheck` and verify green plus `openspec validate --strict` passes for the change
