# Spec Delta

## Purpose

Keeps a shared, reusable vocabulary across the friends group so capture suggests existing tags but still allows creating new ones.

## ADDED Requirements

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
