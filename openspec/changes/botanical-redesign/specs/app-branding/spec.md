# Spec Delta: app-branding

## MODIFIED Requirements

### Requirement: Application name is In my Belly
The system SHALL display the application name as "In my Belly" in the document title, header brand, login hero, and API docs title, with no user-visible "Oyster" text remaining. Header brand: “In my Belly” (Literata) + “Personal dining journal & shared taste” subtitle, cloche logo mark, `+ New Memory` forest pill CTA to `/add`, notification bell with dot, user chip (avatar + name + entries). Footer: butter band with “In my Belly — A mindful compendium of memorable tables and culinary wanderlust.” plus links Neighborhood Guides / Tasting Notes Index / Cellar & Wine Logs and © year line, non-fixed after content.

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

#### Scenario: New Memory entry
- **WHEN** the user clicks + New Memory
- **THEN** the system navigates to `/add` preserving current owner scope.

#### Scenario: Footer never blocks content
- **WHEN** feed or map scrolls long
- **THEN** footer stays after content (not fixed) and remains reachable on desktop and phone.
