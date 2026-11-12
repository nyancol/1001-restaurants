# Places Specification

## Purpose

Stores each user's personal restaurant/bar/cafe memory (status, tags, rating, note) linked to a Google place, with read-all and edit-own sharing.

## Requirements

### Requirement: Place CRUD with ownership
The system SHALL store places with Google link fields, status, placeType, tags, rating, note, snapshotted Google enrichment (hours, businessStatus, priceLevel, priceRange, Google rating and count, website, Maps links), `ownerId`, and `ownerDisplayName` on read, forcing `ownerId` to the authenticated user on create. Listing SHALL support `owner=me|all|<userId>` with `owner=all` returning every user's places.

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

### Requirement: Status toggle replaces Pending/Approved tags
The system SHALL expose `status` as `WANT_TO_GO` or `BEEN_TO`, defaulting to `WANT_TO_GO` on create.

#### Scenario: Default status on create
- **WHEN** a place is created without status
- **THEN** the system stores `WANT_TO_GO`

#### Scenario: Mark as visited
- **WHEN** the owner patches status to `BEEN_TO`
- **THEN** the system persists the new status and updated timestamp

### Requirement: Rating and evolving note
The system SHALL store nullable `rating` (0-5 stars) and a single free-text `note` that the owner edits over time.

#### Scenario: Rate a visited place
- **WHEN** the owner sets a rating between 0 and 5 on an owned place
- **THEN** the system stores the rating

#### Scenario: Note evolves from expectation to memory
- **WHEN** the owner updates the note after visiting
- **THEN** the system replaces the previous text (no history kept)

#### Scenario: Invalid rating rejected
- **WHEN** a rating outside 0-5 is submitted
- **THEN** the system rejects with `400` and stores nothing

### Requirement: PlaceType stored and editable by owner
The system SHALL require `placeType` on create, accept it on patch by the owner, and expose it on every place representation.

#### Scenario: Patch type
- **WHEN** the owner patches `placeType` to `bar`
- **THEN** the system persists the normalized value and updated timestamp

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
The system SHALL infer open or closed from snapshotted hours periods for a given datetime, and list filtering SHALL support `placeType` plus `openAt` (ISO datetime, default now when the open filter is enabled); places with unknown hours SHALL be excluded whenever the open filter is active, and places with `businessStatus` closed (temporary or permanent) SHALL be excluded from open-filtered results.

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
