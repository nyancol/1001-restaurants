# Spec Delta

## ADDED Requirements

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
