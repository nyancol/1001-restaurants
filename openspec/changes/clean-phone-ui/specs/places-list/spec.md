# Spec Delta

## MODIFIED Requirements

### Requirement: Enriched card with dual ratings and status states
The system SHALL show on each list card the place icon alone (no label text), one-line hours summary with open badge, price level plus price range, personal stars side-by-side with Google rating and count, website link, and distinct styling for `CLOSED_PERMANENTLY` (greyed plus badge) and `CLOSED_TEMPORARILY` (WIP styling plus badge). Long names and notes SHALL wrap without breaking layout. The system SHALL NOT render the Google Maps URL in place details.

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

#### Scenario: Icon alone in card
- **WHEN** a place with icon `cocktail` renders in the list
- **THEN** the card shows the icon with no adjacent category word

#### Scenario: Long content wraps
- **WHEN** a place has a very long name or note
- **THEN** the card truncates or wraps the text with no horizontal scroll and no overlap of actions

### Requirement: Owner attribution and read-only list chrome
The system SHALL show the viewed scope in the list header, user-aware empty states, sticky search and List/Map toggle above filters on phone, and hide the add-place entry whenever the scope is not `Me`.

#### Scenario: No add entry outside Me
- **WHEN** the user views Bob
- **THEN** the system hides the `+ Add a place` entry

#### Scenario: User-aware empty state
- **WHEN** Bob has no places matching the filters
- **THEN** the system states Bob has no places rather than prompting to save a first spot

#### Scenario: Phone chrome order
- **WHEN** the user opens the list on a phone
- **THEN** the system shows header, search, Filters button with active count, and List/Map toggle before the result list, with full filters collapsed
