# In my Belly

[![CI](https://github.com/nyancol/1001-restaurants/actions/workflows/ci.yml/badge.svg)](https://github.com/nyancol/1001-restaurants/actions/workflows/ci.yml)
[![SAST](https://github.com/nyancol/1001-restaurants/actions/workflows/sast.yml/badge.svg)](https://github.com/nyancol/1001-restaurants/actions/workflows/sast.yml)
[![Release](https://github.com/nyancol/1001-restaurants/actions/workflows/release.yml/badge.svg)](https://github.com/nyancol/1001-restaurants/releases)
[![License: MIT](https://img.shields.io/github/license/nyancol/1001-restaurants)](LICENSE)
[![Node](https://img.shields.io/badge/node-26.13.1-43853d?logo=node.js&logoColor=white)](mise.toml)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-%23FE5196?logo=conventionalcommits&logoColor=white)](https://www.conventionalcommits.org)

Foundation service for the In my Belly restaurant memory app: Fastify + TypeScript API
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

## Shipping: feature branch → prod

```bash
mise run setup              # once per clone: enables versioned git hooks (.githooks/)
git checkout -b feat/<name> # branch from main (same-repo branches only — forks can't use preprod)
# ... hack, then:
mise run check              # typecheck + lint + format:check + tests (coverage gate); mirrors CI
git commit -m "feat(api): ..."  # Conventional Commits, enforced by .githooks/commit-msg
git push -u origin feat/<name>
```

1. **Open a PR to `main`.** `ci.yml` runs on every PR/push: typecheck, lint,
   format check, tests with coverage thresholds, production build, `npm audit`
   (high+), betterleaks secret scan, and a Dockerfile build. `sast.yml` runs
   Semgrep. Keep the PR green before review.
2. **Preview on preprod (optional).** Add the `preview` label to the PR —
   `preprod-preview.yml` deploys the PR head to the single staging slot
   (`places-staging`, http://localhost:5174 /
   https://places-staging.patates.club) and posts a `[PREVIEW]` GREEN/RED
   comment with verify output. One slot only: claiming it evicts the previous
   owner (fresh DB on claim). Removing the label or closing the PR tears the
   slot down if your branch owns it. Local equivalent: `mise run preprod-up`
   / `preprod-verify` / `preprod-down` (see `mise.toml`, `compose.preprod.yaml`,
   `hermes.yaml`).
3. **Merge to `main`.** Squash or merge — keep Conventional Commit subjects so
   history stays readable. Merging a preview PR frees the slot.
4. **Prod deploys itself.** Arcane polls `main` (~every 5m), pulls, rebuilds,
   and restarts `places` (https://places.patates.club). Never restart prod
   by hand. If prod goes red, roll back with `git revert <sha>` on `main` +
   push (additive migrations only) — see `rollback:` in `hermes.yaml`.
5. **Cut a release when it matters** (not every merge): update `CHANGELOG.md`,
   `npm version <patch|minor|major>`, `git push origin main --tags`. The
   `release.yml` workflow checks tag == `package.json` + CHANGELOG entry,
   then builds, attaches an SBOM, and publishes the GitHub Release.

Secrets (`.env.dev`, `.env.preprod`, prod env) are never committed —
betterleaks blocks leaks at commit time and in CI.

## Environment

| Var                  | Required              | Default                                     | Purpose                                                                                                                                                                                                             |
| -------------------- | --------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`               | no                    | `3000`                                      | HTTP listen port (`.env.dev` uses `3232`)                                                                                                                                                                           |
| `HOST`               | no                    | `0.0.0.0`                                   | HTTP bind address                                                                                                                                                                                                   |
| `DATABASE_PATH`      | no                    | `/data/app.db`                              | SQLite file (WAL mode). Mount a volume at `/data` in Docker. Override locally, e.g. `./data/app.db`                                                                                                                 |
| `SESSION_SECRET`     | **yes in production** | dev fallback in non-production              | HS256 key for the `oyster_session` cookie (32+ chars). Container exits at boot without it when `NODE_ENV=production`                                                                                                |
| `COOKIE_SECURE`      | no                    | `true` in production, else `false`          | Set `false` behind HTTP-only dev; keep default behind TLS proxy                                                                                                                                                     |
| `OIDC_ISSUER`        | for login             | —                                           | PocketID issuer URL, e.g. `https://id.example.com`                                                                                                                                                                  |
| `OIDC_CLIENT_ID`     | for login             | —                                           | PocketID client id                                                                                                                                                                                                  |
| `OIDC_CLIENT_SECRET` | for login             | —                                           | PocketID client secret (empty allowed only for public clients)                                                                                                                                                      |
| `OIDC_REDIRECT_URI`  | no                    | `http://localhost:<PORT>/api/auth/callback` | Must match the PocketID client registration                                                                                                                                                                         |
| `GOOGLE_PLACES_KEY`  | for Google proxy      | —                                           | Server-side Google key (never sent to the browser). Endpoints return `503 google_not_configured` without it                                                                                                         |
| `TRUST_PROXY`        | no                    | `true`                                      | Trust `X-Forwarded-Proto/Host` from the homelab reverse proxy                                                                                                                                                       |
| `DEV_LOGIN`          | no                    | `false`                                     | **Development only.** Set `true` with a non-production `NODE_ENV` to register `POST /api/auth/dev-login`, which mints a test session without OIDC. Forced off in production (route returns `404` there even if set) |

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
docker build -t places .
docker run -d --name places \
  -p 3000:3000 \
  -v places-data:/data \
  -e SESSION_SECRET='<32+ chars>' \
  -e OIDC_ISSUER='https://id.example.com' \
  -e OIDC_CLIENT_ID='<client-id>' \
  -e OIDC_CLIENT_SECRET='<secret>' \
  -e OIDC_REDIRECT_URI='https://app.example.com/api/auth/callback' \
  -e GOOGLE_PLACES_KEY='<key>' \
  places
curl localhost:3000/api/health
```

Image notes: single image, runs as non-root `app`, `NODE_ENV=production`,
SQLite WAL file at `/data/app.db` (persist via the `/data` volume). Migrations
run automatically at container start; `/api/health` reports `db: ok` once applied.

## API (`/api/v1`, except health/auth)

- `GET /api/health` (public, unversioned) → `{status, db, time}`
- `GET /api/v1/openapi.json` (public) → generated OpenAPI (`info.version` = `package.json` version)
- `POST /api/auth/dev-login` (dev only, double-gated) → `{id, displayName}`, sets `oyster_session`. Example: `curl -X POST localhost:3000/api/auth/dev-login -H 'Content-Type: application/json' -d '{"user":"alice"}'`
- `GET /api/auth/login` → redirect to PocketID (503 when OIDC unconfigured)
- `GET /api/auth/callback` → code+PKCE exchange, user upsert by `sub`, sets `oyster_session` cookie (`HttpOnly/Secure/SameSite=Lax`)
- `POST /api/auth/logout`, `GET /api/auth/me`
- `POST /api/v1/places` (owner forced to session user; `status` defaults `WANT_TO_GO`; `rating` 0–5 or null; tags normalized)
- `GET /api/v1/places?owner=me|all|<userId>&status=&tags=&q=&price=&limit=&cursor=` → `{ data, pagination: { limit, nextCursor, total } }` in `(updatedAt DESC, id DESC)` order (defaults to own; each place includes `ownerDisplayName`; `openAt/openNow` may short-fill pages)
- `GET /api/v1/users?limit=&cursor=` → `{ data, pagination }` sorted by display name (all app users are friends)
- `GET/PATCH/DELETE /api/v1/places/:id` (read-any, edit-own → `403` for others)
- `GET /api/v1/tags?q=&limit=&cursor=` → `{ data, pagination }` (frequency then recency, counts)
- `GET /api/v1/google/autocomplete?q=` (Places API New, `POST places:autocomplete` upstream; optional `sessionToken` for session billing), `GET /api/v1/google/details?placeId=` (Places API New, minimal field masks), `GET /api/v1/google/geocode?address=`

All `/api/v1/*` except `/api/v1/openapi.json` require a session (or M2M Bearer on `GET /api/v1/places*`) and
return `401` without one. Legacy unversioned `/api/places|tags|users|google|openapi.json` return `404`.

## Telemetry (OTEL → homelab LGTM, prod only)

The service ships traces, metrics, and correlated logs via OTLP/HTTP to the
homelab `lgtm` stack (`grafana/otel-lgtm`) over the external `telemetry`
Docker network. Preprod/dev export nothing.

| Var                           | Required               | Default                        | Purpose                                                                                                                                                    |
| ----------------------------- | ---------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | prod only (via Arcane) | — (unset = telemetry disabled) | e.g. `http://lgtm:4318`. Presence of a valid `http(s)` URL is the switch — `NODE_ENV` is `production` in both prod and preprod, so it cannot be the switch |
| `OTEL_SERVICE_NAME`           | no                     | `places`                       | `service.name` on every signal                                                                                                                             |
| `DEPLOYMENT_ENVIRONMENT`      | no                     | `NODE_ENV`                     | `deployment.environment` (`production` in prod)                                                                                                            |
| `OTEL_SERVICE_VERSION`        | no                     | `package.json` version         | `service.version` — bump with `npm version` on release; explicit value wins (`unknown` is treated as unset)                                                |

- Activation is fail-open: the SDK starts before instrumented imports
  (`src/observability/register.ts` is the first import in `src/index.ts`);
  exporter errors, timeouts, or an unreachable collector never fail requests
  or prevent boot, and shutdown flush is capped at 5s. Rollback = unset
  `OTEL_EXPORTER_OTLP_ENDPOINT` and redeploy.
- `GET /api/health` is excluded from trace export (Docker/Caddy noise).
- Redaction (both stdout JSON and OTLP): `cookie`, `authorization`,
  `set-cookie` headers and any `*secret*` / `*token*` / `*key*` field
  (covers `SESSION_SECRET`, `OIDC_CLIENT_SECRET`, `GOOGLE_PLACES_KEY`,
  `X-Goog-Api-Key`, bearer tokens) are replaced with `[Redacted]` via
  `PINO_REDACT_PATHS` (`src/observability/logger.ts`) plus
  `sanitizeAttributes()` on span/log attributes
  (`src/observability/sanitize.ts`). Metric views keep only
  `http.request.method`, `http.route`, `http.response.status_code` (+ `url.scheme`, `server.address`; never concrete URL paths).
- Sampling: none — 100% of non-excluded signals are exported.

Arcane rollout: attach `places` to the external `telemetry` network (from
`compose.yaml` in git), set the vars above in the Arcane prod `.env`
(`OTEL_EXPORTER_OTLP_ENDPOINT=http://lgtm:4318`,
`OTEL_SERVICE_NAME=places`, `DEPLOYMENT_ENVIRONMENT=production`;
leave `OTEL_SERVICE_VERSION` unset to use the automatic `package.json`
version), redeploy. Verify in Grafana (`:3001`):
Tempo `service.name=places`, Loki `{service_name="places"}`, Mimir
`http.server.duration`.

## Tests

```bash
npm test          # vitest with V8 coverage gate (thresholds in vitest.config.ts)
npm run typecheck # tsc --noEmit
npm run lint      # eslint (JS core rules; types via tsc — see eslint.config.mjs)
npm run format:check # prettier --check . (write with `npm run format`)
mise run check   # all four gates, mirrors CI verify job
```

Commits must follow [Conventional Commits](https://www.conventionalcommits.org/)
(`feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert`), enforced by
`.githooks/commit-msg`. See `CHANGELOG.md` (Keep a Changelog).

## Releases

```bash
npm version <patch|minor|major>  # bumps package.json, update CHANGELOG.md, commits + tags vX.Y.Z
git push origin main --tags      # .github/workflows/release.yml verifies tag == package.json,
                                 # CHANGELOG entry exists, builds, attaches SBOM, publishes GitHub Release
```
