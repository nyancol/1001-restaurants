# Spec Delta

## Purpose

Lets the user find their own places again and update them, filtering by what matters for food and drink recall.

## ADDED Requirements

### Requirement: Own list with filters
The system SHALL show the user's own places by default with filters for status, tags, and free text.

#### Scenario: Default is own places
- **WHEN** an authenticated user opens the list
- **THEN** the system shows only their places newest first

#### Scenario: Filter by status and tags
- **WHEN** the user sets status `BEEN_TO` and tag `japonais`
- **THEN** the system shows only owned places matching both

#### Scenario: Text search by name
- **WHEN** the user types a name fragment
- **THEN** the system narrows to owned places whose name matches

### Requirement: Inline edit from list
The system SHALL allow editing status, tags, stars, and note from the list entry.

#### Scenario: Mark visited from list
- **WHEN** the owner flips an entry from `WANT_TO_GO` to `BEEN_TO`
- **THEN** the system persists the change and reflects it immediately

#### Scenario: Read-only for others stays out of scope
- **WHEN** a place owned by someone else appears (future overlay)
- **THEN** the system offers no edit affordance in this change
