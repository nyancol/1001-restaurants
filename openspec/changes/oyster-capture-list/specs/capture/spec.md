# Spec Delta

## Purpose

Lets the user file a known bar, cafe, or restaurant in seconds from its name, enriching the Google result with personal meaning.

## ADDED Requirements

### Requirement: Lookup then prefilled capture
The system SHALL offer Google-based name lookup and prefill a capture form with the chosen place's name, address, and coordinates.

#### Scenario: Pick from autocomplete
- **WHEN** the user types a name and picks a suggestion
- **THEN** the system prefills name, address, coordinates, and Google place id

#### Scenario: Lookup requires login
- **WHEN** an unauthenticated caller hits the lookup proxy
- **THEN** the system responds `401`

### Requirement: Save with status tags rating note
The system SHALL save the capture with status toggle, flat tags, nullable stars, and single note in one action.

#### Scenario: Save want-to-go
- **WHEN** the user saves with status `WANT_TO_GO`, tags, and a note
- **THEN** the system creates the place owned by that user and shows it in the list

#### Scenario: Duplicate Google place updates
- **WHEN** the user saves a Google place id they already own
- **THEN** the system updates the existing place rather than creating a duplicate

### Requirement: Tag suggest and create inline
The system SHALL suggest existing global tags as the user types and allow creating a new tag in one tap.

#### Scenario: Reuse suggested tag
- **WHEN** the user types a prefix and picks a suggested tag
- **THEN** the system attaches the normalized tag to the draft

#### Scenario: Create new tag
- **WHEN** the user confirms a prefix with no exact match
- **THEN** the system attaches it as a new normalized tag
