# Proposal

## Why

Personal restaurant/bar/café memory currently lives scattered across Mapstr and Notes with no shared structure, no map+list recall, and no path for a small friends group or a future agent to use the same data. The first iterative slice must establish a hosted, multi-tenant foundation (auth, ownership, stable API) that later changes (capture UI, map, Mapstr import) can build on.

## What Changes

- Runnable containerized web service for homelab Docker behind reverse proxy + Cloudflare Tunnel, with health endpoint and SQLite persistence (WAL, file volume).
- OIDC login via existing PocketID instance (code flow, cookie session); first-login user provisioning from OIDC `sub`.
- Multi-tenancy enforcement: every place has `ownerId`; any logged-in user can read any place, only the owner can create/update/delete own places.
- API v1 (OpenAPI) for places and tag suggestions, designed as the stable contract the browser UI and (later) an agent will share:
  - `GET /api/places?owner=&status=&tags=&q=`, `POST /api/places`, `GET/PATCH/DELETE /api/places/:id`, `GET /api/tags?q=`.
- Place model: Google link (`googlePlaceId`, `name`, `address`, `lat`, `lng`), `status` toggle (`WANT_TO_GO`/`BEEN_TO`), flat `tags[]`, `rating` (stars, nullable), single evolving `note`, `ownerId`, timestamps.
- Tag suggestions aggregate across all users (global pool), lowercase normalized; server-side Google Places/Geocoding for lookup enrichment (key stays server-side).
- Out of scope for this change: map rendering/pins UI, Mapstr CSV import, Notes import, photos, discovery/search, agent tokens, deployment defs (mise/compose), backups automation.

## Capabilities

### New Capabilities

- `auth`: OIDC login via PocketID, session handling, user identity provisioning.
- `places`: place lifecycle (create/read/update/delete), ownership, status toggle, rating, note, Google-link fields.
- `tags`: flat tag storage on places and global cross-user tag suggestion.

### Modified Capabilities

- None (greenfield project, no existing specs).

## Impact

- New service: Node 24 + TypeScript API serving static frontend placeholder + API; Drizzle + SQLite; `openid-client`/`jose` for OIDC.
- Affected systems: homelab reverse proxy + Cloudflare Tunnel routing (app expects forwarded proto/host, OIDC redirect URL); PocketID client registration.
- Data: new SQLite volume; no migration from existing data in this change (import is `oyster-import` later).
- API: new v1 contract; breaking changes expected only before follow-ups lock it.
