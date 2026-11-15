# Place-Icon Specification

## Purpose

Lets users recognize places at a glance with a small inferred-then-overridable icon instead of a required type taxonomy.

## Requirements

### Requirement: Fixed 12-icon vocabulary

The system SHALL support exactly 12 icons: `fork`, `burger`, `pizza`, `soup`, `hotdog`, `bagel`, `croissant`, `ice-cream`, `cocktail`, `wine`, `beer`, `coffee`, and reject any other value.

#### Scenario: Unknown icon rejected
- **WHEN** a place payload sends `icon` `sushi`
- **THEN** the system rejects with `400` and stores nothing

#### Scenario: Icon normalized on write
- **WHEN** a place is saved with `icon` `  Pizza  `
- **THEN** the system stores `pizza`

### Requirement: PrimaryType-only frozen inference

The system SHALL infer the icon once at Google-pick time from an exact `primaryType` lookup only, defaulting to `fork` on miss, null, or manual places, and SHALL never re-infer afterwards from tags, names, or refresh.

#### Scenario: Known primaryType inferred
- **WHEN** details return `primaryType` `pizza_restaurant`
- **THEN** the system preselects `pizza` in the icon picker

#### Scenario: Unknown primaryType defaults to fork
- **WHEN** details return `primaryType` `sushi_restaurant` or null
- **THEN** the system preselects `fork`

#### Scenario: Tags do not change icon
- **WHEN** the owner later adds tag `pizza` to a `fork` place
- **THEN** the system keeps `fork` until the owner changes the picker

#### Scenario: Refresh does not change icon
- **WHEN** `POST /api/places/:id/refresh` succeeds
- **THEN** the system keeps the prior `icon` value

### Requirement: Icon picker preselected and never blocking

The system SHALL offer all 12 icons in capture and edit, preselected from inference (`fork` for manual), and SHALL never block save for icon reasons.

#### Scenario: Override inferred icon
- **WHEN** the user picks a place inferred as `pizza` and selects `wine` before saving
- **THEN** the system stores `wine`

#### Scenario: Save with default
- **WHEN** the user saves a manual place without touching the picker
- **THEN** the system stores `fork`

### Requirement: Icon look on neutral pin and alone in card

The system SHALL render one neutral pin fill with the icon glyph on top on the map, and the icon alone with no label text in list cards, sheets, and panels, exposing localized names only as aria-label/tooltip and picker search.

#### Scenario: Pin shows icon on neutral fill
- **WHEN** places with icons `pizza`, `beer`, `coffee` render as pins
- **THEN** the system uses the same neutral fill with distinct icon glyphs

#### Scenario: Card shows icon alone
- **WHEN** a place with icon `cocktail` renders in the list
- **THEN** the card shows the icon with no adjacent category word

#### Scenario: Closed styling preserved
- **WHEN** a place has `businessStatus` `CLOSED_PERMANENTLY`
- **THEN** the system greys the neutral pin plus badge, distinct from `CLOSED_TEMPORARILY` WIP styling

### Requirement: Legacy type migration without tag backfill

The system SHALL migrate existing `placeType` values `restaurant→fork`, `café→coffee` (including `cafe`/`coffee` aliases), `bakery→croissant`, `bar→cocktail`, and SHALL NOT create tags from old types.

#### Scenario: Bar becomes cocktail
- **WHEN** the migration runs over a place with type `bar`
- **THEN** the system sets its icon to `cocktail` and adds no tags
