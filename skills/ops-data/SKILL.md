# Places Data Skill

Google snapshot refresh sweeps and SQLite backup / restore. These are the
only writers to app data outside the app itself — and both stay narrow:
the refresh endpoint rewrites snapshots only, restores replace the prod
volume only on explicit order.

## Part 1 — Ad-hoc Google refresh sweep

One HTTP call per place; the
agent owns the loop, the app owns the Google calls. There is no sweep
endpoint and no job polling.

### Required env vars

| Var | Secret? | Meaning | Example |
|---|---|---|---|
| `POCKET_ID_URL` | no | Pocket ID base URL (no trailing slash) | `https://id.example.com` |
| `PLACES_OPS_CLIENT_ID` | no | OIDC client ID of the ops client | `b7f3...` |
| `PLACES_OPS_CLIENT_SECRET` | **yes** | OIDC client secret. `0600` file or vault. Never log, never commit | — |
| `PLACES_API_RESOURCE` | no | Exact Places API resource from Pocket ID (Administration → APIs). Must equal the app's value character-for-character | `https://places.1001-restaurants.homelab` |
| `PLACES_APP_BASE_URL` | no | App base URL (no trailing slash) | `https://places-app.example.com` |

Fail fast if any var is unset. Never prompt for the secret, never print it.
The Pocket ID client must be **confidential** with **Client access (M2M)**
granted for `read:places` + `refresh:places` on the Places API.

### Mint an access token (client-credentials grant)

```bash
RESP=$(curl -sS --request POST "$POCKET_ID_URL/api/oidc/token" \
  --form "grant_type=client_credentials" \
  --form "client_id=$PLACES_OPS_CLIENT_ID" \
  --form "client_secret=$PLACES_OPS_CLIENT_SECRET" \
  --form "resource=$PLACES_API_RESOURCE" \
  --form "scope=read:places refresh:places")
TOKEN=$(printf '%s' "$RESP" | jq -r '.access_token')
```

* `resource=` must exactly equal `PLACES_API_RESOURCE` — it becomes the
  token's `aud`, enforced by the app. A trailing-slash mismatch 401s
  everything.
* Cache `$TOKEN` until `exp − 60s`. On any `401` from the app, discard it,
  mint once more, retry the failed call once — then abort instead of
  looping.

### Enumerate all places (M2M is the only cross-user reader)

```bash
curl -sS "$PLACES_APP_BASE_URL/api/places?owner=all" \
  -H "Authorization: Bearer $TOKEN"
# → { "places": [ { "id": "...", "ownerId": "...",
#                   "googlePlaceId": "ChIJ..." | null, ... } ] }
```

Keep rows with a non-null `googlePlaceId`. Rows with `null` are manual
entries with nothing to refresh — skip them (the API would answer `422`).

### Refresh each place (sequential or max ~2–3 concurrent)

```bash
curl -sS -X POST "$PLACES_APP_BASE_URL/api/places/<id>/refresh" \
  -H "Authorization: Bearer $TOKEN"
# → 200 + updated place (snapshot rewritten, updatedAt bumped,
#     user fields untouched)
```

Each call costs one Google lookup server-side — stay gentle, never fan out
wide. One full sweep = ~778 calls (78% of the Enterprise quota cap) —
sweeps stay rare and deliberate; count its quota impact per the
`ops-observe` skill.

### Per-row outcome handling

| Response | Meaning | Action |
|---|---|---|
| `200` | Snapshot rewritten | Record fresh `googleRating` / `businessStatus`, continue |
| `422` | Manual entry, no `googlePlaceId` | Skip — not an error (filter these out above) |
| `404` | Row deleted mid-sweep | Skip, continue |
| `429` | Google rate limit | Back off (`Retry-After` if present, else 30–60s), retry that id once |
| `502` / `503` | Google/key problem | Retry once later; if persistent, abort sweep and report |
| `401` | Token expired/invalid | Mint fresh token, retry once |
| `403` | Missing scope | Setup bug (Pocket ID grants) — stop and report, do not retry |

Summarize at the end: `refreshed=N skipped_manual=N failed=N (ids)`. If the
sweep ran because of a RED finding, mention the correlation in the summary.

### Smoke test (first run or after config change)

1. Token call returns a JWT whose `aud` is the resource and whose `scope`
   contains both permissions.
2. `GET /api/places?owner=all` with the token → `200` with all users' places.
3. `POST` refresh on one known-`googlePlaceId` row → `200`, snapshot changes.
4. Same refresh with a `read:places`-only token → `403` (scope enforcement
   works).

### What NOT to do

- Never use these credentials in a browser or send the ID token to the API —
  only the access token, as `Authorization: Bearer`.
- Never call `POST /api/places`, `PATCH`, or `DELETE` with this token — M2M
  is rejected there (`403`) by design. The refresh endpoint is the only
  writer.
- Never touch `/api/google/*` with this token — it stays cookie-only.

---

## Part 2 — Backup & restore (zerobyte → Pi REST)

Prod SQLite (`places_places-data`, WAL mode) is snapshotted nightly by
zerobyte (see `hermes.yaml:backup`). Restore procedure (restores run ONLY
on explicit order) plus freshness verification: before any rollback, in
the weekly RED report, or whenever asked.

### Freshness check

- Fresh = newest snapshot for source `Places` in repo `places-in-pi` is
  younger than 26h and contains `app.db` (+ `-wal`/`-shm`). Check in the
  zerobyte UI (https://backup.patates.club) snapshot list.
- If stale or failing: state repo, last-good snapshot age, and the
  job error — then fix the job in zerobyte.

### Restore

```bash
docker stop places
# in zerobyte UI: restore newest green snapshot of `Places` into places_places-data
docker start places
# integrity + health:
docker exec places node -e "const D=require('better-sqlite3');const db=D('/data/app.db',{readonly:true});console.log(db.prepare('PRAGMA integrity_check').get());db.close()"
curl -sS https://places.patates.club/api/health  # want 200 {"status":"ok","db":"ok",...}
```

- Rehearsal first (before trusting a new repo, yearly after): restore to an
  empty temp volume, serve with a scratch container, `integrity_check` =
  `ok` + health `db: ok` + expected place count.
- `places-preprod-data` is never a restore source or target for prod.
- Report only counts and verdicts; never dump row contents beyond what the
  API already exposes.

### What NOT to do

- Never restore without an explicit order; without one: produce the
  assessment and prepare
  the exact restore steps, do not execute them.
- Never restore a snapshot that failed `integrity_check` without flagging
  it and proposing the previous snapshot instead.
- Never copy prod data into preprod outside the documented demo reseed.
