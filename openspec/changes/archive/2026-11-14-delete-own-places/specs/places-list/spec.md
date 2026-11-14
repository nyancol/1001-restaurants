# Spec Delta

## MODIFIED Requirements

### Requirement: Inline edit from list
The system SHALL allow editing status, tags, stars, and note from the list entry. The edit section SHALL offer owner-only Delete with explicit confirmation; on confirm the place is removed from the list, on cancel nothing changes. Editing and delete SHALL be available only when viewing `Me`; views of another user SHALL be read-only with no edit affordance, while notes, tags, and ratings remain visible.

#### Scenario: Mark visited from list
- **WHEN** the owner flips an entry from `WANT_TO_GO` to `BEEN_TO`
- **THEN** the system persists the change and reflects it immediately

#### Scenario: Read-only for others stays out of scope
- **WHEN** a place owned by someone else appears (future overlay)
- **THEN** the system offers no edit affordance in this change

#### Scenario: Other users read-only
- **WHEN** the user views Bob's list
- **THEN** the system shows no Edit button and no status toggle on any card

#### Scenario: Delete offered in edit section
- **WHEN** the owner opens the edit section of an owned place
- **THEN** the system shows a Delete control alongside Save/Cancel

#### Scenario: Delete requires confirmation
- **WHEN** the owner activates Delete and confirms
- **THEN** the system deletes the place, closes the edit section, and removes the card from the list
- **WHEN** the owner cancels the confirmation
- **THEN** the system keeps the place and leaves the edit section open with no change

#### Scenario: No delete affordance for others
- **WHEN** the user views Bob's list
- **THEN** the system shows no Delete control on any card or edit section

#### Scenario: Delete failure keeps the place
- **WHEN** delete fails (for example `403`, `404`, or network error)
- **THEN** the system keeps the place visible and surfaces a localized failure message
