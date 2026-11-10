# Tasks

## 1. Frontend scaffold

- [ ] 1.1 Scaffold Vite + React + Tailwind served as static by the API container with `/` and `/add` routes and verify both load behind login.
- [ ] 1.2 Add login redirect handling (unauthenticated → PocketID login, 401 → login prompt) and verify logout/login round trip in browser.

## 2. Capture

- [ ] 2.1 Implement lookup field (debounced, min 2 chars) against Google proxy with pick-to-prefill (name/address/coords/googlePlaceId) and verify a pick fills the form.
- [ ] 2.2 Implement capture form (status toggle default `WANT_TO_GO`, tag combobox, stars, note) with validation and verify save creates the place via `POST /api/places`.
- [ ] 2.3 Implement tag combobox (suggest from `GET /api/tags?q=` with counts, create-on-Enter) and verify reuse + create both attach normalized tags.
- [ ] 2.4 Handle duplicate `googlePlaceId` for same owner (update-confirm, no silent fork) and verify second save updates instead of duplicating.
- [ ] 2.5 Handle lookup-details failure (keep typed text, allow manual save) and verify save succeeds without coords.

## 3. List

- [ ] 3.1 Implement own list (newest first) with URL-synced filters (status, tags multi, text `q`) via `GET /api/places?owner=me` and verify filter combinations narrow correctly.
- [ ] 3.2 Implement inline edit (status flip, tags, stars, note) via `PATCH` with optimistic update and rollback and verify persistence after reload.
- [ ] 3.3 Add empty/loading/error states including 360px phone layout check and verify sticky save bar stays reachable.

## 4. Integration check

- [ ] 4.1 Exercise add → list → filter → edit → reload against foundation container and verify no console errors and contract unchanged.
