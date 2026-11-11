# Spec Delta

## MODIFIED Requirements

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
