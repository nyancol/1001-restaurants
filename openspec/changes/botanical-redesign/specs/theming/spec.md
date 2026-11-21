# Spec Delta: theming

## MODIFIED Requirements

### Requirement: Theme and mode selection
The system SHALL offer theme (`botanical`, `xp`, `retro`) and mode (`light`, `dark`) selectors in the app header on all authenticated views, defaulting to `botanical` + OS mode on first visit.

#### Scenario: Switch theme from header
- **WHEN** the user picks `retro` while on `xp`
- **THEN** the system restyles shell, list, map chrome, add form, and sheets without reload or data loss

#### Scenario: Switch mode from header
- **WHEN** the user toggles `light` to `dark`
- **THEN** the system remaps surfaces and text while keeping accent and status hues recognizable

#### Scenario: Botanical is default
- **WHEN** a user with no stored preference opens the app
- **THEN** the system renders `botanical` light (or OS dark) with Literata display + Nunito Sans body, butter canvas, forest primary.

#### Scenario: Switch theme from switcher
- **WHEN** the user picks `xp` while on `botanical`
- **THEN** the system restyles shell, rail, cards, editor, and map chrome without reload or data loss.

### Requirement: Persisted preference with OS default
The system SHALL persist theme and mode per device and default mode to the OS `prefers-color-scheme` on first visit, with default theme `botanical`.

#### Scenario: First visit follows OS
- **WHEN** a user with no stored preference and OS dark mode opens the app
- **THEN** the system renders `dark` mode with the default `botanical` theme

#### Scenario: Preference survives reload
- **WHEN** the user sets `botanical` + `dark` and reloads
- **THEN** the system restores `botanical` + `dark` without flash of the wrong variant

### Requirement: Token contract applied everywhere
The system SHALL render all views from semantic roles (surfaces, ink, accent, status, stars, danger, info, radius, fonts), with themed error and info banners. Botanical adds: bg `#fff8f0`, surface cream `#ffffff`, surface-2 `#ffedba`/`#fff3d6`, ink `#231b00`, muted `#414940`, line warm `1px rgba(62,53,38,.12)`, accent forest `#225f33`/`#3c7849` with cream ink, want honey `#ffdeae`, been sage `#aeefb2`, star `#8f640e`, focus forest, radius `12px` cards / pill tags, fonts Literata/Nunito Sans, ultra-diffused warm shadow `0 8px 24px -4px rgba(62,53,38,.07)`.

#### Scenario: Banners follow theme
- **WHEN** a save fails or a duplicate notice appears under any variant
- **THEN** the system shows danger or info banners in that variant's palette meeting contrast

#### Scenario: No raw colors in views
- **WHEN** list, filter bar, cards, editor, stars, inputs, sheets, or empty states render, including rail, map chrome under botanical
- **THEN** they use only contract roles so a new theme file alone restyles them

#### Scenario: Dark botanical stays warm
- **WHEN** mode is dark under botanical
- **THEN** surfaces deepen to espresso-tinted greens/browns while keeping forest accent and cream text recognizable and contrast-passing.
