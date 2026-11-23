# Proposal

## Why

`GET /api/v1/places` caps results at a server-side default of 20 (`DEFAULT_LIMIT`), but the web client never sends `limit`/`cursor` (`web/src/lib/api.ts:listPlaces`, `web/src/lib/usePlaces.ts`). The map therefore renders at most 20 pins and the list shows at most 20 cards, silently hiding the rest. Per the owner's directive on #44, viewport/zoom-driven pin loading is overkill for this dataset: pagination on places should be disabled so one request returns every match.

## What Changes

- **BREAKING** `GET /api/v1/places` returns the full filtered result set in a single response as `{ data: [...] }`: no page slicing and no `pagination` object at all (per owner directive: the app is not live yet, so pagination is fully dropped rather than shimmed).
- **BREAKING** `limit` and `cursor` query params on `GET /api/v1/places` are removed from the route schema/OpenAPI and from the contract; no accept-and-ignore layer and no `400` special-casing — unknown query params are simply ignored by the framework.
- `web/src/lib/api.ts` `listPlaces` drops `limit`/`cursor` params; `usePlaces` keeps its single-fetch shape and now receives all matches for both list and map panes.
- `src/pagination.ts` is untouched: `parseLimit`, cursor/offset codecs, `envelope`, and `DEFAULT_LIMIT`/`MAX_LIMIT` remain the shared implementation for `GET /api/v1/tags` and `GET /api/v1/users`; the places handler just stops importing them.
- Tests updated: places contract tests assert the full-set `{ data }` response instead of cursor walking; tags/users pagination tests unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `places`: list returns the complete filtered set in one response as `{ data }` with no `pagination` object; `limit`/`cursor` are no longer parameters of this endpoint.
- `places-list`: list scrolls all matching places; cursor-walk and short-page scenarios removed.
- `map`: map pins cover the full filtered result set from the shared single fetch.
- `api-contract`: paginated-envelope requirement scoped to tags/users; places returns the full-set shape.

## Impact

- Affected code: `src/places/routes.ts` (list handler: slice and COUNT query dropped, `pagination.*` imports removed), `web/src/lib/api.ts` (`listPlaces` signature), `tests/api-v1-contract.test.ts` (places pagination tests rewritten). `src/pagination.ts` unchanged.
- API consumers: none to migrate — the app is pre-live. `GET /api/v1/places` responses lose the `pagination` object; the only existing consumer (web client) reads `body.data` only.
- Payload size: full-set responses grow linearly with place count (see design.md for dataset-scale considerations); tags/users endpoints unchanged.

## Out of scope

- No viewport/bounding-box or zoom-based pin loading; map keeps rendering all filtered pins.
- No virtualized/infinite-scroll list; the list renders and scrolls the full in-memory result set.
- No changes to `GET /api/v1/tags` or `GET /api/v1/users` pagination.
- No server-side cap, export, caching, or performance work beyond returning the full filtered set.
- No URL or routing changes; filters (`owner`, `status`, `tags`, `q`, `price`, `openAt`/`openNow`) behave exactly as today.
