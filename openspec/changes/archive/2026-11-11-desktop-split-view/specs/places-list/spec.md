# Spec Delta

## ADDED Requirements

### Requirement: List participates in desktop split
The system SHALL render the own-places list as the center pane of the desktop split view, sharing the split's single fetch and selection state so list results always equal map pins for the same filters.

#### Scenario: Split list matches pins
- **WHEN** the user sets status and tag filters in the desktop split view
- **THEN** the list pane shows exactly the result set pinned on the map pane

#### Scenario: Single fetch for both panes
- **WHEN** filters change in the desktop split view
- **THEN** the system issues one places query whose results feed both list and map panes

### Requirement: Desktop list grid density
The system SHALL use desktop-appropriate density in the split list pane so cards remain scannable at wide viewports.

#### Scenario: Cards remain scannable
- **WHEN** the user views the list pane on a desktop viewport
- **THEN** cards use compact touch targets and summary rows that fit the pane width without horizontal scrolling
