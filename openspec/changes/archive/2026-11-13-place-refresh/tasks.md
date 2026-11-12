# Tasks

## 1. M2M Bearer validation + config

- [x] 1.1 Add Places API resource / JWKS config (fail-fast like existing OIDC) and verify `npm run typecheck` passes with missing values rejected at boot
- [x] 1.2 Implement Bearer verification helper (JWKS signature, `iss`, `aud` contains resource, `exp`, scope check) with unit tests covering valid, expired, wrong-audience, and missing-scope tokens, and verify `npx vitest run <helper-test>` passes
- [x] 1.3 Document new env vars in `.env.sample` and verify the documented names match the loader

## 2. Refresh endpoint (snapshot-only)

- [x] 2.1 Implement `POST /api/places/:id/refresh` reusing the details field mask + `parseDetails` mapping, writing only the snapshot allowlist + `updatedAt`, and verify `npm run typecheck` passes
- [x] 2.2 Cover refresh handler with tests (success rewrites snapshot only, `422` without `googlePlaceId`, `503` without Google key, `502`/`429` relay without DB write, `404` unknown id) and verify `npx vitest run <places-test>` passes

## 3. Dual auth wiring on Places routes

- [x] 3.1 Branch the `/api/*` guard for `/api/places*` Bearer vs cookie, enforcing owner-only on cookie refresh and `refresh:places` / `read:places` on Bearer paths, and verify `npm run typecheck` passes
- [x] 3.2 Cover authz matrix with tests (owner cookie 200, other-owner cookie 403, M2M any-owner 200 with scope, M2M 403 without scope, M2M 401 bad/wrong-aud, Bearer on non-Places route still 401) and verify `npx vitest run <authz-test>` passes

## 4. Integration + contract check

- [x] 4.1 Run full `npm test` and `npm run typecheck`, and verify the OpenAPI output (`GET /api/openapi.json`) includes the refresh endpoint with its error codes
