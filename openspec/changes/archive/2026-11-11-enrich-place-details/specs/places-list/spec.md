# Spec Delta

## MODIFIED Requirements

### Requirement: Own list with filters
The system SHALL show the user's own places by default with filters for status, place type, tags, free text, and open-now/open-at datetime.

#### Scenario: Default is own places
- **WHEN** an authenticated user opens the list
- **THEN** the system shows only their places newest first

#### Scenario: Filter by status and tags
- **WHEN** the user sets status `BEEN_TO` and tag `japonais`
- **THEN** the system shows only owned places matching both

#### Scenario: Text search by name
- **WHEN** the user types a name fragment
- **THEN** the system narrows to owned places whose name matches

## ADDED Requirements

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
