# Spec Delta

## Purpose

Stores each user's personal restaurant/bar/cafe memory (status, tags, rating, note) linked to a Google place, with read-all and edit-own sharing.

## ADDED Requirements

### Requirement: Place CRUD with ownership
The system SHALL store places with Google link fields, status, tags, rating, note, and `ownerId`, forcing `ownerId` to the authenticated user on create.

#### Scenario: Create own place
- **WHEN** an authenticated user posts a valid place payload
- **THEN** the system stores it with `ownerId` set to that user and returns it

#### Scenario: Read any friend's places
- **WHEN** an authenticated user lists places filtered by another owner's id
- **THEN** the system returns those places in read-only form

#### Scenario: Edit-own enforcement
- **WHEN** a user patches or deletes a place owned by someone else
- **THEN** the system rejects with `403` and changes nothing

#### Scenario: Default list is own places
- **WHEN** an authenticated user lists places without an owner filter
- **THEN** the system returns only places owned by that user

### Requirement: Status toggle replaces Pending/Approved tags
The system SHALL expose `status` as `WANT_TO_GO` or `BEEN_TO`, defaulting to `WANT_TO_GO` on create.

#### Scenario: Default status on create
- **WHEN** a place is created without status
- **THEN** the system stores `WANT_TO_GO`

#### Scenario: Mark as visited
- **WHEN** the owner patches status to `BEEN_TO`
- **THEN** the system persists the new status and updated timestamp

### Requirement: Rating and evolving note
The system SHALL store nullable `rating` (0-5 stars) and a single free-text `note` that the owner edits over time.

#### Scenario: Rate a visited place
- **WHEN** the owner sets a rating between 0 and 5 on an owned place
- **THEN** the system stores the rating

#### Scenario: Note evolves from expectation to memory
- **WHEN** the owner updates the note after visiting
- **THEN** the system replaces the previous text (no history kept)

#### Scenario: Invalid rating rejected
- **WHEN** a rating outside 0-5 is submitted
- **THEN** the system rejects with `400` and stores nothing
