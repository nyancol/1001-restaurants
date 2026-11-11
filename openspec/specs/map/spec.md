# Map Specification

## Purpose

Shows the user's own filtered places as pins so neighborhoods, not just names, drive recall of bars, cafes, and restaurants.

## Requirements

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

### Requirement: Pin selection with bottom sheet and edit
The system SHALL open a bottom sheet on pin tap showing the same fields as a list card with an edit entry that persists via the existing place update.

#### Scenario: Bottom sheet mirrors list card
- **WHEN** the user taps a pin
- **THEN** the system shows name, address, status, tags, stars, and note with an edit button

#### Scenario: Edit from sheet persists
- **WHEN** the owner edits tags, stars, or note from the sheet and saves
- **THEN** the system persists the change and both map and list reflect it on next load

### Requirement: Sticky Paris viewport with explicit fit
The system SHALL start centered on Paris, never auto-move on filter changes, and offer an explicit fit-to-results action.

#### Scenario: Paris default on first open
- **WHEN** the user opens the Map tab with no prior viewport
- **THEN** the system centers on Paris at city zoom

#### Scenario: Explicit fit only
- **WHEN** the user taps fit-to-results
- **THEN** the system moves the viewport to include all current pins
