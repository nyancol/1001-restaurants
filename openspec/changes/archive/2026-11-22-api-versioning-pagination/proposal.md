# Proposal

## Why

List endpoints (`GET /places|tags|users`) return unbounded arrays filtered in JS memory after a full-table load, and all routes live on unversioned `/api/*` with a hardcoded OpenAPI `info.version` (`0.1.0` vs `package.json 0.1.2`). With multiple consumers (web UI + M2M bearer clients) this blocks safe evolution. Project is pre-live, so a breaking cut is cheap now and expensive later.

## What Changes

- **BREAKING** Move all JSON API routes from `/api/*` to `/api/v1/*` (`/api/health` stays unversioned as infra probe; `/api/docs` redirect/alias decided in design).
- **BREAKING** Paginated envelope for list endpoints: `{ data, pagination: { limit, nextCursor, total? } }` replacing `{ places: [...] }` / `{ tags: [...] }` / `{ users: [...] }`.
- Server-side filtering for `GET /api/v1/places` (`owner`, `status`, `q`, `price` in SQL; `tags` via new join table; `openAt/openNow` stays documented JS post-filter and may return fewer than `limit`).
- Replace `tagsJson`-string filtering with a real `place_tags` join table + backfill migration; keep `tagDefinitions` (colors) as-is.
- OpenAPI `info.version` sourced from `package.json` at boot (same source OTEL already uses); path tracks contract (`v1`), version tracks build.
- **BREAKING** Frontend (`web/src/lib/api.ts`) and M2M `isPlacesPath` / scope checks migrate to `/api/v1`; old paths removed, no alias (not live yet).
- Additive-only rule inside `v1` going forward; breaking changes require `v2`.

## Capabilities

### New Capabilities
- `api-contract`: versioned base path, paginated envelope + cursor rules, OpenAPI version sourcing, additive-only rule and breaking-change policy.

### Modified Capabilities
- `places`: list moves to `GET /api/v1/places` with server-side filtering + pagination; create/read/patch/delete/refresh paths versioned.
- `tags`: suggestions move to `GET /api/v1/tags` with envelope + pagination; filtering backed by join table.
- `users`: directory moves to `GET /api/v1/users` with envelope.
- `places-list`: list/map UX consumes paginated `v1` shape; documents short-page behavior when `openAt` post-filter is active.

## Impact

- Affected code: `src/app.ts` (route prefix, auth guard, swagger version), `src/places/routes.ts` (SQL filtering, pagination, join), `src/tags/routes.ts`, `src/users/routes.ts`, `src/db/schema.ts` + migration (join table + backfill), `src/auth/places-bearer.ts` (`isPlacesPath`), `web/src/lib/api.ts`, `skills/ops/scripts/preprod-verify.sh`, `hermes.yaml` health/version checks.
- Systems: preprod slot + Arcane prod deploy (not live, no compat window needed); OTEL `service.version` unchanged (already package-driven).
