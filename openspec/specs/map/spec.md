# Map Specification

## Purpose

Shows the user's own filtered places as pins so neighborhoods, not just names, drive recall of bars, cafes, and restaurants.

## Requirements

### Requirement: Map mirrors filtered list as pins
The system SHALL display a Map tab showing tip-anchored drop pins for exactly the places matching the shared filters (`status`, `placeType`, `tags`, `q`, `openAt`, `owner=me|<userId>`), excluding places without coordinates with a visible count. Pin fill plus icon SHALL encode place type from the predefined mapping in all themes, with `CLOSED_PERMANENTLY` pins greyed and `CLOSED_TEMPORARILY` pins in WIP styling; clusters SHALL stay count circles and the basemap SHALL stay unthemed.

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
- **THEN** the system no longer encodes status in pin fill; pins encode type instead and status remains visible only in the card and bottom sheet

#### Scenario: Drop pins encode type
- **WHEN** filtered results include `restaurant`, `bar`, and `café` places
- **THEN** the map shows type-colored drops with type icons at exact coordinates

#### Scenario: Selected pin stays identifiable
- **WHEN** the user taps a pin
- **THEN** the system highlights that drop distinctly from unselected drops without moving the viewport

### Requirement: Pin selection with bottom sheet and edit
The system SHALL open a detail surface on pin tap showing the same fields as a list card with an edit entry that persists via the existing place update. On phone viewports the surface SHALL be a bottom sheet; on desktop viewports it SHALL be a right-docked panel over the map pane. When viewing another user, the surface SHALL be read-only with no edit entry while showing note, tags, and ratings.

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

### Requirement: Sticky Paris viewport with explicit fit
The system SHALL start centered on the user location when geolocation is granted, fall back to Paris otherwise, never auto-move on filter changes, and offer explicit fit-to-results and locate actions.

#### Scenario: Paris default on first open
- **WHEN** the user opens the Map tab and geolocation is denied, times out, or unavailable
- **THEN** the system centers on Paris at city zoom and shows a small inline note

#### Scenario: User-centered on granted location
- **WHEN** the user opens the Map tab and geolocation is granted
- **THEN** the system eases to the user coordinates at neighbourhood zoom without altering pins

#### Scenario: Filter change refreshes pins without moving viewport
- **WHEN** the user changes tags while on the Map tab
- **THEN** the pins update in place and the viewport stays untouched

#### Scenario: Explicit fit only
- **WHEN** the user taps fit-to-results
- **THEN** the system moves the viewport to include all current pins without touching the user dot

### Requirement: User location dot with accuracy halo
The system SHALL render a persistent user-location dot with an accuracy halo in standard blue, unthemed in all themes, drawn beneath pins.

#### Scenario: Dot persists across interactions
- **WHEN** the user pans, filters, clusters, or selects a pin
- **THEN** the dot and halo remain visible and stay beneath pins

#### Scenario: No dot without a position
- **WHEN** geolocation is denied, fails, or not yet resolved
- **THEN** the system shows no dot and never fabricates a position

#### Scenario: Halo reflects reported accuracy
- **WHEN** a position with an accuracy radius is received
- **THEN** the halo radius reflects that accuracy in meters

### Requirement: Explicit locate and recenter
The system SHALL offer an explicit locate action that re-runs one-shot geolocation and eases back to the user at neighbourhood zoom without touching pins.

#### Scenario: Locate recenters on demand
- **WHEN** the user taps the locate action
- **THEN** the system re-requests position and eases to the new coordinates at neighbourhood zoom

#### Scenario: Locate failure stays put with notice
- **WHEN** the user taps locate and geolocation is denied or fails
- **THEN** the viewport stays put and the system shows a small inline note

#### Scenario: No position stored across opens
- **WHEN** the user leaves and reopens the Map tab
- **THEN** the system requests position fresh and never reuses a stored location

### Requirement: Type and open filters on map
The system SHALL offer place-type and open-now/open-at filters in the shared FilterBar on the Map tab, defaulting the open filter to now when enabled and hiding unknown-hours places while active. Filters SHALL apply to the current Users scope (`Me` or a specific user).

#### Scenario: Filter by type
- **WHEN** the user selects type `bar` in the FilterBar
- **THEN** the map shows pins only for owned `bar` places

#### Scenario: Type filter in another user scope
- **WHEN** the user views Bob and selects type `bar`
- **THEN** the map shows pins only for Bob's `bar` places

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

### Requirement: Desktop fit accounts for side panel
The system SHALL bias explicit fit-to-results padding toward the visible map area on desktop so selected pins are not hidden behind the docked detail panel.

#### Scenario: Fit avoids side panel
- **WHEN** the user taps fit-to-results in the desktop split view with the detail panel open
- **THEN** the viewport includes all current pins within the unobscured map area
