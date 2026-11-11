# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
