# Spec Delta

## Purpose

Lets a small friends group log in with the existing self-hosted PocketID OIDC provider and be recognized across visits.

## ADDED Requirements

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
