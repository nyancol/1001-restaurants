# Proposal

## Why

Saved places are thin: name + address + coordinates plus personal status/tags/rating/note. Users cannot answer "what's open Tuesday at 20:30?", "is this a restaurant, coffee, or bar?", or "what does Google say about price, rating, website?" without leaving the app. Enriching the Google snapshot at capture and adding a user-owned place type closes that gap.

## What Changes

- Extend Google details fetch (`/api/google/details`) FieldMask with hours, contact, price, rating, links, and primary type; snapshot results into the place row at save (no live refresh, no backfill in this change).
- Add one required user-owned place type per place (e.g. `restaurant`, `coffee`, `bar`): global free-text vocabulary like tags (trimmed lowercase, frequency-ranked suggestions), stored mapping of label to color + icon for pins, Google `primaryType` offered as editable suggestion.
- Backfill existing typeless places to `restaurant` via migration default.
- Infer open/closed locally from snapshotted periods (ignore Google `openNow`); add `open now` (default) / `open at datetime` filtering in the shared FilterBar for list and map; hide unknown-hours places when the open filter is active.
- Recode map pins by type (fill + icon = type only); status leaves the pin and remains in card/sheet plus as a filter. Defer legend.
- Show Google extras side-by-side with personal data: personal stars vs Google rating/count, price level + price range, website link, hours descriptions + open badge. Maps links are snapshotted but never rendered in place details; they are exposed only through a share button that copies the Google Maps URL to the clipboard.
- Visual business-status states: `CLOSED_PERMANENTLY` greyed card + badge, `CLOSED_TEMPORARILY` WIP/construction styling + badge; both excluded from open-now results.
- **BREAKING**: Map pin color contract changes from status-semantic (amber/green) to type-semantic; `map` spec requirement on status-colored drops is replaced.

## Capabilities

### New Capabilities

- `place-type`: fixed place-type vocabulary (`restaurant`, `bar`, `café`): single required value per place, predefined pin color + icon, `cafe`/`coffee` accepted as aliases for `café`.

### Modified Capabilities

- `places`: store placeType plus snapshotted Google fields (hours, businessStatus, priceLevel/priceRange, Google rating/count, website, Maps links).
- `capture`: prefill type suggestion + hours preview from details, require type before save, persist snapshot in one action.
- `map`: pins encode type (color + icon), FilterBar adds type + open-at filters, business-status styling on selected pin sheet.
- `places-list`: same type + open-at filters via shared FilterBar, greyed/WIP cards for closed statuses, side-by-side ratings display, share button copying the Google Maps URL (no Maps URL rendered in details).

## Impact

- Backend: `src/db/schema.ts` (places columns + place_types table), `src/places/routes.ts` (validation, filtering, migration default), `src/google/routes.ts` (FieldMask bump Essentials/Pro to Enterprise, passthrough of new fields), new `src/place-types/routes.ts` (suggestions endpoint mirroring `/api/tags`).
- Frontend: `web/src/lib/api.ts` (parseDetails extension, Place type, place-type suggestions), `AddPage.tsx` + `LookupField.tsx` (type picker + hours preview), `FilterBar.tsx` + `usePlaceFilters.ts` (type + open-at controls), `theme/pins.ts` + `MapPage.tsx` (type-coded drops), `PlaceCard.tsx` + `PlaceEditor.tsx` (type display/edit, hours, prices, dual ratings, website link, share-button clipboard copy, status badges).
- Billing: details calls move to Enterprise SKU when hours/price/rating/website requested (one call per pick, snapshot only).
- Tests: `tests/google.test.ts` (mask assertions), `tests/api.test.ts` (place CRUD + filters + migration default).
