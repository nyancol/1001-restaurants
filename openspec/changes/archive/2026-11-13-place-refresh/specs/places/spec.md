# Spec Delta

## MODIFIED Requirements

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
