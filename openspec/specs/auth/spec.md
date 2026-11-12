# Auth Specification

## Purpose

Lets a small friends group log in with the existing self-hosted PocketID OIDC provider and be recognized across visits.

## Requirements

### Requirement: OIDC login via PocketID
The system SHALL authenticate users via OIDC code flow against the configured PocketID issuer and create a local user on first login keyed by OIDC `sub`.

#### Scenario: First login creates user
- **WHEN** a new user completes PocketID login with a valid ID token
- **THEN** the system creates a user bound to the token `sub` and establishes a session

#### Scenario: Returning login restores identity
- **WHEN** an existing user completes PocketID login
- **THEN** the system resolves the same user by `sub` and establishes a session

#### Scenario: Unauthenticated API access rejected
- **WHEN** a request without a valid session hits `/api/*`
- **THEN** the system responds `401` without leaking data

### Requirement: Logout ends session
The system SHALL terminate the local session on logout.

#### Scenario: Logout clears session
- **WHEN** an authenticated user calls logout
- **THEN** the system clears the session so further API calls return `401`

### Requirement: M2M Bearer for Places API
The system SHALL accept Pocket ID M2M Bearer tokens (client-credentials grant) as an alternative credential on `/api/places` routes only, enforcing JWT signature via JWKS, `iss`, `aud` containing the Places API resource, expiry, and the permission required for the action.

#### Scenario: Bearer with read scope lists all places
- **WHEN** a request to `GET /api/places?owner=all` carries a valid M2M token with `read:places`
- **THEN** the system returns every user's places without requiring a session cookie

#### Scenario: Bearer without required permission rejected
- **WHEN** a Bearer token lacking the required permission calls a Places endpoint
- **THEN** the system responds `403` without leaking data

#### Scenario: Invalid or wrong-audience Bearer rejected
- **WHEN** a request carries an expired, badly signed, or wrong-audience Bearer token
- **THEN** the system responds `401` without leaking data

#### Scenario: Bearer ignored outside Places API
- **WHEN** a request with a valid Places M2M token hits a non-Places `/api/*` route
- **THEN** the system still requires the session cookie and responds `401` without one
