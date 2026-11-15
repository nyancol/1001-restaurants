# Spec Delta

## MODIFIED Requirements

### Requirement: Global tag suggestions
The system SHALL suggest tags from the authenticated user's own tag definitions, each with its color and the total number of the user's places carrying that tag, ranked by total usage count descending, then recency descending, then name ascending for zero-count ties, filterable by prefix query. Zero-count definitions SHALL remain selectable.

#### Scenario: Suggest existing tags
- **WHEN** an authenticated user queries suggestions with `q=co`
- **THEN** the system returns matching definitions with colors and total usage counts drawn from that user's own places

#### Scenario: Suggestions require login
- **WHEN** an unauthenticated caller queries tag suggestions
- **THEN** the system responds `401`

#### Scenario: Empty query returns ranked own tags
- **WHEN** an authenticated user queries suggestions with no `q`
- **THEN** the system returns all of that user's tag definitions ranked by total count descending then recency then name, each with its color and total count, including zero-count tags

#### Scenario: Suggestion includes color
- **WHEN** an authenticated user queries suggestions
- **THEN** each entry includes `tag`, `color` (a palette entry), and `count`

### Requirement: Tag creation limited to edit contexts
The system SHALL only offer creation of new tags in place edit contexts (add-place form and inline place editor); the tag filter SHALL NOT offer tag creation. Creating a tag SHALL also create an owned tag definition with a random palette color when one does not already exist.

#### Scenario: Create tag from edit contexts
- **WHEN** the user types a new tag in the add-place form or inline place editor and confirms with Enter or the create affordance
- **THEN** the system adds the normalized tag to the pending tag set and ensures an owned definition exists with a palette color

#### Scenario: No creation affordance in filter
- **WHEN** the user types a non-existing tag in the list/map tag filter
- **THEN** the system shows only matching existing-tag suggestions (or a no-matches state) with no "Create …" option and Enter does not add a free-text tag

### Requirement: Visible selectable tag filter list with counts
The system SHALL expose the tag filter as a visible selectable list sorted by total count descending (then recency, then name), showing each tag's color marker and total count beside its name; selecting a tag SHALL toggle it in the active tag filter. Zero-count owned tags SHALL remain visible and selectable.

#### Scenario: Desktop rail shows tag list
- **WHEN** the user views the desktop filter rail
- **THEN** the system shows the tag list with color markers and total counts visible without typing, plus a search field that narrows the list

#### Scenario: Phone tag filter expands to list
- **WHEN** the user expands the "Filter by tags" control on phone
- **THEN** the system shows the sorted tag list with color markers, total counts and a search field; tapping a tag toggles the filter with no manual text entry required

#### Scenario: Tag search narrows without creating
- **WHEN** the user types text matching no existing tag in the filter list
- **THEN** the system shows a no-matches state with no create affordance and Enter does not add a filter

## ADDED Requirements

### Requirement: User-owned tag entities
The system SHALL store one tag definition per (owner, normalized name) with a palette color, independent across users. Tag names SHALL be normalized identically to place tags.

#### Scenario: Tags are independent per user
- **WHEN** two users each create a tag named `cozy` and one renames or recolors it
- **THEN** the other user's definition and places are unchanged

#### Scenario: New users start empty
- **WHEN** a new user queries tag suggestions before creating any tag
- **THEN** the system returns an empty list

### Requirement: Fixed accessible palette
The system SHALL restrict tag colors to a fixed 32-entry accessible palette and reject any other value with `400`.

#### Scenario: Non-palette color rejected
- **WHEN** a caller creates or updates a tag with a color outside the palette
- **THEN** the system responds `400` and changes nothing

### Requirement: Random color on create
The system SHALL assign a random palette color to each newly created tag definition.

#### Scenario: New tag gets a color
- **WHEN** a user creates a tag with no existing definition
- **THEN** the new definition carries a palette color and suggestions return it

### Requirement: Rename tag with merge
The system SHALL allow renaming an owned tag definition, rewriting all of the owner's places carrying the old name. Renaming to an existing owned name SHALL merge into that target, keeping the target color.

#### Scenario: Rename rewrites places
- **WHEN** the owner renames `cozy` to `cosy`
- **THEN** all of their places tagged `cozy` carry `cosy` and suggestions reflect the new name

#### Scenario: Rename to existing merges
- **WHEN** the owner renames `cozy` to an existing `cosy`
- **THEN** the system keeps the `cosy` color, collapses duplicates on affected places, and removes the `cozy` definition

#### Scenario: Rename requires ownership
- **WHEN** a caller renames a tag owned by another user
- **THEN** the system responds `404` or `403` and changes nothing

### Requirement: Recolor tag
The system SHALL allow changing an owned tag definition's color to another palette entry without touching places.

#### Scenario: Recolor applies everywhere
- **WHEN** the owner changes the color of `cozy`
- **THEN** all displays of `cozy` for that viewer use the new color and place rows are unchanged

### Requirement: Delete tag
The system SHALL allow deleting an owned tag definition, which removes the definition and strips the tag from all of the owner's places.

#### Scenario: Delete strips places
- **WHEN** the owner deletes `cozy`
- **THEN** the definition is gone and none of their places carry `cozy`

### Requirement: Tag management limited to edit mode
The system SHALL expose rename, recolor, and delete only in edit contexts via a context menu (right-click on desktop, long-press on touch) plus a keyboard-accessible affordance. Filter and read-only displays SHALL be color display only.

#### Scenario: Context menu in edit mode
- **WHEN** the user right-clicks or long-presses a tag pill in the add-place form or place editor
- **THEN** the system offers rename, change color (palette grid), and delete

#### Scenario: No management in filter
- **WHEN** the user right-clicks or long-presses a tag in the filter list or a place card
- **THEN** the system does not offer rename, recolor, or delete

### Requirement: Viewer-color display
The system SHALL resolve displayed tag colors through the viewer's own definitions, falling back to the deterministic backfill color for unknown names. It SHALL render color as a dot marker on a neutral pill, never as colored text.

#### Scenario: Own palette wins on others places
- **WHEN** a viewer with `cozy=#blue` views another user's place tagged `cozy` (whose owner uses `#red`)
- **THEN** the chip renders with the viewer's `#blue`

#### Scenario: Unknown tag falls back deterministically
- **WHEN** a place carries a tag name with no viewer definition
- **THEN** the chip renders the backfill color for that name

### Requirement: Deterministic backfill migration
The system SHALL one-time backfill one tag definition per distinct normalized tag name found in each user's own places, with color `PALETTE[stableHash(name) % 32]`.

#### Scenario: Existing tags gain colors
- **WHEN** the migration runs for a user with places tagged `japonais`
- **THEN** a `japonais` definition exists with the deterministic palette color and prior tag strings are preserved
