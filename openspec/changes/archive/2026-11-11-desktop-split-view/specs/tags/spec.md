# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
