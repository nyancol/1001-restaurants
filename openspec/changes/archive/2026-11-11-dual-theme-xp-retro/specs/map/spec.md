# Spec Delta

## MODIFIED Requirements

### Requirement: Map mirrors filtered list as pins
The system SHALL display a Map tab showing tip-anchored drop pins for exactly the places matching the shared filters (`status`, `tags`, `q`, `owner=me`), excluding places without coordinates with a visible count. Pin fill SHALL stay semantic by status (`WANT_TO_GO` amber, `BEEN_TO` green) in all themes; clusters SHALL stay count circles and the basemap SHALL stay unthemed.

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
- **THEN** the map shows amber drops for want-to-go and green drops for been-to with tips at exact coordinates

#### Scenario: Selected pin stays identifiable
- **WHEN** the user taps a pin
- **THEN** the system highlights that drop distinctly from unselected drops without moving the viewport
