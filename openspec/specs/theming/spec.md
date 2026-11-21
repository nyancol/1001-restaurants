# Theming Specification

## Purpose

Renders the whole app in the single Botanical Butter & Earth identity — no theme or mode switching.

## Requirements

### Requirement: Single Botanical theme
The system SHALL render all authenticated views in the Botanical Butter & Earth theme (Literata display + Nunito Sans body, butter canvas, forest accent) with no theme or mode selector anywhere in the UI.

#### Scenario: No switcher in shell
- **WHEN** an authenticated user views any page or the footer
- **THEN** the system shows no theme picker and no light/dark toggle

#### Scenario: First visit renders Botanical
- **WHEN** a user opens the app with empty local storage, regardless of OS `prefers-color-scheme`
- **THEN** the system renders the Botanical light scheme with no flash of another variant

### Requirement: Token contract applied everywhere
The system SHALL render all views from semantic roles (surfaces, ink, accent, status, stars, danger, info, radius, fonts), with themed error and info banners.

#### Scenario: Banners follow theme
- **WHEN** a save fails or a duplicate notice appears
- **THEN** the system shows danger or info banners in the Botanical palette meeting contrast

#### Scenario: No raw colors in views
- **WHEN** list, filter bar, cards, editor, stars, inputs, sheets, or empty states render
- **THEN** they use only contract roles defined in `botanical.css`

### Requirement: Flat surfaces with limited texture
The system SHALL keep content surfaces flat, reserving grain or starfield texture for hero, login, or empty states only.

#### Scenario: List stays flat
- **WHEN** the user browses places
- **THEN** cards and inputs stay flat while only empty or hero areas may show texture
