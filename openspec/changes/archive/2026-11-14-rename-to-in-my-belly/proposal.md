# Proposal

## Why

The product currently presents itself as "Oyster" (titles, header, login, API docs) while the intended product name is "In my Belly". Users see the wrong name at every entry point, so the rename aligns visible branding with the product identity.

## What Changes

- Replace user-visible "Oyster" branding with "In my Belly" across the web UI shell (header brand link, login hero), HTML document titles (`web/index.html`, served `public/index.html` via build), and server-rendered fallback pages in `src/app.ts`.
- Update the OpenAPI info title from "Oyster API" to "In my Belly API" (docs-only, no route changes).
- Update human-facing docs and metadata that name the product: `README.md` title/intro, `package.json` display-adjacent `name` only if decided (see assumptions), PWA/manifest title if present.
- Keep all routes, APIs, DB schema, auth behavior, and visual theme system unchanged; no behavior change beyond displayed name.

## Capabilities

### New Capabilities

- `app-branding`: defines the user-visible application name ("In my Belly") and where it MUST appear (document title, header brand, login hero, API docs title, fallback pages).

### Modified Capabilities

- None. No existing spec states a product-name requirement (verified: `theming`, `responsive-layout`, and others reference header/branding generically without naming "Oyster"), so this introduces a new capability rather than modifying one.

## Impact

- Affected code: `web/src/App.tsx` (2 strings), `web/index.html` (title + inline theme-boot script keys referenced but unchanged), `src/app.ts` (OpenAPI title + 2 fallback HTML strings), `README.md`, generated `public/` bundle output (rebuild artifact).
- Affected systems: web UI, OpenAPI docs (`/api/openapi.json`, Swagger UI), root `/` fallback pages.
- Dependencies: none new. No API, DB, or auth contract changes.
- Risk: low. String-only change; verified by title/header assertions plus existing test suite.
- Explicitly out of scope (assumption, confirm in review): technical identifiers stay unchanged — npm `package.json:name` (`oyster-foundation`), session cookie `oyster_session`, localStorage keys `oyster-theme`/`oyster-mode`, repo directory, Docker image name, and `1001-restaurants` homelab URLs. Renaming any of these would be **BREAKING** (session invalidation, stored-preference loss, deploy config churn) and is excluded unless requested.
