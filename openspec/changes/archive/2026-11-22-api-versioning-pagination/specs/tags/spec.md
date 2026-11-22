# Spec Delta

## MODIFIED Requirements

### Requirement: Global tag suggestions
The system SHALL suggest tags from the authenticated user's own places via `GET /api/v1/tags`, ranked by total usage count descending then recency, filterable by prefix query, backed by the `place_tags` join table. Each suggestion SHALL include the total number of the user's places carrying that tag. Listing SHALL return the paginated envelope `{ data, pagination: { limit, nextCursor, total } }`.

#### Scenario: Suggest existing tags
- **WHEN** an authenticated user queries suggestions with `q=co`
- **THEN** the system returns matching tags with total usage counts drawn from that user's own places

#### Scenario: Suggestions require login
- **WHEN** an unauthenticated caller queries tag suggestions
- **THEN** the system responds `401`

#### Scenario: Empty query returns ranked own tags
- **WHEN** an authenticated user queries suggestions with no `q`
- **THEN** the system returns all of that user's tags ranked by total count descending then recency, each with its total count

#### Scenario: Paginated suggestions envelope
- **WHEN** an authenticated user queries `GET /api/v1/tags?limit=50`
- **THEN** the system returns `{ data, pagination }` with tag entries carrying `tag`, `color`, and `count`

## ADDED Requirements

### Requirement: Tag storage backed by join table
The system SHALL persist place-tag membership in a `place_tags` join table as the source of truth for filtering and counts, keeping `tagsJson` (if retained) as a derived mirror only. Rename, merge, recolor, and delete SHALL preserve join-table consistency for the owning user.

#### Scenario: Join table drives suggestions
- **WHEN** a place is created or patched with tags
- **THEN** the join table reflects the normalized membership used by `GET /api/v1/tags` counts

#### Scenario: Rename preserves membership
- **WHEN** the owner renames a tag
- **THEN** affected join rows move to the new name with no orphan membership remaining
