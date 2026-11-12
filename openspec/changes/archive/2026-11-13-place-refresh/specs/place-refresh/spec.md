# Spec Delta

## Purpose

Lets users and the Hermes ops agent re-fetch one place's Google details on demand so snapshots stay fresh without live revalidation on every read.

## ADDED Requirements

### Requirement: Synchronous per-place refresh
The system SHALL expose `POST /api/places/:id/refresh` that re-fetches Google Place Details server-side using the row's stored `googlePlaceId` and returns the updated place in a single request.

#### Scenario: Refresh own place succeeds
- **WHEN** the owner posts to `/api/places/:id/refresh` for a row with a stored `googlePlaceId`
- **THEN** the system re-fetches Google details, rewrites snapshot columns, bumps `updatedAt`, and returns the updated place

#### Scenario: Refresh without Google id rejected
- **WHEN** a refresh is posted for a manually entered place with no `googlePlaceId`
- **THEN** the system responds `422` and changes nothing

#### Scenario: Refresh without Google configured
- **WHEN** a refresh is posted while no server Google key is configured
- **THEN** the system responds `503` and changes nothing

#### Scenario: Google failure relayed
- **WHEN** Google returns an error or rate limit during refresh
- **THEN** the system relays it as `502` (or `429` for rate limits) and changes nothing

### Requirement: Refresh writes snapshot columns only
The system SHALL limit refresh writes to pure-snapshot columns (`hoursJson`, `businessStatus`, `priceLevel`, `priceRangeJson`, `googleRating`, `googleRatingCount`, `websiteUri`, `mapsLinksJson`, `utcOffsetMinutes`) plus `updatedAt`, never touching identity or user fields.

#### Scenario: User fields preserved on refresh
- **WHEN** a refresh succeeds for a place with a custom `name`, `note`, `rating`, `status`, `tags`, or `placeType`
- **THEN** those fields keep their prior values while snapshot columns take Google's fresh values

#### Scenario: Lookup key never rewritten
- **WHEN** a refresh succeeds
- **THEN** `googlePlaceId` keeps its prior value and is used as the Google query key, not as refreshed data

#### Scenario: Refresh bumps updatedAt
- **WHEN** a refresh succeeds
- **THEN** `updatedAt` is set to now even though no user field changed

### Requirement: Refresh authorization is owner-only for humans and scoped for services
The system SHALL allow refresh for the row owner via session cookie and for any row via a valid M2M Bearer token carrying `refresh:places`; any other cross-owner refresh SHALL be rejected.

#### Scenario: Human refresh of own place allowed
- **WHEN** an authenticated user refreshes a place they own
- **THEN** the system performs the refresh

#### Scenario: Human refresh of another's place rejected
- **WHEN** an authenticated user refreshes a place owned by someone else
- **THEN** the system responds `403` and changes nothing

#### Scenario: M2M refresh of any place allowed with scope
- **WHEN** a request carries a valid M2M Bearer token with `refresh:places` for any owner's place id
- **THEN** the system performs the refresh regardless of owner

#### Scenario: M2M refresh without scope rejected
- **WHEN** a Bearer token without `refresh:places` posts to refresh
- **THEN** the system responds `403` and changes nothing
