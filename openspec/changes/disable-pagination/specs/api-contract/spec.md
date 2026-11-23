# Spec Delta — api-contract

## MODIFIED Requirements

### Requirement: Paginated envelope with cursor

The system SHALL return the tags and users list endpoints as `{ data, pagination: { limit, nextCursor, total } }` where `nextCursor` is an opaque cursor or `null` when the page is last, `limit` echoes the effective page size, and `total` is the exact server-side match count before post-filtering. `GET /api/v1/places` is excluded from pagination: it returns the full filtered set in one response as `{ data: [...] }` with no `pagination` object, and `limit`/`cursor` are not parameters of this endpoint.

#### Scenario: First page returns cursor

- **WHEN** a caller sends `GET /api/v1/tags?q=a&limit=20` with more than 20 matches
- **THEN** the system returns at most 20 items in `data` plus `pagination.nextCursor` set and `pagination.total` equal to the match count

#### Scenario: Cursor walks newest-first

- **WHEN** a caller sends the returned `cursor` as `GET /api/v1/tags?q=a&limit=20&cursor=<opaque>`
- **THEN** the system returns the next slice with no duplicates or skips

#### Scenario: Invalid cursor rejected

- **WHEN** a caller sends a malformed `cursor` to `GET /api/v1/tags` or `GET /api/v1/users`
- **THEN** the system responds `400` and changes nothing

#### Scenario: Limit bounds enforced

- **WHEN** a caller sends `limit` above the max or below 1 to a paginated endpoint
- **THEN** the system clamps to the allowed range and echoes the effective `limit`

#### Scenario: Places returns full set

- **WHEN** a caller sends `GET /api/v1/places?owner=me` with any number of matches, optionally with stray `limit`/`cursor`
- **THEN** the system returns every match in `data` with no `pagination` object and `200`; the paging params are not contract parameters of this endpoint
