# Spec Delta

## MODIFIED Requirements

### Requirement: Own list with filters
The system SHALL show the user's own places by default with filters for status, place type, tags, free text, and open-now/open-at datetime. The system SHALL also support viewing a specific user via a Users scope picker (`Me (<name>)`, each other user) persisted in the URL (`owner=me|<userId>`), applying the same filters to the selected scope newest first.

#### Scenario: Default is own places
- **WHEN** an authenticated user opens the list
- **THEN** the system shows only their places newest first

#### Scenario: View a specific user
- **WHEN** the user picks Bob in the Users scope picker
- **THEN** the system shows only Bob's places newest first with the same active filters

#### Scenario: Filter by status and tags
- **WHEN** the user sets status `BEEN_TO` and tag `japonais`
- **THEN** the system shows only owned places matching both

#### Scenario: Text search by name
- **WHEN** the user types a name fragment
- **THEN** the system narrows to owned places whose name matches

#### Scenario: Owner persists in URL
- **WHEN** the user picks Bob and reloads or shares the URL
- **THEN** the system restores the Bob-scoped view with filters intact

### Requirement: Inline edit from list
The system SHALL allow editing status, tags, stars, and note from the list entry. Editing SHALL be available only when viewing `Me`; views of another user SHALL be read-only with no edit affordance, while notes, tags, and ratings remain visible.

#### Scenario: Mark visited from list
- **WHEN** the owner flips an entry from `WANT_TO_GO` to `BEEN_TO`
- **THEN** the system persists the change and reflects it immediately

#### Scenario: Read-only for others stays out of scope
- **WHEN** a place owned by someone else appears (future overlay)
- **THEN** the system offers no edit affordance in this change

#### Scenario: Other users read-only
- **WHEN** the user views Bob's list
- **THEN** the system shows no Edit button and no status toggle on any card

## ADDED Requirements

### Requirement: Owner attribution and read-only list chrome
The system SHALL show the viewed scope in the list header, user-aware empty states, and hide the add-place entry whenever the scope is not `Me`.

#### Scenario: No add entry outside Me
- **WHEN** the user views Bob
- **THEN** the system hides the `+ Add a place` entry

#### Scenario: User-aware empty state
- **WHEN** Bob has no places matching the filters
- **THEN** the system states Bob has no places rather than prompting to save a first spot
