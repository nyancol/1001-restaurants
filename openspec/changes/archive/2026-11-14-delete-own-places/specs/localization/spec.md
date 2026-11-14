# Spec Delta

## MODIFIED Requirements

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
