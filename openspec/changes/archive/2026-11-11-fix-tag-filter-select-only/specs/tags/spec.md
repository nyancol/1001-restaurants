# Spec Delta

## ADDED Requirements

### Requirement: Tag creation limited to edit contexts
The system SHALL only offer creation of new tags in place edit contexts (add-place form and inline place editor); the tag filter SHALL NOT offer tag creation.

#### Scenario: Create tag from edit contexts
- **WHEN** the user types a new tag in the add-place form or inline place editor and confirms with Enter or the create affordance
- **THEN** the system adds the normalized tag to the pending tag set

#### Scenario: No creation affordance in filter
- **WHEN** the user types a non-existing tag in the list/map tag filter
- **THEN** the system shows only matching existing-tag suggestions (or a no-matches state) with no "Create …" option and Enter does not add a free-text tag
