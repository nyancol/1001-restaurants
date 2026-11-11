# Spec Delta

## MODIFIED Requirements

### Requirement: Pin selection with bottom sheet and edit
The system SHALL open a detail surface on pin tap showing the same fields as a list card with an edit entry that persists via the existing place update. On phone viewports the surface SHALL be a bottom sheet; on desktop viewports it SHALL be a right-docked panel over the map pane.

#### Scenario: Bottom sheet mirrors list card
- **WHEN** the user taps a pin
- **THEN** the system shows name, address, status, tags, stars, and note with an edit button

#### Scenario: Edit from sheet persists
- **WHEN** the owner edits tags, stars, or note from the sheet and saves
- **THEN** the system persists the change and both map and list reflect it on next load

#### Scenario: Desktop docks detail as side panel
- **WHEN** the user taps a pin in the desktop split view
- **THEN** the system shows the same card and edit entry in a right-docked panel over the map pane instead of a bottom sheet

## ADDED Requirements

### Requirement: Desktop fit accounts for side panel
The system SHALL bias explicit fit-to-results padding toward the visible map area on desktop so selected pins are not hidden behind the docked detail panel.

#### Scenario: Fit avoids side panel
- **WHEN** the user taps fit-to-results in the desktop split view with the detail panel open
- **THEN** the viewport includes all current pins within the unobscured map area
