# 1001-restaurants — Oyster Foundation

Foundation service for the Oyster restaurant memory app: Fastify + TypeScript API
serving a static placeholder page, SQLite persistence (Drizzle + better-sqlite3),
PocketID OIDC login, and the v1 places/tags API.

## Quick start (local)

```bash
npm install
DATABASE_PATH=./data/app.db SESSION_SECRET=dev-only-secret-change-me-32-chars!! PORT=3232 npm run dev
curl localhost:3232/api/health
# {"status":"ok","db":"ok","time":"..."}
```

### Dev with mise (recommended)

```bash
cp .env.sample .env.dev   # once — fill in GOOGLE_PLACES_KEY
mise run dev              # backend on :3232 + Vite UI dev server on :5173 (HMR)
```

`.env.dev` is gitignored; `.env.sample` documents every variable. `mise run dev`
starts both processes: the API backend (with the built UI) on
http://localhost:3232, and the Vite dev server on http://localhost:5173 with
hot-reload — `/api/*` calls from the Vite server are proxied to the backend.
Open http://localhost:5173 for UI work and use **Use dev user** on the login
screen (enabled by `DEV_LOGIN=true`) to sign in without OIDC.

## Environment

| Var | Required | Default | Purpose |
| --- | --- | --- | --- |
| `PORT` | no | `3000` | HTTP listen port (`.env.dev` uses `3232`) |
| `HOST` | no | `0.0.0.0` | HTTP bind address |
| `DATABASE_PATH` | no | `/data/app.db` | SQLite file (WAL mode). Mount a volume at `/data` in Docker. Override locally, e.g. `./data/app.db` |
| `SESSION_SECRET` | **yes in production** | dev fallback in non-production | HS256 key for the `oyster_session` cookie (32+ chars). Container exits at boot without it when `NODE_ENV=production` |
| `COOKIE_SECURE` | no | `true` in production, else `false` | Set `false` behind HTTP-only dev; keep default behind TLS proxy |
| `OIDC_ISSUER` | for login | — | PocketID issuer URL, e.g. `https://id.example.com` |
| `OIDC_CLIENT_ID` | for login | — | PocketID client id |
| `OIDC_CLIENT_SECRET` | for login | — | PocketID client secret (empty allowed only for public clients) |
| `OIDC_REDIRECT_URI` | no | `http://localhost:<PORT>/api/auth/callback` | Must match the PocketID client registration |
| `GOOGLE_PLACES_KEY` | for Google proxy | — | Server-side Google key (never sent to the browser). Endpoints return `503 google_not_configured` without it |
| `TRUST_PROXY` | no | `true` | Trust `X-Forwarded-Proto/Host` from the homelab reverse proxy |
| `DEV_LOGIN` | no | `false` | **Development only.** Set `true` with a non-production `NODE_ENV` to register `POST /api/auth/dev-login`, which mints a test session without OIDC. Forced off in production (route returns `404` there even if set) |

> Dev login is double-gated: the route is registered only when `DEV_LOGIN=true`
> **and** `NODE_ENV != production`. Test identities get `sub = "dev:<name>"`
> (e.g. `dev:alice`) so they are distinguishable from OIDC users, but sessions
> use the identical cookie mechanism — owner scoping and `403` enforcement
> behave the same. Every use is logged server-side as a warning.

Without `OIDC_ISSUER`/`OIDC_CLIENT_ID` the service still boots (health + public
docs work, `/api/auth/login` returns `503`, all other `/api/*` return `401`
without a session). With a bad issuer URL the service **fails fast at boot**
with `Invalid OIDC config: discovery failed for issuer ...` and exits non-zero.

## Docker (documented boot command)

```bash
docker build -t oyster-foundation .
docker run -d --name oyster \
  -p 3000:3000 \
  -v oyster-data:/data \
  -e SESSION_SECRET='<32+ chars>' \
  -e OIDC_ISSUER='https://id.example.com' \
  -e OIDC_CLIENT_ID='<client-id>' \
  -e OIDC_CLIENT_SECRET='<secret>' \
  -e OIDC_REDIRECT_URI='https://app.example.com/api/auth/callback' \
  -e GOOGLE_PLACES_KEY='<key>' \
  oyster-foundation
curl localhost:3000/api/health
```

Image notes: single image, runs as non-root `app`, `NODE_ENV=production`,
SQLite WAL file at `/data/app.db` (persist via the `/data` volume). Migrations
run automatically at container start; `/api/health` reports `db: ok` once applied.

## API

- `GET /api/health` (public) → `{status, db, time}`
- `GET /api/openapi.json` (public) → generated OpenAPI
- `POST /api/auth/dev-login` (dev only, double-gated) → `{id, displayName}`, sets `oyster_session`. Example: `curl -X POST localhost:3000/api/auth/dev-login -H 'Content-Type: application/json' -d '{"user":"alice"}'`
- `GET /api/auth/login` → redirect to PocketID (503 when OIDC unconfigured)
- `GET /api/auth/callback` → code+PKCE exchange, user upsert by `sub`, sets `oyster_session` cookie (`HttpOnly/Secure/SameSite=Lax`)
- `POST /api/auth/logout`, `GET /api/auth/me`
- `POST /api/places` (owner forced to session user; `status` defaults `WANT_TO_GO`; `rating` 0–5 or null; tags normalized)
- `GET /api/places?owner=me|all|<userId>&status=&tags=&q=` (defaults to own)
- `GET/PATCH/DELETE /api/places/:id` (read-any, edit-own → `403` for others)
- `GET /api/tags?q=` (global pool, frequency then recency, counts)
- `GET /api/google/autocomplete?q=` (Places API New, `POST places:autocomplete` upstream; optional `sessionToken` for session billing), `GET /api/google/details?placeId=` (Places API New, minimal field masks), `GET /api/google/geocode?address=`

All `/api/*` except health/login/callback/openapi-docs require a session and
return `401` without one.

## Tests

```bash
npm test          # vitest: 401/403/400 cases, owner scoping, tag counts, mocked Google
npm run typecheck # tsc --noEmit
```
