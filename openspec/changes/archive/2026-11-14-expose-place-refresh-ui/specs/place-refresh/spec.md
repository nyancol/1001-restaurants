# Spec Delta

## ADDED Requirements

### Requirement: Per-place refresh action in UI
The system SHALL offer an explicit per-place refresh action on owned places that invokes `POST /api/places/:id/refresh` and replaces the displayed place with the server-returned updated place.

#### Scenario: Owner refreshes own place from card
- **WHEN** the owner triggers refresh on a card for a place with a stored `googlePlaceId`
- **THEN** the system calls `POST /api/places/:id/refresh`, shows a loading state, and swaps the card to the returned place on success

#### Scenario: Refresh control hidden for other owners
- **WHEN** the viewer looks at a place they do not own (read-only card / non-`Me` scope)
- **THEN** the system shows no refresh affordance

#### Scenario: Manual place without Google id cannot refresh
- **WHEN** the owner triggers refresh on a place with no `googlePlaceId`
- **THEN** the system does not call Google and surfaces that refresh is unavailable (disabled control or `422` message) without changing stored data

#### Scenario: Refresh failure preserves data and reports cause
- **WHEN** refresh fails (`403`, `422`, `503`, `502`, `429`, or network error)
- **THEN** the system keeps the existing card data, clears the loading state, and shows a human-readable error (e.g. unavailable, rate-limited, try again)

#### Scenario: Concurrent refresh guarded per card
- **WHEN** a refresh is already in flight for a place
- **THEN** the system disables repeat triggers until the request settles
