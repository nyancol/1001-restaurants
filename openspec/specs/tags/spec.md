# Tags Specification

## Purpose

Keeps a shared, reusable vocabulary across the friends group so capture suggests existing tags but still allows creating new ones.

## Requirements

### Requirement: Flat tags on places
The system SHALL store `tags` as a flat string array per place, normalized to trimmed lowercase with duplicates removed.

#### Scenario: Tags normalized on write
- **WHEN** a place is created with tags like `[" Japonais ", "JAPONAIS", "cozy"]`
- **THEN** the system stores `["japonais", "cozy"]`

### Requirement: Global tag suggestions
The system SHALL suggest tags from the authenticated user's own places, ranked by total usage count descending then recency, filterable by prefix query. Each suggestion SHALL include the total number of the user's places carrying that tag.

#### Scenario: Suggest existing tags
- **WHEN** an authenticated user queries suggestions with `q=co`
- **THEN** the system returns matching tags with total usage counts drawn from that user's own places

#### Scenario: Suggestions require login
- **WHEN** an unauthenticated caller queries tag suggestions
- **THEN** the system responds `401`

#### Scenario: Empty query returns ranked own tags
- **WHEN** an authenticated user queries suggestions with no `q`
- **THEN** the system returns all of that user's tags ranked by total count descending then recency, each with its total count

### Requirement: Tag creation limited to edit contexts
The system SHALL only offer creation of new tags in place edit contexts (add-place form and inline place editor); the tag filter SHALL NOT offer tag creation.

#### Scenario: Create tag from edit contexts
- **WHEN** the user types a new tag in the add-place form or inline place editor and confirms with Enter or the create affordance
- **THEN** the system adds the normalized tag to the pending tag set

#### Scenario: No creation affordance in filter
- **WHEN** the user types a non-existing tag in the list/map tag filter
- **THEN** the system shows only matching existing-tag suggestions (or a no-matches state) with no "Create …" option and Enter does not add a free-text tag

### Requirement: Visible selectable tag filter list with counts
The system SHALL expose the tag filter as a visible selectable list sorted by total count descending, showing each tag's total count beside its name; selecting a tag SHALL toggle it in the active tag filter.

#### Scenario: Desktop rail shows tag list
- **WHEN** the user views the desktop filter rail
- **THEN** the system shows the tag list with total counts visible without typing, plus a search field that narrows the list

#### Scenario: Phone tag filter expands to list
- **WHEN** the user expands the "Filter by tags" control on phone
- **THEN** the system shows the sorted tag list with total counts and a search field; tapping a tag toggles the filter with no manual text entry required

#### Scenario: Tag search narrows without creating
- **WHEN** the user types text matching no existing tag in the filter list
- **THEN** the system shows a no-matches state with no create affordance and Enter does not add a filter
