# Users Specification

## Purpose

Lets the user pick whose lists and maps to browse by exposing all app users with display names and place counts.

## Requirements

### Requirement: User directory listing
The system SHALL expose an authenticated `GET /api/users` listing all users with `id`, `displayName`, and `placeCount`, sorted by display name with the current user identifiable.

#### Scenario: List users with counts
- **WHEN** an authenticated user requests the user directory
- **THEN** the system returns every user with display name and current place count

#### Scenario: Unauthenticated directory rejected
- **WHEN** an unauthenticated request hits the user directory
- **THEN** the system rejects with `401` and returns nothing

#### Scenario: Counts reflect current places
- **WHEN** a user adds a place and the directory is re-requested
- **THEN** that user's `placeCount` reflects the new total
