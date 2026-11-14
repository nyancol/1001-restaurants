# App Branding Specification

## Purpose

Defines the user-visible product name "In my Belly" so every entry point presents one consistent brand instead of the legacy "Oyster" name.

## Requirements

### Requirement: Application name is In my Belly
The system SHALL display the application name as "In my Belly" in the document title, header brand, login hero, and API docs title, with no user-visible "Oyster" text remaining.

#### Scenario: Document title shows new name
- **WHEN** the user opens any app page
- **THEN** the browser tab title contains "In my Belly" (e.g. "In my Belly — Places")

#### Scenario: Header brand shows new name
- **WHEN** an authenticated user views any page
- **THEN** the header brand link reads "In my Belly" and still navigates home

#### Scenario: Login screen shows new name
- **WHEN** an unauthenticated user opens the app
- **THEN** the login hero heading reads "In my Belly"

#### Scenario: API docs show new name
- **WHEN** a client fetches `/api/openapi.json` or opens the API docs
- **THEN** the info title reads "In my Belly API"

#### Scenario: No visible legacy name
- **WHEN** the UI, document titles, fallback pages, and docs render
- **THEN** no user-visible string reads "Oyster" (technical identifiers such as cookie, storage keys, and package name are exempt)
