# Places List Specification

## Purpose

Lets the user find their own places again and update them, filtering by what matters for food and drink recall.

## Requirements

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

### Requirement: Tag filter selects existing tags only
The system SHALL restrict the list/map tag filter to selecting existing tags from suggestions; typing an arbitrary value SHALL NOT add it as a filter via Enter or a create affordance.

#### Scenario: Select existing tag as filter
- **WHEN** the user picks a suggested tag in the "Filter by tags" control
- **THEN** the system adds it to the active tag filter and narrows list and map results to places carrying all selected tags

#### Scenario: Unknown text is not added as filter
- **WHEN** the user types text matching no existing tag in the "Filter by tags" control and presses Enter
- **THEN** the system does not add a new filter chip and leaves the active tag filter unchanged

#### Scenario: Pre-set unknown tag still filters
- **WHEN** the active tag filter already contains a value with no matching places (e.g. from a shared URL)
- **THEN** the system shows the empty result set and keeps the removable filter chip without offering to create that tag
