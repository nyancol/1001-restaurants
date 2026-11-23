# Design

## Context

See proposal.md (Why). Current state: `GET /api/v1/places` (`src/places/routes.ts`) applies SQL filters, then slices `LIMIT ?` with `limit + 1` rows to compute `nextCursor` in stable `(updated_at DESC, id DESC)` order, and returns `envelope(items, limit, nextCursor, total)`. The web client (`listPlaces` in `web/src/lib/api.ts`, consumed via `usePlaces` by `ListPage`, `MapPage`, `SplitPage`) never sends `limit`/`cursor`, so it always receives the 20-item default page while believing it has the full set. `src/pagination.ts` (`parseLimit`, `encode/decodeCursor`, `envelope`, offset helpers, `DEFAULT_LIMIT`/`MAX_LIMIT`) is shared with `GET /api/v1/tags` and `GET /api/v1/users`, which keep pagination.

## Goals / Non-Goals

**Goals:**

- One `GET /api/v1/places` response carries every place matching the filters, so map pins and list rows always equal the full result set.
- Pagination is fully dropped on the places endpoint — no `pagination` object, no `limit`/`cursor` params, no compatibility layer (owner directive: the app is not live yet, so there is nothing to stay tolerant toward).
- Tags/users pagination behavior is untouched.

**Non-Goals:**

- No new query params, no viewport/bbox filtering, no list virtualization (see proposal Out of scope).

## Decisions

### 1. Server returns the full filtered set as `{ data }` — no `pagination` object

Remove the `LIMIT ?` slice and the `limit + 1` over-fetch from the places list query; keep the existing `WHERE` filter construction, the `(updated_at DESC, id DESC)` ordering, and the `openAt`/`openNow` JS post-filter (now applied to the full set, which also eliminates the documented short-page anomaly). Drop the separate COUNT query too — with no pages there is no page-independent total to compute. Respond `{ data: [...] }` in the same order, with no `pagination` object.

- Alternative considered: keep the envelope with `nextCursor: null` and `total === data.length`. Rejected per owner directive: the app is not live, so a permanent shell echoing retired paging state is dead weight in every response and in the OpenAPI schema.
- Alternative considered: return a bare JSON array. Rejected: `{ data }` is the shared list-response convention across the API; a bare array would be the lone outlier for no gain.
- Alternative considered: keep `LIMIT` with a raised default. Rejected: any cap reintroduces the silent-truncation bug the issue reports.

### 2. No compatibility shim: `limit`/`cursor` are simply removed

The route schema drops `limit`/`cursor` from validation/OpenAPI, and the contract simply has no such parameters. Stray occurrences hit the framework's default behavior (unknown query params are ignored), so no `400 invalid_cursor` branch, no clamping, and no accept-and-ignore code is written. Rationale: the app is pre-live — there are no out-of-date callers to stay tolerant toward, so an explicit retirement behavior would be spec surface for a client that does not exist. A strict `400` on unknown params was considered and rejected: it would require `additionalProperties: false` strictness the rest of the API does not have.

### 3. `MAX_LIMIT`/`DEFAULT_LIMIT` and `src/pagination.ts` stay for other callers

`parseLimit`, cursor/offset codecs, and `envelope` remain the shared implementation for `GET /api/v1/tags` and `GET /api/v1/users`; nothing about them or their bounds changes. The places handler stops importing `parseLimit`/`decodeCursor`/`encodeCursor`/`envelope`; `src/pagination.ts` itself is untouched, so a future endpoint can reuse the helpers.

### 4. Payload-size and cluster behavior as the dataset grows

Full-set responses grow linearly with matching places (each place carries its snapshot fields). At the current personal-collection scale (tens to low hundreds of places) a single JSON response is tens of KB — negligible. If the dataset grows by an order of magnitude or more, mitigations (in priority order, all future work): map-side marker clustering already exists per the map spec and absorbs pin density; list rendering may need windowing/virtualization; the API could reintroduce opt-in paging or a field-sparse mode. None of that is built here; the spec deltas record the full-set guarantee so a future change must revisit them explicitly rather than silently re-capping.

## Risks / Trade-offs

- [Risk] A very large collection makes the single response heavy → Mitigation: dataset is a personal collection; design records the growth path above without building it.
- [Risk] A consumer reading `body.pagination` breaks on the new `{ data }` shape → Mitigation: the app is pre-live; the only existing consumer (web client) reads `body.data` only, and no M2M consumer exists yet.

## Migration Plan

Single deploy, no data migration, no config change. The app is not live, so there are no deployed consumers to migrate: the web client and server ship together in one change, and rollback is a plain revert.

## Open Questions

None. Fully dropping pagination (no shim) and the unchanged tags/users scope follow directly from the owner's directive (pre-live, no compatibility needed) and the codebase; no deferrable unknowns remain.
