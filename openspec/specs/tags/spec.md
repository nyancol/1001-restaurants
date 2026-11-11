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
The system SHALL suggest tags from all users' places, ranked by usage frequency then recency, filterable by prefix query.

#### Scenario: Suggest existing tags
- **WHEN** an authenticated user queries suggestions with `q=co`
- **THEN** the system returns matching tags with usage counts drawn from every user's places

#### Scenario: Suggestions require login
- **WHEN** an unauthenticated caller queries tag suggestions
- **THEN** the system responds `401`

### Requirement: Tag creation limited to edit contexts
The system SHALL only offer creation of new tags in place edit contexts (add-place form and inline place editor); the tag filter SHALL NOT offer tag creation.

#### Scenario: Create tag from edit contexts
- **WHEN** the user types a new tag in the add-place form or inline place editor and confirms with Enter or the create affordance
- **THEN** the system adds the normalized tag to the pending tag set

#### Scenario: No creation affordance in filter
- **WHEN** the user types a non-existing tag in the list/map tag filter
- **THEN** the system shows only matching existing-tag suggestions (or a no-matches state) with no "Create …" option and Enter does not add a free-text tag
