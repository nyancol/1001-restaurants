# Tasks

## 1. Web UI rename

- [x] 1.1 Update header brand link and login hero in `web/src/App.tsx` to "In my Belly" and verify by grepping `App.tsx` for `Oyster` returning no hits.
- [x] 1.2 Update `<title>` in `web/index.html` to "In my Belly — Places" (leave the inline `oyster-theme`/`oyster-mode` keys untouched) and verify by opening the built page and checking the tab title.

## 2. Server strings and docs

- [x] 2.1 Update OpenAPI info title to "In my Belly API" and both no-UI fallback pages in `src/app.ts` to "In my Belly", and verify `GET /api/openapi.json` reports the new title and `curl` of the fallback contains "In my Belly".
- [x] 2.2 Update `README.md` title/intro from Oyster to "In my Belly" (leave `oyster_session` cookie docs, homelab URLs, and technical identifiers as-is) and verify by grepping `README.md` for user-visible "Oyster" returning no hits.

## 3. Rebuild and verify

- [x] 3.1 Rebuild the web bundle (`npm run build:web` or full `npm run build`) so `public/index.html` carries the new title, and verify `public/index.html` contains "In my Belly" and no "Oyster".
- [x] 3.2 Update any test/assertion referencing "Oyster" visible text to "In my Belly" and verify `npm test` and `npm run typecheck` pass.
- [x] 3.3 Final sweep: grep the repo for `Oyster` (case-sensitive) and classify each remaining hit as an intentionally-kept technical identifier (`oyster_session`, `oyster-theme`, `oyster-mode`, `oyster-foundation`, homelab URLs, archived change docs) with no user-visible occurrence left.
