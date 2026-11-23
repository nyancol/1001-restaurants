# Spec Delta

## ADDED Requirements

### Requirement: Venue type description shown after pick

The system SHALL display the Google place-type description in the matched-venue card after the user picks a details result, using already-fetched details fields without persisting them.

#### Scenario: Type display name shown

- **WHEN** the user picks a suggestion whose details include `primaryTypeDisplayName.text` (e.g. "Indian restaurant")
- **THEN** the matched-venue card shows that text as a read-only type row alongside the existing rating/price/hours preview

#### Scenario: Fallback to prettified type code

- **WHEN** details carry no usable display name but carry `primaryType` or `types[]` (e.g. `indian_restaurant`)
- **THEN** the system shows a prettified fallback (`Indian restaurant`), filtering generic `point_of_interest` / `establishment` entries

#### Scenario: No type data hides row

- **WHEN** details carry no display name, no primary type, and no usable types
- **THEN** the system renders no type row and the card layout is otherwise unchanged

#### Scenario: Display-only no snapshot

- **WHEN** the user saves the place
- **THEN** the system persists no new type-description column and sends no additional Google FieldMask fields beyond the current details mask

### Requirement: Star rating input on mobile add

The system SHALL offer the same nullable star-rating input on the mobile add sheet as on desktop, and persist the chosen value at creation without wiping stored ratings on duplicates.

#### Scenario: Rate at creation on mobile

- **WHEN** the user sets 1–5 stars on the mobile add sheet and saves
- **THEN** the system creates the place with that rating (default `null` when untouched, clearable back to `null`)

#### Scenario: Duplicate preserves rating intent

- **WHEN** saving hits an owned duplicate (pre-check confirm or 409) and the mobile draft rating is `null`
- **THEN** the system preserves the stored rating instead of overwriting it with `null`

#### Scenario: Explicit rating wins on duplicate

- **WHEN** saving hits an owned duplicate and the mobile draft carries an explicit 1–5 rating
- **THEN** the system persists the newly chosen rating
