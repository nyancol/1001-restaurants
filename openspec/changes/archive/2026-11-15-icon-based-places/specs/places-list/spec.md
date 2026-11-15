# Spec Delta

## MODIFIED Requirements

### Requirement: Own list with filters
The system SHALL show the user's own places by default with filters for status, tags, free text, and open-now/open-at datetime (no place-type filter). The system SHALL also support viewing a specific user via a Users scope picker (`Me (<name>)`, each other user) persisted in the URL (`owner=me|<userId>`), applying the same filters to the selected scope newest first.

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

#### Scenario: Legacy placeType URLs ignored
- **WHEN** the user opens a list URL containing `placeType=bar`
- **THEN** the system ignores the parameter and shows the unfiltered scope with no error

### Requirement: Enriched card with dual ratings and status states
The system SHALL show on each list card the place icon alone (no label text), hours summary with open badge, price level plus price range, personal stars side-by-side with Google rating and count, website link, and distinct styling for `CLOSED_PERMANENTLY` (greyed plus badge) and `CLOSED_TEMPORARILY` (WIP styling plus badge). The system SHALL NOT render the Google Maps URL in place details.

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
