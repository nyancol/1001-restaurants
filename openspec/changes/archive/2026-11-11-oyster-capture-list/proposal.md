# Proposal

## Why

Foundation gives a stable API and login, but daily use needs a fast phone-friendly way to file a place and see one's own list again. Without capture + list, the app is an empty backend nobody opens.

## What Changes

- Capture form: type name → Google autocomplete (server proxy) → pick → prefilled name/address/coords → add status toggle, tags (suggest existing + create new), stars, note → save.
- Fast path: prefill must survive; saving a duplicate Google place for the same owner updates rather than duplicates (or warns).
- Own list: default view is own places, filterable by status (`WANT_TO_GO`/`BEEN_TO`), tags (multi), and text query; edit inline (status/tags/stars/note).
- Tag input: Mapstr-style suggest-as-you-type from global pool with counts; creating a new tag is one tap; normalization shared with foundation.
- Responsive layout usable on phone and laptop; no map in this change (pins are `oyster-map`).
- Out of scope: map rendering, CSV import, friend overlay UI, agent tokens, photos, deployment defs.

## Capabilities

### New Capabilities

- `capture`: quick-add flow from Google lookup to saved place with status/tags/stars/note.
- `places-list`: own-place list recall with status/tag/text filters and inline editing entry.

### Modified Capabilities

- None (foundation `places`/`tags`/`auth` are in-flight deltas, not yet main specs; this change adds UI behavior on top without changing their requirements).

## Impact

- Frontend: new Vite + React + Tailwind views served by the same container; calls foundation `/api/*`.
- API: no breaking changes; uses `POST/PATCH /api/places`, `GET /api/places?owner=me`, `GET /api/tags?q=`, Google proxy from foundation.
- Auth: reuses foundation session; unauthenticated UI redirects to login.
