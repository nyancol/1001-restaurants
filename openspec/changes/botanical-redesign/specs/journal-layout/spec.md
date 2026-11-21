# Spec Delta: journal-layout

## Purpose

Three-column dining-journal shell that frames discovery as a personal memory log across desktop and phone, binding filter rail, feed, and map to one selection.

## ADDED Requirements

### Requirement: Desktop three-pane journal shell
The system SHALL render a desktop (`lg+`) journal with left filter rail (~280px), center Saved Tables feed (flex-1), and right sticky map pane (~1.2x feed width) under one header, sharing a single filter + selection state.

#### Scenario: Panes stay in sync
- **WHEN** the user picks a tag in the left rail on desktop
- **THEN** the center feed filters and map pins update without reload, and pin tap highlights the matching card via scroll-into-view.

#### Scenario: Map preview drives feed
- **WHEN** the user taps a map pin on desktop
- **THEN** the system highlights the matching feed card and shows the preview card docked above the map footer.

### Requirement: Left filter rail
The system SHALL show Me/Friends scope toggle with counts, search input with `⌘K`, LISTS & STATE section (All Saved Tables / Want to Visit / Been & Loved with counts), TAGS section (12 tags label, “Add tag to filter…” input, pill cloud with active `#NaturalWine` state), and “Reset all journal filters” link.

#### Scenario: Reset clears all
- **WHEN** the user clicks reset
- **THEN** status, tags, query, and open-at filters clear and feed + map refresh.

### Requirement: Center Saved Tables feed header
The system SHALL show “Saved Tables (48 entries)” title, “Recently Saved” sort dropdown, and card/grid view toggle; feed SHALL list journal cards newest-first by default.

#### Scenario: Toggle view density
- **WHEN** the user flips card/grid toggle
- **THEN** the feed switches between full journal cards and compact grid without losing filter state.

### Requirement: Phone fallback stacking
The system SHALL stack rail → feed on `<lg`, collapsing Lists into disclosure and Tags into horizontal scroll; map remains on `/map` route with bottom preview sheet.

#### Scenario: Phone map sheet
- **WHEN** a phone user taps a pin on `/map`
- **THEN** a bottom sheet shows the same preview card with “View Tasting Notes” and close control.
