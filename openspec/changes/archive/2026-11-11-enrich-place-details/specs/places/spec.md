# Spec Delta

## MODIFIED Requirements

### Requirement: Place CRUD with ownership
The system SHALL store places with Google link fields, status, placeType, tags, rating, note, snapshotted Google enrichment (hours, businessStatus, priceLevel, priceRange, Google rating and count, website, Maps links), and `ownerId`, forcing `ownerId` to the authenticated user on create.

#### Scenario: Create own place
- **WHEN** an authenticated user posts a valid place payload
- **THEN** the system stores it with `ownerId` set to that user and returns it

#### Scenario: Read any friend's places
- **WHEN** an authenticated user lists places filtered by another owner's id
- **THEN** the system returns those places in read-only form

#### Scenario: Edit-own enforcement
- **WHEN** a user patches or deletes a place owned by someone else
- **THEN** the system rejects with `403` and changes nothing

#### Scenario: Default list is own places
- **WHEN** an authenticated user lists places without an owner filter
- **THEN** the system returns only places owned by that user

## ADDED Requirements

### Requirement: PlaceType stored and editable by owner
The system SHALL require `placeType` on create, accept it on patch by the owner, and expose it on every place representation.

#### Scenario: Patch type
- **WHEN** the owner patches `placeType` to `bar`
- **THEN** the system persists the normalized value and updated timestamp

### Requirement: Google enrichment snapshot
The system SHALL persist the Google snapshot fields sent at save (`hoursJson` with periods plus weekday descriptions, `businessStatus`, `priceLevel`, `priceRange`, `googleRating`, `googleRatingCount`, `websiteUri`, `mapsLinks`, `googlePlaceId`, `address`, `lat`, `lng`) without live revalidation, and return them on read.

#### Scenario: Snapshot stored at create
- **WHEN** a place is created with hours periods and Google rating `4.3 (1200)`
- **THEN** the system stores them verbatim and returns them on subsequent reads

#### Scenario: Snapshot updated only on explicit save
- **WHEN** a place is read days later
- **THEN** the system returns the stored snapshot unchanged without calling Google

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
