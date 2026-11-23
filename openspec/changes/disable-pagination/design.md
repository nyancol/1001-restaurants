# Design

## Context

See proposal.md (Why). Current state: `GET /api/v1/places` (`src/places/routes.ts`) applies SQL filters, then slices `LIMIT ?` with `limit + 1` rows to compute `nextCursor` in stable `(updated_at DESC, id DESC)` order, and returns `envelope(items, limit, nextCursor, total)`. The web client (`listPlaces` in `web/src/lib/api.ts`, consumed via `usePlaces` by `ListPage`, `MapPage`, `SplitPage`) never sends `limit`/`cursor`, so it always receives the 20-item default page while believing it has the full set. `src/pagination.ts` (`parseLimit`, `encode/decodeCursor`, `envelope`, offset helpers, `DEFAULT_LIMIT`/`MAX_LIMIT`) is shared with `GET /api/v1/tags` and `GET /api/v1/users`, which keep pagination.

## Goals / Non-Goals

**Goals:**

- One `GET /api/v1/places` response carries every place matching the filters, so map pins and list rows always equal the full result set.
- Retirement of `limit`/`cursor` on the places endpoint is backward-tolerant for any caller still sending them.
- Tags/users pagination behavior is untouched.

**Non-Goals:**

- No new query params, no viewport/bbox filtering, no list virtualization (see proposal Out of scope).

## Decisions

### 1. Server returns the full filtered set in one response

Remove the `LIMIT ?` slice and the `limit + 1` over-fetch from the places list query; keep the existing `WHERE` filter construction, the `(updated_at DESC, id DESC)` ordering, the `total` count query, and the `openAt`/`openNow` JS post-filter (now applied to the full set, which also eliminates the documented short-page anomaly). Respond with the existing envelope shape `{ data, pagination: { limit, nextCursor: null, total } }` where `total === data.length` after post-filtering and `nextCursor` is always `null`.

- Alternative considered: envelope without `pagination` entirely. Rejected: keeping the shape avoids breaking `body.data`/`body.pagination` readers and stays additive inside `v1`.
- Alternative considered: keep `LIMIT` with a raised default. Rejected: any cap reintroduces the silent-truncation bug the issue reports.

### 2. `limit`/`cursor` are retired as accept-and-ignore (not `400`, not removed from the wire)

The route schema drops `limit`/`cursor` from validation/OpenAPI so clients stop sending them, but if they arrive they are ignored: no `400 invalid_cursor`, no clamping, no effect on the result. Rationale: the client base is tiny and owned (web UI + M2M bearer clients), the project is pre-live, and tolerance avoids a flag day for any out-of-date caller. `400` was considered and rejected because a stale `cursor` from a cached client would hard-fail a read path; silent ignore degrades to the correct full set.

### 3. `MAX_LIMIT`/`DEFAULT_LIMIT` and `src/pagination.ts` stay for other callers

`parseLimit`, cursor/offset codecs, and `envelope` remain the shared implementation for `GET /api/v1/tags` and `GET /api/v1/users`; nothing about their bounds changes. The places handler simply stops calling `parseLimit`/`decodeCursor`/`encodeCursor`. No dead-code removal in this change, so a future endpoint can reuse the helpers.

### 4. Payload-size and cluster behavior as the dataset grows

Full-set responses grow linearly with matching places (each place carries its snapshot fields). At the current personal-collection scale (tens to low hundreds of places) a single JSON response is tens of KB — negligible. If the dataset grows by an order of magnitude or more, mitigations (in priority order, all future work): map-side marker clustering already exists per the map spec and absorbs pin density; list rendering may need windowing/virtualization; the API could reintroduce opt-in paging or a field-sparse mode. None of that is built here; the spec deltas record the full-set guarantee so a future change must revisit them explicitly rather than silently re-capping.

## Risks / Trade-offs

- [Risk] A very large collection makes the single response heavy → Mitigation: dataset is a personal collection; design records the growth path above without building it.
- [Risk] Stale clients still send `cursor` expecting page 2 → Mitigation: accept-and-ignore returns the full set, which is a superset of what they asked for; web client stops sending both params.
- [Risk] `total` semantics change (pre-post-filter count → exact returned count) → Mitigation: documented in the places delta; no consumer reads `total` today (web client uses `body.data` only).

## Migration Plan

Single deploy, no data migration, no config change. Web client and server ship together; either order is safe (old client works against new server, new client works against old server — it just gets at most one page until the server ships). Rollback: revert the change; clients tolerate both shapes.

## Open Questions

None. The retirement approach (accept-and-ignore) and the unchanged tags/users scope follow directly from the owner's directive and the codebase; no deferrable unknowns remain.
