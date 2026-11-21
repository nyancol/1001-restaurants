# Spec Delta

## MODIFIED Requirements

### Requirement: Theme and mode selection
The system SHALL offer a single clean theme with mode (`light`, `dark`) selector in the app header on all authenticated views; no theme picker SHALL remain.

#### Scenario: Switch mode from header
- **WHEN** the user toggles `light` to `dark`
- **THEN** the system remaps surfaces and text while keeping accent and status hues recognizable

#### Scenario: No theme picker
- **WHEN** the user opens the header or footer on any viewport
- **THEN** the system shows no `xp` / `retro` choice and renders the clean theme without reload or data loss

### Requirement: Persisted preference with OS default
The system SHALL persist mode per device and default mode to the OS `prefers-color-scheme` on first visit; legacy stored theme values SHALL be ignored.

#### Scenario: First visit follows OS
- **WHEN** a user with no stored preference and OS dark mode opens the app
- **THEN** the system renders `dark` mode with the clean theme

#### Scenario: Preference survives reload
- **WHEN** the user sets `dark` and reloads
- **THEN** the system restores `dark` without flash of the wrong variant

#### Scenario: Legacy theme ignored
- **WHEN** a device has stored `oyster-theme` `xp` or `retro`
- **THEN** the system ignores it and renders clean without error

## ADDED Requirements

### Requirement: System theme integration
The system SHALL set `color-scheme`, `theme-color`, safe-area insets, and touch defaults for the single theme.

#### Scenario: Dark form controls match
- **WHEN** the user renders `dark` mode
- **THEN** scrollbars, inputs and selects use the dark palette via `color-scheme: dark`

#### Scenario: Notch devices respected
- **WHEN** the user opens the app on a notched phone
- **THEN** header, sticky bar and footer pad with `env(safe-area-inset-*)` with no content clipped

#### Scenario: Touch defaults
- **WHEN** the user taps buttons or opens a sheet on phone
- **THEN** double-tap zoom delay is suppressed and sheets contain overscroll without page rubber-banding
