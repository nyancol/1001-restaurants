# Proposal

## Why

Adding a place gives weak confirmation that the picked Google venue is the one the user has in mind, and the phone add flow forces a second edit to rate the place. Showing the venue's place-type description after pick and offering a star rating at creation (on both desktop and mobile) closes that gap in one save.

## What Changes

- Surface the Google place-type description in the matched-venue card (`VenueDataCard`) after a details pick, display-only:
  - Primary source `primaryTypeDisplayName.text` from the Places API (New) details response (already in server FieldMask).
  - Sensible fallback: prettified `primaryType` / first `types[]` entry when display name is missing; hide the row when no type data exists.
  - Locale-aware when Google returns localized text; no new backend fields.
- Add star-rating input parity on mobile `AddPlaceSheet` (desktop `AddPage` unchanged):
  - Nullable integer 1–5, default `null`, tap-again / clear to unset.
  - Included in create payload; duplicate 409 / pre-check merge preserves user intent (never wipes stored rating with `null`).
- Localize new strings in `en` + `fr` via existing `LanguageContext` keys.
- No autocomplete-row changes, no DB migration, no Google FieldMask expansion.

## Capabilities

### New Capabilities

None — behavior extends existing capture flow.

### Modified Capabilities

- `capture`: venue-type description display after pick; rating input required on both add surfaces.

## Impact

- Web: `lib/api.ts` (`PlaceDetails` + `parseDetails`), `components/VenueDataCard.tsx`, `components/mobile/AddPlaceSheet.tsx`, `i18n/en.ts` + `fr.ts`.
- Server `src/google/routes.ts`: no change (details mask already returns `primaryType`, `primaryTypeDisplayName`, `types`).
- DB `src/db/schema.ts`: no change (display-only, no snapshot columns).
- Tests: unit coverage for type-label fallback + mobile rating payload/duplicate-preserve; no e2e infra change.

## Out of Scope

- Autocomplete suggestion rows: no type/description columns there (owner decision 2026-11-23).
- Persisting the type description in the place snapshot or exposing it on list/map/read APIs.
- Google FieldMask expansion or new billing SKUs beyond the current details mask.
- Changing desktop `AddPage` rating behavior, edit sheets, list/map sorting/filtering by type, or backend rating validation (0–5 already enforced).
- New icon inference rules; tags/owner/duplicate UX unchanged except rating preservation noted above.
