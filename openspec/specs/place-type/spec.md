# Place-Type Specification

## Purpose

Provides a single fixed place type per place (restaurant, bar, café) with predefined pin colors and icons.

## Requirements

### Requirement: Single required fixed place type
The system SHALL store exactly one `placeType` per place from the fixed set `restaurant`, `bar`, `café`, accepting `cafe` and `coffee` as aliases for `café`, and reject any other value.

#### Scenario: Create with type
- **WHEN** an authenticated user saves a place with type `Café`
- **THEN** the system stores `café` and returns it

#### Scenario: Alias normalized
- **WHEN** a place is saved with type `coffee` or `cafe`
- **THEN** the system stores `café`

#### Scenario: Type required
- **WHEN** a place payload omits `placeType` or sends an empty string
- **THEN** the system rejects with `400` and stores nothing

#### Scenario: Invalid type rejected
- **WHEN** a place payload sends a type outside the fixed set (e.g. `bistro`)
- **THEN** the system rejects with `400` and stores nothing

#### Scenario: Type normalized on write
- **WHEN** a place is saved with type `  BAR  `
- **THEN** the system stores `bar`

#### Scenario: Legacy places default to restaurant
- **WHEN** the migration runs over places with no type or an unknown type
- **THEN** the system sets their type to `restaurant` (`coffee`/`cafe` migrate to `café`)

### Requirement: Fixed type choice inline
The system SHALL offer exactly the three fixed types for selection in capture and edit, with Google `primaryType` mapped onto the fixed set as the suggested default.

#### Scenario: Pick fixed type
- **WHEN** the user opens the type control in capture
- **THEN** the system offers `restaurant`, `bar`, and `café` with no free-text creation

#### Scenario: Suggestions require login
- **WHEN** an unauthenticated caller queries type suggestions
- **THEN** the system responds `401`

### Requirement: Predefined type look
The system SHALL map each fixed type to a predefined pin look: `restaurant` red fork, `bar` purple glass, `café` brown cup.

#### Scenario: Pins use predefined look
- **WHEN** places of each type render as pins or badges
- **THEN** the system uses the predefined color and icon for that type
