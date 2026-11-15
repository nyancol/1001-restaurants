# Spec Delta

## MODIFIED Requirements

### Requirement: Place CRUD with ownership
The system SHALL store places with Google link fields, status, icon, tags, rating, note, snapshotted Google enrichment (hours, businessStatus, priceLevel, priceRange, Google rating and count, website, Maps links), `ownerId`, and `ownerDisplayName` on read, forcing `ownerId` to the authenticated user on create. Listing SHALL support `owner=me|all|<userId>` with `owner=all` returning every user's places. Owner `DELETE` SHALL permanently remove the owned place.

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
- **WHEN** the owner sends `DELETE /api/places/:id` for a place they own
- **THEN** the system permanently deletes that row and returns `{ok:true}`, and subsequent reads no longer return it

### Requirement: PlaceType stored and editable by owner
The system SHALL store `icon` (one of the 12 place-icon values, defaulting to `fork` on create when omitted) on every place, accept it on patch by the owner, and expose it on every place representation. `placeType` is no longer accepted, stored, or returned; payloads sending `placeType` SHALL be rejected with `400` or ignored with `icon` taking precedence per the migration contract, and listing SHALL NOT support `placeType` filtering.

#### Scenario: Patch type
- **WHEN** the owner patches `icon` to `wine`
- **THEN** the system persists the normalized value and updated timestamp

#### Scenario: placeType rejected
- **WHEN** a place payload sends `placeType`
- **THEN** the system rejects with `400` and stores nothing

#### Scenario: placeType filter removed
- **WHEN** the user lists places with `placeType=bar`
- **THEN** the system ignores the parameter and returns the unfiltered owner scope

### Requirement: Google enrichment snapshot
The system SHALL persist the Google snapshot fields sent at save (`hoursJson` with periods plus weekday descriptions, `businessStatus`, `priceLevel`, `priceRange`, `googleRating`, `googleRatingCount`, `websiteUri`, `mapsLinks`, `googlePlaceId`, `address`, `lat`, `lng`) without live revalidation on read, and refresh them only via explicit save or `POST /api/places/:id/refresh`, which rewrites pure-snapshot columns and bumps `updatedAt`.

#### Scenario: Snapshot stored at create
- **WHEN** a place is created with hours periods and Google rating `4.3 (1200)`
- **THEN** the system stores them verbatim and returns them on subsequent reads

#### Scenario: Snapshot updated only on explicit save
- **WHEN** a place is read days later
- **THEN** the system returns the stored snapshot unchanged without calling Google

#### Scenario: Snapshot refreshed via refresh endpoint
- **WHEN** `POST /api/places/:id/refresh` succeeds for a row with a stored `googlePlaceId`
- **THEN** the system replaces pure-snapshot columns with fresh Google values, bumps `updatedAt`, and leaves user fields unchanged

#### Scenario: Refresh without Google id rejected
- **WHEN** refresh is posted for a place with no stored `googlePlaceId`
- **THEN** the system responds `422` and changes nothing

### Requirement: Open-state inference and filtering
The system SHALL infer open or closed from snapshotted hours periods for a given datetime, and list filtering SHALL support `openAt` (ISO datetime, default now when the open filter is enabled) with no `placeType` parameter; places with unknown hours SHALL be excluded whenever the open filter is active, and places with `businessStatus` closed (temporary or permanent) SHALL be excluded from open-filtered results.

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
