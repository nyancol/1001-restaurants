# Spec Delta

## MODIFIED Requirements

### Requirement: Refresh writes snapshot columns only
The system SHALL limit refresh writes to pure-snapshot columns (`hoursJson`, `businessStatus`, `priceLevel`, `priceRangeJson`, `googleRating`, `googleRatingCount`, `websiteUri`, `mapsLinksJson`, `utcOffsetMinutes`) plus `updatedAt`, never touching identity or user fields.

#### Scenario: User fields preserved on refresh
- **WHEN** a refresh succeeds for a place with a custom `name`, `note`, `rating`, `status`, `tags`, or `icon`
- **THEN** those fields keep their prior values while snapshot columns take Google's fresh values

#### Scenario: Lookup key never rewritten
- **WHEN** a refresh succeeds
- **THEN** `googlePlaceId` keeps its prior value and is used as the Google query key, not as refreshed data

#### Scenario: Refresh bumps updatedAt
- **WHEN** a refresh succeeds
- **THEN** `updatedAt` is set to now even though no user field changed
