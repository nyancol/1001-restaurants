# Spec Delta — map

## MODIFIED Requirements

### Requirement: Map mirrors filtered list as pins

The system SHALL display a Map tab showing tip-anchored drop pins for exactly the places matching the shared filters (`status`, `tags`, `q`, `openAt`, `owner=me|<userId>`), excluding places without coordinates with a visible count. The pins SHALL cover the full filtered result set from the shared single fetch (no paging, no viewport-based loading). Pin fill SHALL be a single neutral color with the place icon glyph on top; `CLOSED_PERMANENTLY` pins greyed and `CLOSED_TEMPORARILY` pins in WIP styling; clusters SHALL stay count circles and the basemap SHALL stay unthemed.

#### Scenario: Pins match list results

- **WHEN** the user sets status and tag filters shared with the list
- **THEN** the map shows pins for the same result set, newest handling unchanged

#### Scenario: Pins follow owner scope

- **WHEN** the user picks Bob in the Users scope picker
- **THEN** the map shows pins for exactly the list's owner-scoped result set

#### Scenario: Full set pinned without paging

- **WHEN** the filtered result set exceeds the former page size
- **THEN** the map pins every matching place from the single shared fetch

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
