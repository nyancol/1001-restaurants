# Proposal

## Why

`GET /api/v1/places` caps results at a server-side default of 20 (`DEFAULT_LIMIT`), but the web client never sends `limit`/`cursor` (`web/src/lib/api.ts:listPlaces`, `web/src/lib/usePlaces.ts`). The map therefore renders at most 20 pins and the list shows at most 20 cards, silently hiding the rest. Per the owner's directive on #44, viewport/zoom-driven pin loading is overkill for this dataset: pagination on places should be disabled so one request returns every match.

## What Changes

- **BREAKING** `GET /api/v1/places` returns the full filtered result set in a single response: no page slicing, `pagination.nextCursor` is always `null`, `pagination.total` equals `data.length`.
- **BREAKING** `limit` and `cursor` query params on `GET /api/v1/places` are retired: silently accepted-and-ignored (no `400`), removed from the route schema/OpenAPI so clients stop sending them.
- `web/src/lib/api.ts` `listPlaces` drops `limit`/`cursor` params; `usePlaces` keeps its single-fetch shape and now receives all matches for both list and map panes.
- `src/pagination.ts` helpers (`parseLimit`, cursor encode/decode, `envelope`) stay for the remaining paginated endpoints (`GET /api/v1/tags`, `GET /api/v1/users`); `DEFAULT_LIMIT`/`MAX_LIMIT` remain their bounds.
- Tests updated: places contract tests assert full-set responses instead of cursor walking; tags/users pagination tests unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `places`: list returns the complete filtered set in one response; `limit`/`cursor` retired on this endpoint.
- `places-list`: list scrolls all matching places; cursor-walk and short-page scenarios removed.
- `map`: map pins cover the full filtered result set from the shared single fetch.
- `api-contract`: paginated-envelope requirement scoped to tags/users; places returns the full-set shape.

## Impact

- Affected code: `src/places/routes.ts` (list handler), `src/pagination.ts` (kept, narrowed usage), `web/src/lib/api.ts` (`listPlaces` signature), `tests/api-v1-contract.test.ts` (places pagination tests rewritten).
- API consumers: M2M bearer clients of `GET /api/v1/places` get full sets instead of pages; `limit`/`cursor` they still send are ignored.
- Payload size: full-set responses grow linearly with place count (see design.md for dataset-scale considerations); tags/users endpoints unchanged.

## Out of scope

- No viewport/bounding-box or zoom-based pin loading; map keeps rendering all filtered pins.
- No virtualized/infinite-scroll list; the list renders and scrolls the full in-memory result set.
- No changes to `GET /api/v1/tags` or `GET /api/v1/users` pagination.
- No server-side cap, export, caching, or performance work beyond returning the full filtered set.
- No URL or routing changes; filters (`owner`, `status`, `tags`, `q`, `price`, `openAt`/`openNow`) behave exactly as today.
