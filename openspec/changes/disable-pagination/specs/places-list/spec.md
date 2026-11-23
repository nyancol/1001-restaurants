# Spec Delta — places-list

## MODIFIED Requirements

### Requirement: Own list with filters

The system SHALL show the user's own places by default with filters for status, tags, free text, price level ($–$$$$), and open-now/open-at datetime (no place-type filter) backed by `GET /api/v1/places` server-side filtering returning the full result set in one response. The system SHALL also support viewing a specific user via a Users scope picker (`Me (<name>)`, each other user) persisted in the URL (`owner=me|<userId>`), applying the same filters to the selected scope newest first. The list SHALL render and scroll all matching places with no paging.

#### Scenario: Default is own places

- **WHEN** an authenticated user opens the list
- **THEN** the system shows only their places newest first

#### Scenario: View a specific user

- **WHEN** the user picks Bob in the Users scope picker
- **THEN** the system shows only Bob's places newest first with the same active filters

#### Scenario: Filter by status and tags

- **WHEN** the user sets status `BEEN_TO` and tag `japonais`
- **THEN** the system shows only owned places matching both

#### Scenario: Text search by name

- **WHEN** the user types a name fragment
- **THEN** the system narrows to owned places whose name matches

#### Scenario: Owner persists in URL

- **WHEN** the user picks Bob and reloads or shares the URL
- **THEN** the system restores the Bob-scoped view with filters intact

#### Scenario: Legacy placeType URLs ignored

- **WHEN** the user opens a list URL containing `placeType=bar`
- **THEN** the system ignores the parameter and shows the unfiltered scope with no error

#### Scenario: Paged list walks cursor

- **WHEN** the filtered result set exceeds the former page size
- **THEN** the list shows every matching place in a single scrollable view with no next-page fetch (cursor pagination retired)

#### Scenario: Open filter may short-fill pages

- **WHEN** the open filter is active
- **THEN** the list shows exactly the open matches with no short-page or next-page affordance (no pages remain)

> Note: supersedes the former cursor-walk behavior: the `Paged list walks cursor` and `Open filter may short-fill pages` scenarios above now assert full-set rendering since pagination is retired.
