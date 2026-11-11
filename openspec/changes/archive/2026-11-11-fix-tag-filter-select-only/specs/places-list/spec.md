# Spec Delta

## ADDED Requirements

### Requirement: Tag filter selects existing tags only
The system SHALL restrict the list/map tag filter to selecting existing tags from suggestions; typing an arbitrary value SHALL NOT add it as a filter via Enter or a create affordance.

#### Scenario: Select existing tag as filter
- **WHEN** the user picks a suggested tag in the "Filter by tags" control
- **THEN** the system adds it to the active tag filter and narrows list and map results to places carrying all selected tags

#### Scenario: Unknown text is not added as filter
- **WHEN** the user types text matching no existing tag in the "Filter by tags" control and presses Enter
- **THEN** the system does not add a new filter chip and leaves the active tag filter unchanged

#### Scenario: Pre-set unknown tag still filters
- **WHEN** the active tag filter already contains a value with no matching places (e.g. from a shared URL)
- **THEN** the system shows the empty result set and keeps the removable filter chip without offering to create that tag
