# Spec Delta

## MODIFIED Requirements

### Requirement: Map mirrors filtered list as pins
The system SHALL display a Map tab showing tip-anchored drop pins for exactly the places matching the shared filters (`status`, `placeType`, `tags`, `q`, `openAt`, `owner=me`), excluding places without coordinates with a visible count. Pin fill plus icon SHALL encode place type from the predefined mapping in all themes, with `CLOSED_PERMANENTLY` pins greyed and `CLOSED_TEMPORARILY` pins in WIP styling; clusters SHALL stay count circles and the basemap SHALL stay unthemed.

#### Scenario: Pins match list results
- **WHEN** the user sets status and tag filters shared with the list
- **THEN** the map shows pins for the same result set, newest handling unchanged

#### Scenario: Filter change refreshes pins without moving viewport
- **WHEN** the user changes tags while on the Map tab
- **THEN** the pins update in place and the viewport stays untouched

#### Scenario: Unlocated places counted
- **WHEN** filtered results include places without coordinates
- **THEN** the map hides them from pins and shows how many are hidden

#### Scenario: Drop pins encode status
- **WHEN** filtered results include both `WANT_TO_GO` and `BEEN_TO` places
- **THEN** the system no longer encodes status in pin fill; pins encode type instead and status remains visible only in the card and bottom sheet

#### Scenario: Drop pins encode type
- **WHEN** filtered results include `restaurant`, `bar`, and `café` places
- **THEN** the map shows type-colored drops with type icons at exact coordinates

#### Scenario: Selected pin stays identifiable
- **WHEN** the user taps a pin
- **THEN** the system highlights that drop distinctly from unselected drops without moving the viewport

### Requirement: Pin selection with bottom sheet and edit
The system SHALL open a bottom sheet on pin tap showing the same fields as a list card with an edit entry that persists via the existing place update.

#### Scenario: Bottom sheet mirrors list card
- **WHEN** the user taps a pin
- **THEN** the system shows name, address, status, tags, stars, and note with an edit button

#### Scenario: Edit from sheet persists
- **WHEN** the owner edits tags, stars, or note from the sheet and saves
- **THEN** the system persists the change and both map and list reflect it on next load

## ADDED Requirements

### Requirement: Type and open filters on map
The system SHALL offer place-type and open-now/open-at filters in the shared FilterBar on the Map tab, defaulting the open filter to now when enabled and hiding unknown-hours places while active.

#### Scenario: Filter by type
- **WHEN** the user selects type `bar` in the FilterBar
- **THEN** the map shows pins only for owned `bar` places

#### Scenario: Filter open now on map
- **WHEN** the user enables the open filter without a datetime
- **THEN** the map shows pins only for places inferred open now

#### Scenario: Pick open-at datetime on map
- **WHEN** the user changes the open datetime to a future evening
- **THEN** the pins update in place to places open at that datetime without moving the viewport

### Requirement: Business-status styling on map
The system SHALL render `CLOSED_PERMANENTLY` places greyed with a closed badge and `CLOSED_TEMPORARILY` places with WIP styling plus badge in pin sheets, and exclude both from open-filtered pin sets.

#### Scenario: Closed permanently greyed
- **WHEN** a filtered place has `businessStatus` `CLOSED_PERMANENTLY`
- **THEN** the system shows it greyed with a closed badge

#### Scenario: Closed temporarily WIP
- **WHEN** a filtered place has `businessStatus` `CLOSED_TEMPORARILY`
- **THEN** the system shows it with WIP styling distinct from greyed plus a badge
