# Design

## Context

See proposal.md Why. Current state: `src/app.ts` guards all `/api/*` with the `oyster_session` cookie; `src/places/routes.ts` forces `ownerId` from the session and 403s cross-owner PATCH/DELETE; Google details are fetched via the cookie-only proxy in `src/google/routes.ts` (server key + narrow field mask) and mapped client-side by `parseDetails` in `web/src/lib/api.ts`. Rows carry nullable `google_place_id` (manual entries have none) with dedup on `(ownerId, googlePlaceId)`. Specs: reads never revalidate; `updatedAt` bumps on every write.

## Goals / Non-Goals

**Goals:**
- One synchronous refresh door usable by both humans (owner-only) and Hermes (cross-user, scoped).
- Snapshot-only writes enforced structurally, not by convention.
- Least-privilege M2M scopes that read honestly on the Pocket ID Access tab.

**Non-Goals:**
- No sweep-all endpoint, no background jobs/polling, no `refreshedAt` column.
- No UI work (a per-place Refresh button consumes this API later).
- No changes to `/api/google/*`, `PATCH` semantics, or user-field handling.
- No Hermes skill implementation (separate homelab concern).

## Decisions

- **Endpoint: `POST /api/places/:id/refresh` (sync, per-row).** Loads by local `id` (404 if missing), takes the row's `googlePlaceId` as the Google query key, fetches details server-side with the existing details field mask, maps with the same rules as `parseDetails`, updates snapshot columns + `updatedAt`, returns the updated place. Sync keeps agent logic trivial (loop + per-row retry) and avoids job infrastructure; per-row keeps latency bounded (~1 Google call each).
- **Dual auth in the existing `onRequest` guard.** If `Authorization: Bearer` is present on a `/api/places*` path, validate as M2M (JWKS signature, `iss` = Pocket ID URL, `aud` contains the Places resource, `exp`, required scope) and attach `servicePrincipal { clientId, scopes }`; otherwise fall through to the cookie path. Non-Places routes ignore Bearer entirely (cookie still required). Alternative (separate Fastify instance/prefix for ops) rejected: one surface keeps route policy in one place and avoids CORS/cookie duplication.
- **Policy split: cookie = owner-only, M2M = `refresh:places` = any owner.** Human path reuses the `PATCH` ownership check (`ownerId == userId`, else 403). M2M path skips ownership but requires the scope; `GET` enumeration requires `read:places`. Alternatives (allow any human to refresh any row since "facts are shared") rejected: it would let user A churn user B's sort order.
- **Snapshot-only allowlist: `hoursJson, businessStatus, priceLevel, priceRangeJson, googleRating, googleRatingCount, websiteUri, mapsLinksJson, utcOffsetMinutes` + `updatedAt`.** `googlePlaceId` is the key (never rewritten); `name/address/lat/lng/placeType` stay user-visible even though Google also returns them (preserves renames; accepted staleness documented in specs). Alternative (overwrite `name/address` too) rejected per exploration decision.
- **Error mapping:** no row → `404`; no `googlePlaceId` → `422`; no server Google key → `503` (same as proxy); Google `NOT_FOUND`/retired ID → leave row untouched, return `502` with a machine-readable code; Google `429` → relay as `429` so the agent backs off; auth failures → `401` (bad token) / `403` (missing scope or wrong owner).
- **Scopes: `read:places` + `refresh:places`, Client access (M2M) only.** `refresh:places` never implies full `write:places`; the latter stays unminted for a future true-edit op. Verb-first matches Pocket ID's `read:orders` convention. Human browser never sends scopes.
- **Config: `PLACES_API_RESOURCE` (exact `aud`), Pocket ID `iss`/JWKS URL, tolerance for clock skew.** Validated fail-fast at boot like existing OIDC config; tests inject a static JWKS.

## Risks / Trade-offs

- [Google latency in request path] → Mitigation: per-row sync bounds the blast radius; set an upstream timeout (~10s) and return `502` on timeout so callers retry one row.
- [Agent refresh storm (N parallel POSTs → Google 429 / quota burn)] → Mitigation: relay `429`, document sequential-or-small-concurrency looping in the Hermes skill; no server-side queue in this change.
- [`updatedAt` churn reorders lists after each sweep] → Mitigation: accepted explicitly in specs; sort-dependent UI should expect "recently verified" semantics post-refresh.
- [`aud`/scope check omitted or wrong] → Mitigation: validation helper asserts all five (signature, `iss`, `aud`, `exp`, scope); tests cover wrong-audience and missing-scope tokens.
- [Ops secret is the most powerful credential in the system] → Mitigation: stored only on the Hermes host (env/vault, `0600`), minimal scopes, rotation documented; federated credentials (e.g. Tailscale `tsiam`) as a future upgrade, not this change.
- [Retired Google IDs / permanently-closed places] → Mitigation: never null the key or delete the row on `NOT_FOUND`; surface the error code and leave the snapshot; policy for closed places deferred (snapshot records `businessStatus`, existing open-filter already excludes them).

## Migration Plan

- Deploy: add `PLACES_API_RESOURCE`, Pocket ID issuer/JWKS env; register Places API resource + `read:places`/`refresh:places` under Client access (M2M) for the Hermes client; no DB migration (no schema change); old clients unaffected (new endpoint is additive, existing routes unchanged).
- Rollback: remove endpoint registration / revert guard branch; previously refreshed snapshots remain (fresh data is forward-compatible).
