# Tasks

## 1. Service scaffold

- [ ] 1.1 Scaffold Node/TS service (Fastify or Hono) serving `/api/health` and a static placeholder page, verified by `curl localhost:3000/api/health` returning `db: ok` shape (or `db: pending` until §2).
- [ ] 1.2 Add Dockerfile (single image, non-root, `NODE_ENV=production`) and verify `docker build` succeeds and the container boots to serve `/api/health`.
- [ ] 1.3 Add OpenAPI generation from schemas and verify `GET /api/openapi.json` matches the implemented routes.

## 2. Persistence

- [ ] 2.1 Add Drizzle + better-sqlite3 (WAL, `/data/app.db` via env override) with `users` and `places` tables plus migration runner on boot, verified by migration applying on a fresh volume and health reporting `db: ok`.
- [ ] 2.2 Document volume + env (`DATABASE_PATH`, `GOOGLE_PLACES_KEY`, OIDC vars) in README and verify documented boot command starts as written.

## 3. Auth (PocketID OIDC)

- [ ] 3.1 Implement OIDC code+PKCE login/callback/logout with `openid-client`/`jose`, user upsert by `sub`, cookie session (HttpOnly/Secure/SameSite=Lax), verified by login creating one user row and logout invalidating the session.
- [ ] 3.2 Require session on all `/api/*` except health/login/callback/openapi-docs and verify unauthenticated `GET /api/places` returns `401`.
- [ ] 3.3 Fail fast at boot on invalid OIDC config (issuer/client/redirect) with a clear log line and verify by booting with a bad issuer URL.

## 4. Places API

- [ ] 4.1 Implement `POST /api/places` forcing `ownerId` to session user with validation (status default `WANT_TO_GO`, rating 0–5 or null, tags normalized) and verify with create-then-get round trip.
- [ ] 4.2 Implement `GET /api/places` defaulting to own places plus `owner` (`me|all|<userId>`), `status`, `tags`, `q` filters and verify owner scoping returns own by default and others only when asked.
- [ ] 4.3 Implement `GET/PATCH/DELETE /api/places/:id` with edit-own `403` enforcement and verify a second user can read but gets `403` on patch/delete.
- [ ] 4.4 Add API tests covering 401/403/400 cases above and verify the suite passes.

## 5. Tags + Google proxy

- [ ] 5.1 Implement tag normalization helper (trim/lowercase/dedupe) used on every place write and verify with unit test (`" Japonais "/"JAPONAIS"` → single entry).
- [ ] 5.2 Implement `GET /api/tags?q=` aggregating all users' tags ranked by frequency then recency with counts and verify counts reflect seeded multi-owner data.
- [ ] 5.3 Add server-side Google endpoints (autocomplete + details/geocode proxy, key never sent to browser) with minimal error mapping and verify with mocked Google response tests.

## 6. Integration check

- [ ] 6.1 Exercise full flow (login → create → list → suggest tags → read as friend → forbidden edit) against a container with seeded data and verify each step's status codes.
