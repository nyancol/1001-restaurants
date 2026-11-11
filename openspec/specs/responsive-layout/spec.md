# Responsive Layout Specification

## Purpose

Lets the web UI adapt between a phone-first tabbed layout and a desktop split workspace so desktop users browse filters, list, and map together without wasted space.

## Requirements

### Requirement: Desktop split view without tabs
The system SHALL render a single split view on desktop viewports (`lg:` and above) with a permanent filter rail, a scrollable list pane, and a sticky map pane sharing one result set; the List/Map tab toggle SHALL be hidden on desktop.

#### Scenario: Desktop shows split
- **WHEN** an authenticated user opens `/` on a desktop viewport
- **THEN** the system shows filter rail, list pane, and map pane together with no tab toggle

#### Scenario: Phone keeps tabs
- **WHEN** the user opens `/` or `/map` on a phone viewport
- **THEN** the system shows the existing tabbed list and full-map views unchanged

#### Scenario: Map route aliases split on desktop
- **WHEN** the user opens `/map` on a desktop viewport
- **THEN** the system renders the same split view with the same filters applied

### Requirement: Shared fetch and selection sync
The system SHALL fetch the filtered places once for the split view and share selection state so card selection highlights the pin and pin selection highlights and scrolls to the card.

#### Scenario: Card selects pin
- **WHEN** the user selects a list card in the split view
- **THEN** the system highlights the matching pin without moving the viewport except for explicit fit

#### Scenario: Pin selects card
- **WHEN** the user taps a pin in the split view
- **THEN** the system highlights the matching list card and scrolls it into view

### Requirement: Full-width desktop shell
The system SHALL widen the app shell and header to full width on desktop viewports instead of the phone `max-w-xl` column.

#### Scenario: Header widens
- **WHEN** the user views any page on a desktop viewport
- **THEN** the header spans the full shell width with branding, result count, theme switcher, and user actions visible
