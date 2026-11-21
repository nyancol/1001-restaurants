# Spec Delta

## MODIFIED Requirements

### Requirement: Desktop split view without tabs
The system SHALL render a single split view on desktop viewports (`lg:` and above) with a permanent filter rail, a scrollable list pane, and a sticky map pane sharing one result set; the List/Map tab toggle SHALL be hidden on desktop.

#### Scenario: Desktop shows split
- **WHEN** an authenticated user opens `/` on a desktop viewport
- **THEN** the system shows filter rail, list pane, and map pane together with no tab toggle

#### Scenario: Phone keeps tabs
- **WHEN** the user opens `/` or `/map` on a phone viewport
- **THEN** the system shows the tabbed list and full-map views with sticky search, Filters control, and List/Map toggle above the fold and full filters in a collapsed sheet

#### Scenario: Map route aliases split on desktop
- **WHEN** the user opens `/map` on a desktop viewport
- **THEN** the system renders the same split view with the same filters applied

### Requirement: Full-width desktop shell
The system SHALL widen the app shell and header to full width on desktop viewports instead of the phone `max-w-xl` column.

#### Scenario: Header widens
- **WHEN** the user views any page on a desktop viewport
- **THEN** the header spans the full shell width with branding, result count, mode switcher, and user actions visible

## ADDED Requirements

### Requirement: Phone sticky filter bar
The system SHALL keep search, active-filter count, and List/Map toggle sticky on phone with remaining filters collapsed.

#### Scenario: Results above fold
- **WHEN** the user opens `/` on a phone with no filters
- **THEN** the system shows search, Filters button, toggle, and first results without scrolling past full filter controls

#### Scenario: Filters in sheet
- **WHEN** the user taps Filters on phone
- **THEN** the system expands status, open-now/at, tags, and owner scope in a sheet while URL sync and result counts keep working

#### Scenario: Toggle stays reachable
- **WHEN** the user scrolls the phone list
- **THEN** the List/Map toggle remains reachable without scrolling back through filters
