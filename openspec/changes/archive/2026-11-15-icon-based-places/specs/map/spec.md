# Spec Delta

## MODIFIED Requirements

### Requirement: Map mirrors filtered list as pins
The system SHALL display a Map tab showing tip-anchored drop pins for exactly the places matching the shared filters (`status`, `tags`, `q`, `openAt`, `owner=me|<userId>`), excluding places without coordinates with a visible count. Pin fill SHALL be a single neutral color in all themes with the place icon glyph on top; `CLOSED_PERMANENTLY` pins greyed and `CLOSED_TEMPORARILY` pins in WIP styling; clusters SHALL stay count circles and the basemap SHALL stay unthemed.

#### Scenario: Pins match list results
- **WHEN** the user sets status and tag filters shared with the list
- **THEN** the map shows pins for the same result set, newest handling unchanged

#### Scenario: Pins follow owner scope
- **WHEN** the user picks Bob in the Users scope picker
- **THEN** the map shows pins for exactly the list's owner-scoped result set

#### Scenario: Filter change refreshes pins without moving viewport
- **WHEN** the user changes tags while on the Map tab
- **THEN** the pins update in place and the viewport stays untouched

#### Scenario: Unlocated places counted
- **WHEN** filtered results include places without coordinates
- **THEN** the map hides them from pins and shows how many are hidden

#### Scenario: Drop pins encode status
- **WHEN** filtered results include both `WANT_TO_GO` and `BEEN_TO` places
- **THEN** the system no longer encodes status in pin fill; pins encode icon instead and status remains visible only in the card and bottom sheet

#### Scenario: Drop pins encode type
- **WHEN** filtered results include places with icons `pizza`, `wine`, and `coffee`
- **THEN** the map shows neutral drops with distinct icon glyphs at exact coordinates (type vocabulary retired; icon carries the encoding)

#### Scenario: Selected pin stays identifiable
- **WHEN** the user taps a pin
- **THEN** the system highlights that drop distinctly from unselected drops without moving the viewport

### Requirement: Type and open filters on map
The system SHALL offer open-now/open-at filters (no place-type filter) in the shared FilterBar on the Map tab, defaulting the open filter to now when enabled and hiding unknown-hours places while active. Filters SHALL apply to the current Users scope (`Me` or a specific user).

#### Scenario: Filter open now on map
- **WHEN** the user enables the open filter without a datetime
- **THEN** the map shows pins only for places inferred open now

#### Scenario: Pick open-at datetime on map
- **WHEN** the user changes the open datetime to a future evening
- **THEN** the pins update in place to places open at that datetime without moving the viewport

#### Scenario: Filter by type
- **WHEN** the user opens the FilterBar on the Map tab
- **THEN** the system shows no type select and category filtering happens only via tags

#### Scenario: Type filter in another user scope
- **WHEN** the user views Bob with a legacy URL containing a type parameter
- **THEN** the system ignores the parameter and shows Bob's unfiltered result set with no error
