# Spec Delta: map

## MODIFIED Requirements

### Requirement: Map mirrors filtered list as pins
The system SHALL display a Map tab showing tip-anchored drop pins for exactly the places matching the shared filters (`status`, `tags`, `q`, `openAt`, `owner=me|<userId>`), excluding places without coordinates with a visible count. Pin fill SHALL be a single neutral color in all themes with the place icon glyph on top; `CLOSED_PERMANENTLY` pins greyed and `CLOSED_TEMPORARILY` pins in WIP styling; clusters SHALL stay count circles and the basemap SHALL stay unthemed. Map pane chrome uses botanical styling: butter canvas, rounded `12px` container, top pills (location + RE-CENTER, Artisan/Transit segmented, +/- zoom).

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

#### Scenario: Re-center keeps pins
- **WHEN** the user clicks RE-CENTER
- **THEN** the viewport fits current filtered pins without clearing selection.

### Requirement: Pin selection with bottom sheet and edit
The system SHALL open a detail surface on pin tap showing the same fields as a list card with an edit entry that persists via the existing place update, presented as botanical preview card (thumbnail, title, `★ rating` pill, area • cuisine • price line, info line when data exists, primary `View Tasting Notes` button that highlights/scrolls the matching feed card). On phone viewports the surface SHALL be a bottom sheet; on desktop viewports it SHALL be a right-docked panel over the map pane (split: docked preview above map footer). When viewing another user, the surface SHALL be read-only with no edit entry while showing note, tags, and ratings.

#### Scenario: Bottom sheet mirrors list card
- **WHEN** the user taps a pin
- **THEN** the system shows name, address, status, tags, stars, and note with an edit button

#### Scenario: Edit from sheet persists
- **WHEN** the owner edits tags, stars, or note from the sheet and saves
- **THEN** the system persists the change and both map and list reflect it on next load

#### Scenario: Other users read-only in sheet
- **WHEN** the user taps Bob's pin while viewing Bob
- **THEN** the system shows the same fields with no edit entry and no status toggle

#### Scenario: Desktop docks detail as side panel
- **WHEN** the user taps a pin in the desktop split view
- **THEN** the system shows the same card and edit entry in a right-docked panel over the map pane instead of a bottom sheet

#### Scenario: View tasting notes
- **WHEN** the user clicks View Tasting Notes in preview
- **THEN** the matching feed card is highlighted and scrolled into view (desktop) or sheet expands (phone).

#### Scenario: Dismiss preview
- **WHEN** the user clicks map empty space or preview close
- **THEN** selection clears and preview hides without moving viewport.
