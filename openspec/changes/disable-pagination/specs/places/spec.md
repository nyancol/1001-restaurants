# Spec Delta — places

## MODIFIED Requirements

### Requirement: Place CRUD with ownership

The system SHALL store places with Google link fields, status, icon, tags, rating, note, snapshotted Google enrichment (hours, businessStatus, priceLevel, priceRange, Google rating and count, website, Maps links), `ownerId`, and `ownerDisplayName` on read, forcing `ownerId` to the authenticated user on create. Listing SHALL support `owner=me|all|<userId>` with `owner=all` returning every user's places via `GET /api/v1/places` with server-side filtering returning the full filtered set in a single response as `{ data: [...] }` (no `pagination` object) in stable `(updatedAt DESC, id DESC)` order, backed by SQL predicates plus a `place_tags` join table for `tags`. `limit` and `cursor` are not parameters of this endpoint. Owner `DELETE` SHALL permanently remove the owned place.

#### Scenario: Create own place

- **WHEN** an authenticated user posts a valid place payload
- **THEN** the system stores it with `ownerId` set to that user and returns it

#### Scenario: Read any friend's places

- **WHEN** an authenticated user lists places filtered by another owner's id
- **THEN** the system returns those places in read-only form

#### Scenario: Read everyone aggregates all users

- **WHEN** an authenticated user lists places with `owner=all`
- **THEN** the system returns every user's places each carrying `ownerDisplayName`

#### Scenario: Owner attribution on read

- **WHEN** any place is returned from list or single read
- **THEN** the representation includes `ownerDisplayName` alongside `ownerId`

#### Scenario: Edit-own enforcement

- **WHEN** a user patches or deletes a place owned by someone else
- **THEN** the system rejects with `403` and changes nothing

#### Scenario: Default list is own places

- **WHEN** an authenticated user lists places without an owner filter
- **THEN** the system returns only places owned by that user

#### Scenario: Delete own place

- **WHEN** the owner sends `DELETE /api/v1/places/:id` for a place they own
- **THEN** the system permanently deletes that row and returns `{ok:true}`, and subsequent reads no longer return it

#### Scenario: Paginated list envelope

- **WHEN** an authenticated user sends `GET /api/v1/places?owner=me` with more matches than the former page size
- **THEN** the system returns `{ data }` containing every match in `(updatedAt DESC, id DESC)` order with no `pagination` object (pagination fully dropped, not retired)

#### Scenario: Retired params ignored

- **WHEN** a caller sends `GET /api/v1/places?owner=me&limit=5&cursor=<anything>`
- **THEN** the system treats neither param as a contract parameter and returns the full filtered set with `200`

#### Scenario: Tags filter uses join table

- **WHEN** an authenticated user lists with `tags=japonais,cozy` on `GET /api/v1/places`
- **THEN** the system returns only places carrying all requested tags via the `place_tags` join

### Requirement: Open-state inference and filtering

The system SHALL infer open or closed from snapshotted hours periods for a given datetime, and list filtering SHALL support `openAt` (ISO datetime, default now when the open filter is enabled) with no `placeType` parameter; places with unknown hours SHALL be excluded whenever the open filter is active, and places with `businessStatus` closed (temporary or permanent) SHALL be excluded from open-filtered results. The open filter SHALL apply as a post-filter over the full filtered set, so `data` contains exactly the open matches.

#### Scenario: Filter open now

- **WHEN** the user enables the open filter without choosing a datetime
- **THEN** the system returns only owned places whose periods cover the current time

#### Scenario: Filter open at datetime

- **WHEN** the user sets `openAt` to a Tuesday `20:30`
- **THEN** the system returns only owned places whose periods cover that datetime

#### Scenario: Unknown hours hidden when open filter on

- **WHEN** the open filter is active and a place has no hours snapshot
- **THEN** the system excludes that place from results

#### Scenario: Closed statuses excluded from open results

- **WHEN** the open filter is active and a place has `businessStatus` `CLOSED_TEMPORARILY` or `CLOSED_PERMANENTLY`
- **THEN** the system excludes that place even if periods would otherwise match

#### Scenario: Short page documents post-filter

- **WHEN** a `GET /api/v1/places` request carries the open filter
- **THEN** `data` contains exactly the open matches (no pagination, so no short pages or pre-filter totals)
