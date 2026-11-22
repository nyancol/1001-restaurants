# API Contract Specification

## Purpose

Defines the stable versioned HTTP contract all consumers rely on: URL versioning, paginated envelopes, and single-sourced API version metadata.

## Requirements

### Requirement: Versioned API base path
The system SHALL expose all JSON API routes under `/api/v1/*` and SHALL NOT serve unversioned `/api/*` JSON routes, except `/api/health` which stays unversioned as an infra probe.

#### Scenario: Versioned places route serves
- **WHEN** an authenticated user sends `GET /api/v1/places?owner=me`
- **THEN** the system returns the paginated place list with `200`

#### Scenario: Unversioned JSON route removed
- **WHEN** any caller sends `GET /api/places?owner=me`
- **THEN** the system responds `404` with `{ error: "not_found" }`

#### Scenario: Health stays unversioned
- **WHEN** any caller sends `GET /api/health`
- **THEN** the system responds `200` with `{ status, db, time }`

### Requirement: Paginated envelope with cursor
The system SHALL return list endpoints as `{ data, pagination: { limit, nextCursor, total } }` where `nextCursor` is an opaque cursor or `null` when the page is last, `limit` echoes the effective page size, and `total` is the exact server-side match count before post-filtering.

#### Scenario: First page returns cursor
- **WHEN** a caller sends `GET /api/v1/places?owner=me&limit=20` with more than 20 matches
- **THEN** the system returns at most 20 items in `data` plus `pagination.nextCursor` set and `pagination.total` equal to the match count

#### Scenario: Cursor walks newest-first
- **WHEN** a caller sends the returned `cursor` as `GET /api/v1/places?owner=me&limit=20&cursor=<opaque>`
- **THEN** the system returns the next slice in stable `(updatedAt DESC, id DESC)` order with no duplicates or skips

#### Scenario: Invalid cursor rejected
- **WHEN** a caller sends a malformed `cursor`
- **THEN** the system responds `400` and changes nothing

#### Scenario: Limit bounds enforced
- **WHEN** a caller sends `limit` above the max or below 1
- **THEN** the system clamps to the allowed range and echoes the effective `limit`

### Requirement: Single-sourced OpenAPI version
The system SHALL set OpenAPI `info.version` from `package.json` at boot and SHALL expose the contract generation at `GET /api/v1/openapi.json`.

#### Scenario: OpenAPI version tracks package
- **WHEN** any caller fetches `GET /api/v1/openapi.json`
- **THEN** `info.version` equals the running `package.json` version

### Requirement: Additive-only evolution inside v1
The system SHALL evolve `v1` additively only; breaking changes SHALL require a new `/api/v2` prefix with the old version retained per its Sunset policy.

#### Scenario: Additive field accepted
- **WHEN** `v1` adds a new optional response field or query param
- **THEN** existing `v1` consumers continue to work without changes
