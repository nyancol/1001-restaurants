# Localization Specification

## Purpose

Lets users read and use the app in English or French, defaulting to their system language with a persistent manual override.

## Requirements

### Requirement: System-language default with English fallback
The system SHALL select the initial UI language from the browser language: `fr*` → French, `en*` → English, anything else → English.

#### Scenario: French browser gets French
- **WHEN** a user with no stored preference opens the app with `navigator.language` starting with `fr`
- **THEN** the system renders all UI chrome in French

#### Scenario: English browser gets English
- **WHEN** a user with no stored preference opens the app with `navigator.language` starting with `en`
- **THEN** the system renders all UI chrome in English

#### Scenario: Other language falls back to English
- **WHEN** a user with no stored preference opens the app with a language that is neither French nor English (e.g. `de-DE`)
- **THEN** the system renders all UI chrome in English

### Requirement: Persistent two-state language switcher
The system SHALL offer an EN | FR switcher next to the theme switcher in the footer on all authenticated views and persist the choice per device, with the stored value winning over browser detection on later visits.

#### Scenario: Switch language from footer
- **WHEN** the user clicks the other language while browsing
- **THEN** the system re-renders all UI chrome in that language without reload or data loss and stores the choice

#### Scenario: Choice survives reload
- **WHEN** the user set French, then reloads with an English browser language
- **THEN** the system still renders French

#### Scenario: No automatic switch-back
- **WHEN** the user has a stored language choice and the browser language changes
- **THEN** the system keeps rendering the stored language

### Requirement: Complete UI chrome translation
The system SHALL render all frontend UI chrome in the active language, including navigation, login, filters, empty states, add form, cards, editor, delete confirmation and delete failure messages, comboboxes, validation and lookup/refresh/share messages, duplicate-place prompts, placeholders, `aria-label`/`title` texts, and theme/mode labels, and set `document.documentElement.lang` accordingly.

#### Scenario: Full French pass
- **WHEN** French is active and the user visits login, list, map, and add views including error and empty states
- **THEN** no English UI-chrome string remains visible and `document.documentElement.lang` is `fr`

#### Scenario: Full English pass
- **WHEN** English is active and the user visits the same views and states
- **THEN** no French UI-chrome string remains visible and `document.documentElement.lang` is `en`

#### Scenario: Delete chrome translated
- **WHEN** the owner opens the edit section delete control, its confirmation, or its failure message in the active language
- **THEN** the button label, confirm prompt, and failure message render in that language

### Requirement: Locale-aware date display
The system SHALL format displayed dates/times with the active locale while keeping the free-typed 24h `HH:MM` input format unchanged.

#### Scenario: French date rendering
- **WHEN** French is active and a filter date is shown
- **THEN** weekday/month names render in French via the active locale

#### Scenario: Input format unchanged
- **WHEN** the user types an open-at time in either language
- **THEN** the system accepts the same 24h `HH:MM` format and equivalent digits-only shortcuts

### Requirement: Untranslated content boundaries
The system SHALL NOT translate user content (place names, notes, tags), Google-sourced data (hours text, ratings, place metadata, native dialog chrome), or backend error codes; only the frontend mapping of those codes is translated.

#### Scenario: User content preserved
- **WHEN** the UI is in French and a place has an English note and tags
- **THEN** the system shows the note and tags verbatim

#### Scenario: Backend codes unchanged
- **WHEN** the API returns `not_found`, `forbidden`, or `google_rate_limited`
- **THEN** the response body keeps those codes regardless of UI language
