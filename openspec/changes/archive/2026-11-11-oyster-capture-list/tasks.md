# Tasks

## 1. Frontend scaffold

- [x] 1.1 Scaffold Vite + React + Tailwind served as static by the API container with `/` and `/add` routes and verify both load behind login.
- [x] 1.2 Add login redirect handling (unauthenticated → PocketID login, 401 → login prompt) and verify logout/login round trip in browser.

## 2. Capture

- [x] 2.1 Implement lookup field (explicit Search button, min 2 chars, per-query cache) against Google proxy with pick-to-prefill (name/address/coords/googlePlaceId) and verify a pick fills the form.
- [x] 2.2 Implement capture form (status toggle default `WANT_TO_GO`, tag combobox, stars, note) with validation and verify save creates the place via `POST /api/places`.
- [x] 2.3 Implement tag combobox (suggest from `GET /api/tags?q=` with counts, create-on-Enter) and verify reuse + create both attach normalized tags.
- [x] 2.4 Handle duplicate `googlePlaceId` for same owner (update-confirm, no silent fork) and verify second save updates instead of duplicating.
- [x] 2.5 Handle lookup-details failure (keep typed text, allow manual save) and verify save succeeds without coords.

## 3. List

- [x] 3.1 Implement own list (newest first) with URL-synced filters (status, tags multi, text `q`) via `GET /api/places?owner=me` and verify filter combinations narrow correctly.
- [x] 3.2 Implement inline edit (status flip, tags, stars, note) via `PATCH` with optimistic update and rollback and verify persistence after reload.
- [x] 3.3 Add empty/loading/error states including 360px phone layout check and verify sticky save bar stays reachable.

## 4. Integration check

- [x] 4.1 Exercise add → list → filter → edit → reload against foundation container and verify no console errors and contract unchanged.
