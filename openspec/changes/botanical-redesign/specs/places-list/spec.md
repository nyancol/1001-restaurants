# Spec Delta: places-list

## MODIFIED Requirements

### Requirement: Own list with filters
The system SHALL show the user's own places by default with filters for status, tags, free text, and open-now/open-at datetime (no place-type filter). The system SHALL also support viewing a specific user via a Users scope picker (Me/Friends segmented with counts: `Me (<name>)`, each other user) persisted in the URL (`owner=me|<userId>`), applying the same filters to the selected scope newest first. The feed header SHALL show Saved Tables count, Recently Saved sort, and card/grid toggle.

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

#### Scenario: Sort persists per session
- **WHEN** the user changes sort to rating or name
- **THEN** the feed reorders without losing filters or selection.

### Requirement: Enriched card with dual ratings and status states
The system SHALL show on each list card the place icon, hours summary with open badge, price level plus price range, personal stars side-by-side with Google rating and count, website link, and distinct styling for `CLOSED_PERMANENTLY` (greyed plus badge) and `CLOSED_TEMPORARILY` (WIP styling plus badge). Journal presentation: title (Literata) + honey `★ rating` pill + status pill (`Been Nx` sage / `Want to go` honey), italic quote note on butter wash when note exists, photo duo (grey placeholders when missing), address • price • visited/added footer, tag pills. Missing visits/price/photos/recs are hidden, not faked. The system SHALL NOT render the Google Maps URL in place details.

#### Scenario: Dual ratings visible
- **WHEN** a place has personal rating `5` and Google rating `4.3 (1200)`
- **THEN** the card shows both values side by side

#### Scenario: Share button copies Google Maps link
- **WHEN** the user opens the share control and selects `google maps link`
- **THEN** the system copies the snapshotted Google Maps URL to the clipboard and confirms without navigating away

#### Scenario: No Maps URL in details
- **WHEN** a place with a snapshotted Maps URL is displayed
- **THEN** the details show no Maps URL text or link outside the share control

#### Scenario: Closed permanently greyed
- **WHEN** a place has `businessStatus` `CLOSED_PERMANENTLY`
- **THEN** the card renders greyed with a closed badge

#### Scenario: Closed temporarily WIP
- **WHEN** a place has `businessStatus` `CLOSED_TEMPORARILY`
- **THEN** the card renders with WIP styling distinct from greyed plus a badge

#### Scenario: Open filter hides unknown hours
- **WHEN** the open filter is active
- **THEN** the list excludes owned places without an hours snapshot

#### Scenario: Best-effort missing fields
- **WHEN** a place lacks visits, price, photos, or friend rec
- **THEN** the card hides that row and keeps title/rating/status/tags/note intact.

#### Scenario: Icon alone in card
- **WHEN** a place with icon `cocktail` renders in the list
- **THEN** the card shows the icon with no adjacent category word

### Requirement: Inline edit from list
The system SHALL allow editing status, tags, stars, and note from the list entry, presented as journal edit mode with `Editing place` badge, Want-to-go/Been-here segmented control, VISITS stepper, ICON picker row, TAGS & CUISINE pill editor with suggestions + count, YOUR RATING stars + score + label, NOTE textarea, and Delete / Cancel / Save Changes bar. The edit section SHALL offer owner-only Delete with explicit confirmation; on confirm the place is removed from the list, on cancel nothing changes. Editing and delete SHALL be available only when viewing `Me`; views of another user SHALL be read-only with no edit affordance, while notes, tags, and ratings remain visible.

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

#### Scenario: Save/cancel/delete in journal edit
- **WHEN** the user saves valid tags/rating/note/icon
- **THEN** the system persists via existing save path, collapses edit mode, and shows errors inline on failure; Cancel discards.

### Requirement: List participates in desktop split
The system SHALL render the own-places list as the center pane of the desktop split view, sharing the split's single fetch and selection state so list results always equal map pins for the same filters.

#### Scenario: Split list matches pins
- **WHEN** the user sets status and tag filters in the desktop split view
- **THEN** the list pane shows exactly the result set pinned on the map pane

#### Scenario: Single fetch for both panes
- **WHEN** filters change in the desktop split view
- **THEN** the system issues one places query whose results feed both list and map panes

### Requirement: Desktop list grid density
The system SHALL use desktop-appropriate density in the split list pane so cards remain scannable at wide viewports, with card/grid toggle switching full journal cards vs compact grid without losing filter state.

#### Scenario: Cards remain scannable
- **WHEN** the user views the list pane on a desktop viewport
- **THEN** cards use compact touch targets and summary rows that fit the pane width without horizontal scrolling
