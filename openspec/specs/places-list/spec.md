# Places List Specification

## Purpose

Lets the user find their own places again and update them, filtering by what matters for food and drink recall.

## Requirements

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

### Requirement: Enriched card with dual ratings and status states
The system SHALL show on each list card the place-type badge, hours summary with open badge, price level plus price range, personal stars side-by-side with Google rating and count, website link, and distinct styling for `CLOSED_PERMANENTLY` (greyed plus badge) and `CLOSED_TEMPORARILY` (WIP styling plus badge). The system SHALL NOT render the Google Maps URL in place details.

#### Scenario: Dual ratings visible
- **WHEN** a place has personal rating `5` and Google rating `4.3 (1200)`
- **THEN** the card shows both values side by side

#### Scenario: Share button copies Google Maps link
- **WHEN** the user opens the share control and selects `google maps link`
- **THEN** the system copies the snapshotted Google Maps URL to the clipboard and confirms without navigating away

#### Scenario: No Maps URL in details
- **WHEN** a place with a snapshotted Maps URL is displayed
- **THEN** the details show no Maps URL text or link outside the share control

#### Scenario: Closed permanently greyed
- **WHEN** a place has `businessStatus` `CLOSED_PERMANENTLY`
- **THEN** the card renders greyed with a closed badge

#### Scenario: Closed temporarily WIP
- **WHEN** a place has `businessStatus` `CLOSED_TEMPORARILY`
- **THEN** the card renders with WIP styling distinct from greyed plus a badge

#### Scenario: Open filter hides unknown hours
- **WHEN** the open filter is active
- **THEN** the list excludes owned places without an hours snapshot

### Requirement: List participates in desktop split
The system SHALL render the own-places list as the center pane of the desktop split view, sharing the split's single fetch and selection state so list results always equal map pins for the same filters.

#### Scenario: Split list matches pins
- **WHEN** the user sets status and tag filters in the desktop split view
- **THEN** the list pane shows exactly the result set pinned on the map pane

#### Scenario: Single fetch for both panes
- **WHEN** filters change in the desktop split view
- **THEN** the system issues one places query whose results feed both list and map panes

### Requirement: Desktop list grid density
The system SHALL use desktop-appropriate density in the split list pane so cards remain scannable at wide viewports.

#### Scenario: Cards remain scannable
- **WHEN** the user views the list pane on a desktop viewport
- **THEN** cards use compact touch targets and summary rows that fit the pane width without horizontal scrolling

### Requirement: Owner attribution and read-only list chrome
The system SHALL show the viewed scope in the list header, user-aware empty states, and hide the add-place entry whenever the scope is not `Me`.

#### Scenario: No add entry outside Me
- **WHEN** the user views Bob
- **THEN** the system hides the `+ Add a place` entry

#### Scenario: User-aware empty state
- **WHEN** Bob has no places matching the filters
- **THEN** the system states Bob has no places rather than prompting to save a first spot
