# Design

## Context

Greenfield repo (Node 24 via mise, no app code yet). See proposal.md for why. Constraints from exploration: homelab Docker behind reverse proxy + Cloudflare Tunnel; PocketID OIDC already running; SQLite file volume is enough; Google key must stay server-side; API contract is MVP-stable for browser UI now and agent later. Map UI, CSV import, deployment defs are later changes — this change must not preclude them.

## Goals / Non-Goals

**Goals:**
- One container serving static UI placeholder + versioned-feeling `/api/*` with OpenAPI.
- Secure-by-default multi-tenancy (read-all, edit-own) enforced server-side.
- Typed SQLite persistence with migrations from day one.

**Non-Goals:**
- Map tiles/pins, CSV import/enrichment, agent tokens, compose/mise deployment, backups automation, photos, Notes import.

## Decisions

- **Single Node/TS service (Fastify, locked) serving API + static frontend:** one image to operate on homelab; no CORS between UI and API; OpenAPI generated from TypeBox schemas. Stack: `fastify` + `@fastify/cookie` + session (via `jose`/session plugin) + `@fastify/static` + `@fastify/swagger`, Node 24 ESM, pino logging. Alternative Hono (`zod-openapi`, lighter, edge-portable) considered and rejected for foundation: smaller ecosystem for session/static/OpenAPI and no benefit on long-lived homelab Docker. Alternative split frontend/backend images rejected as extra ops for no MVP gain.
- **Drizzle + better-sqlite3, WAL mode, `/data/app.db`:** typed migrations, zero extra container. Alternative Postgres rejected: connection management + backups outweigh benefits at ~thousands of rows and near-zero write concurrency.
- **Auth: OIDC code + PKCE via PocketID, cookie session (HttpOnly, Secure, SameSite=Lax), users table keyed by `sub`:** keeps browser simple; reverse proxy terminates TLS, app trusts `X-Forwarded-Proto/Host` for redirect URLs. Token auth for agent explicitly deferred to later change (table left extensible, not built).
- **Tenancy: `ownerId` column on places, enforced in service layer + covered by tests, not just UI hiding:** every write checks `place.ownerId == session.userId`; list defaults `ownerId = me` unless `owner=all|specific` query. Alternative RLS-style or per-user DBs rejected as overkill.
- **Tags: plain string array (JSON column) + normalization helper + aggregate query for suggestions:** no separate tag table in foundation; counts computed from all rows, ranked by frequency/recency. Keeps model flat as agreed; dedicated tag table only if scale demands.
- **Google: server-side Places Autocomplete + Place Details/Geocode proxy endpoints:** browser never sees the key; responses cached minimally to aid later bulk enrichment. Display tiles deliberately not Google (later change uses MapLibre + free tiles).

## Risks / Trade-offs

- [PocketID discovery/client mismatch] → Mitigation: fail fast at boot with clear log if issuer/client/redirect invalid; document required client settings in tasks.
- [SQLite write lock under concurrent import] → Mitigation: single-writer service, WAL on, import change does batched transactions (not this change's load).
- [Tag spelling drift (`cafe` vs `café`)] → Mitigation: lowercase+trim now; accent folding deferred, documented as known limitation.
- [Tunnel/proxy header spoofing] → Mitigation: only trust forwarded headers from configured proxy; session cookies Secure.

## Migration Plan

- Fresh volume: migrations run at container start; health `/api/health` reports `db: ok`.
- Rollback: stateless image + versioned migrations; downgrade by restoring volume snapshot (documented, not automated here).

## Open Questions

- Exact PocketID client settings (scopes, claim for display name) — answerable at implementation without changing specs.
- Frontend framework for later changes — placeholder static page suffices here.
