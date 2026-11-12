# Places Ops Skill (Hermes)

Batch operation skill for the 1001-restaurants app: enumerate every user's
places and refresh each one's Google snapshot via the M2M service API.

The app endpoint (`POST /api/places/:id/refresh`) is synchronous and
per-place. Hermes owns the loop; the app owns the Google calls. There is no
sweep endpoint and no job polling — one HTTP call per place.

## Required env vars (Hermes host only)

| Var | Secret? | Meaning | Example |
|---|---|---|---|
| `POCKET_ID_URL` | no | Pocket ID instance base URL (no trailing slash) | `https://id.example.com` |
| `PLACES_OPS_CLIENT_ID` | no | OIDC client ID of the Hermes client in Pocket ID | `b7f3...` |
| `PLACES_OPS_CLIENT_SECRET` | **yes** | OIDC client secret. `0600` file or homelab vault. Never log, never commit | — |
| `PLACES_API_RESOURCE` | no | Exact Places API resource from Pocket ID (Administration → APIs). Must equal the app's `PLACES_API_RESOURCE` character-for-character | `https://places.1001-restaurants.homelab` |
| `PLACES_APP_BASE_URL` | no | App base URL (no trailing slash) | `https://places-app.example.com` |

Fail fast if any var is unset. Never prompt for the secret, never print it.
The Pocket ID client must be **confidential** with **Client access (M2M)**
granted for `read:places` + `refresh:places` on the Places API. Public
clients cannot use M2M.

## 1. Mint an access token (client-credentials grant)

```bash
RESP=$(curl -sS --request POST "$POCKET_ID_URL/api/oidc/token" \
  --form "grant_type=client_credentials" \
  --form "client_id=$PLACES_OPS_CLIENT_ID" \
  --form "client_secret=$PLACES_OPS_CLIENT_SECRET" \
  --form "resource=$PLACES_API_RESOURCE" \
  --form "scope=read:places refresh:places")
TOKEN=$(printf '%s' "$RESP" | jq -r '.access_token')
```

- `resource=` must exactly equal `PLACES_API_RESOURCE` — it becomes the
  token's `aud`, which the app enforces. A trailing-slash mismatch 401s
  everything.
- Request both scopes in one token: `read:places` for enumeration,
  `refresh:places` for the refresh calls.
- Cache `$TOKEN` until `exp − 60s`. On any `401` from the app, discard it,
  mint once more, retry the failed call once — then abort instead of looping.

## 2. Enumerate all places (M2M is the only cross-user reader)

```bash
curl -sS "$PLACES_APP_BASE_URL/api/places?owner=all" \
  -H "Authorization: Bearer $TOKEN"
# → { "places": [ { "id": "...", "ownerId": "...",
#                   "googlePlaceId": "ChIJ..." | null, ... } ] }
```

Keep rows with a non-null `googlePlaceId`. Rows with `null` are manual
entries with nothing to refresh — skip them (the API would answer `422`).

## 3. Refresh each place (sequential or max ~2–3 concurrent)

```bash
curl -sS -X POST "$PLACES_APP_BASE_URL/api/places/<id>/refresh" \
  -H "Authorization: Bearer $TOKEN"
# → 200 + updated place (snapshot rewritten, updatedAt bumped,
#     user fields untouched)
```

Each call costs one Google lookup server-side, so stay gentle: sequential is
fine for a friends-group dataset; never fan out wide.

## 4. Per-row outcome handling

| Response | Meaning | Action |
|---|---|---|
| `200` | Snapshot rewritten | Record fresh `googleRating` / `businessStatus`, continue |
| `422` | Manual entry, no `googlePlaceId` | Skip — not an error (filter these out in step 2) |
| `404` | Row deleted mid-sweep | Skip, continue |
| `429` | Google rate limit | Back off (`Retry-After` if present, else 30–60s), retry that id once |
| `502` / `503` | Google/key problem | Retry once later; if persistent, abort sweep and alert |
| `401` | Token expired/invalid | Mint fresh token, retry once |
| `403` | Missing scope | Setup bug (wrong grants in Pocket ID Access tab) — stop and fix grants, do not retry |

Summarize at the end: `refreshed=N skipped_manual=N failed=N (ids)`.

## 5. Scheduling

Nightly or weekly is plenty — snapshots decay slowly. Refresh is idempotent,
so re-running a sweep is always safe.

## Quick smoke test

1. Token call returns a JWT whose `aud` is the resource and whose `scope`
   contains both permissions.
2. `GET /api/places?owner=all` with the token → `200` with all users' places.
3. `POST` refresh on one known-`googlePlaceId` row → `200`, snapshot changes.
4. Same refresh with a `read:places`-only token → `403` (scope enforcement works).

## What NOT to do

- Never use these credentials in a browser or send the ID token to the API —
  only the access token, as `Authorization: Bearer`.
- Never call `POST /api/places`, `PATCH`, or `DELETE` with this token — M2M is
  rejected there (`403`) by design. The refresh endpoint is the only writer.
- Never touch `/api/google/*` with this token — it stays cookie-only.
