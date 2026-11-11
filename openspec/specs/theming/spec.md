# Theming Specification

## Purpose

Lets users switch the app between XP-inspired and Space Age retro looks, each in light or dark, with the choice remembered per device.

## Requirements

### Requirement: Theme and mode selection
The system SHALL offer theme (`xp`, `retro`) and mode (`light`, `dark`) selectors in the app header on all authenticated views.

#### Scenario: Switch theme from header
- **WHEN** the user picks `retro` while on `xp`
- **THEN** the system restyles shell, list, map chrome, add form, and sheets without reload or data loss

#### Scenario: Switch mode from header
- **WHEN** the user toggles `light` to `dark`
- **THEN** the system remaps surfaces and text while keeping accent and status hues recognizable

### Requirement: Persisted preference with OS default
The system SHALL persist theme and mode per device and default mode to the OS `prefers-color-scheme` on first visit.

#### Scenario: First visit follows OS
- **WHEN** a user with no stored preference and OS dark mode opens the app
- **THEN** the system renders `dark` mode with the default `xp` theme

#### Scenario: Preference survives reload
- **WHEN** the user sets `retro` + `dark` and reloads
- **THEN** the system restores `retro` + `dark` without flash of the wrong variant

### Requirement: Token contract applied everywhere
The system SHALL render all views from semantic roles (surfaces, ink, accent, status, stars, danger, info, radius, fonts), with themed error and info banners.

#### Scenario: Banners follow theme
- **WHEN** a save fails or a duplicate notice appears under any of the 4 variants
- **THEN** the system shows danger or info banners in that variant's palette meeting contrast

#### Scenario: No raw colors in views
- **WHEN** list, filter bar, cards, editor, stars, inputs, sheets, or empty states render
- **THEN** they use only contract roles so a new theme file alone restyles them

### Requirement: Flat surfaces with limited texture
The system SHALL keep content surfaces flat, reserving grain or starfield texture for hero, login, or empty states only.

#### Scenario: List stays flat
- **WHEN** the user browses places in retro dark
- **THEN** cards and inputs stay flat while only empty or hero areas may show texture
