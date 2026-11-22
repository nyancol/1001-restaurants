# Design

## Context

See proposal.md Why. Current state: `src/app.ts` registers `/api/*` with a session guard on `startsWith("/api/")` and bearer checks via `isPlacesPath()`; `GET /api/places` loads all rows then filters in JS (`src/places/routes.ts`); tags/users follow the same load-all pattern; OpenAPI version is hardcoded `0.1.0` while OTEL already reads `package.json`. Project is pre-live so a breaking hard-cut is allowed.

## Goals / Non-Goals

**Goals:**
- Single versioned prefix `/api/v1` for all JSON routes; `/api/health` stays unversioned.
- Cursor pagination with stable `(updatedAt DESC, id DESC)` order and server-side `owner/status/q/price/tags` filtering.
- Join-table truth for tag membership with backfill from `tagsJson`.

**Non-Goals:**
- No `/api/v2`, no compat alias/shim for old paths, no relational modeling of opening hours, no change to OIDC/session semantics.

## Decisions

- **Hard cut, no alias:** delete old routes; update `app.ts` guard, `isPlacesPath()`, `web/src/lib/api.ts`, and ops scripts in one change. Alternative (alias + Sunset) rejected: doubles test matrix for zero benefit pre-live.
- **Cursor = base64url(updatedAt:id):** stable for newest-first infinite scroll; avoids `OFFSET` drift on concurrent inserts. `limit` default 20, max 100, clamp + echo effective value. `total` = exact `COUNT(*)` of SQL matches before `openAt` post-filter.
- **Tags join `place_tags(owner_id, tag_name, place_id)`:** `EXISTS`-based AND filtering and `GROUP BY` counts in SQL. Backfill once from `tagsJson`, then join is truth; `tagsJson` retained as mirror or dropped in implementation (tasks decide). Alternative (`LIKE` on JSON) rejected: incorrect + unindexable.
- **`openAt/openNow` stays post-filter:** periods parsing (`parseHoursJson`/`isOpenAt`) remains in JS after the SQL page; contract documents short pages. Full relational hours rejected as over-modeling.
- **OpenAPI version from `package.json`:** read at boot like `observability/env.ts`; endpoint moves to `/api/v1/openapi.json`; `/api/docs` follows versioning decision in tasks.

## Risks / Trade-offs

- [Short pages under open filter] → document `total` = pre-filter count; frontend keeps fetching via `nextCursor` until filled or null.
- [Backfill skew if `tagsJson` has orphans] → migration normalizes + dedupes; orphans get deterministic color fallback already in use.
- [`owner=all` COUNT cost at scale] → acceptable pre-live; add index `(ownerId, updatedAt DESC, id DESC)` now, revisit approximate totals later.
- [M2M scope paths] → `requiredScopeForPlaces` must match `/api/v1/places*`; missed path = 401/403 for service clients; covered by contract tests.

## Migration Plan

1. Land schema migration (join table + backfill + indexes) with code reading/writing both shapes.
2. Switch routes + guards + frontend to `/api/v1` in same deploy; remove unversioned JSON routes.
3. Update `hermes.yaml`, `preprod-verify.sh`, Caddy targets if pinned to old paths.
4. Verify: health OK, version = package version, fixture pagination walks without dupes, M2M `read:places` / `refresh:places` green.
5. Rollback: revert commit on main (additive-only migration replays safely); no data loss as `tagsJson` mirror retained until follow-up cleanup.

## Open Questions

- Should `/api/docs` and `/api/openapi.json` redirects remain for old bookmarks, or 404 strictly?
- Exact `total` for `users`/`tags` (tiny tables) vs omitting for speed — default to exact unless profiling says otherwise.
