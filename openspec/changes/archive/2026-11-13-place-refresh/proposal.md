# Proposal

## Why

Place snapshots (hours, business status, Google rating, website) go stale because the app stores them verbatim at save time with no live revalidation. Users and the planned homelab Hermes ops agent both need a way to re-fetch one place's Google details on demand.

## What Changes

- Add `POST /api/places/:id/refresh`: synchronous per-place refresh that re-fetches Google Place Details server-side using the row's stored `googlePlaceId`, rewrites only pure-snapshot columns, bumps `updatedAt`, and returns the updated place.
- Human access: session cookie, owner-only (403 for other owners' rows, mirroring `PATCH`).
- Service access: Pocket ID M2M Bearer JWT (client-credentials grant) accepted on `/api/places` routes only; `POST .../refresh` on any owner's row requires the `refresh:places` permission, enumeration (`GET /api/places`, `GET /api/places/:id`) requires `read:places`. M2M is the only cross-user writer.
- `422` for rows without `googlePlaceId` (manual entries); `503` when Google is not configured; Google upstream failures relayed as `502`/`429` so callers can back off.
- No sweep endpoint, no background jobs, no changes to `/api/google/*` (stays cookie-only proxy) or to user-owned fields (`name`, `address`, `lat`, `lng`, `status`, `placeType`, `tags`, `rating`, `note` are never touched by refresh).

## Capabilities

### New Capabilities

- `place-refresh`: synchronous per-place Google snapshot refresh with dual auth (owner cookie, M2M Bearer) and snapshot-only writes.

### Modified Capabilities

- `places`: adds a snapshot-only write path alongside create/PATCH; clarifies `updatedAt` bumps on refresh and `422` when no `googlePlaceId` is stored.
- `auth`: adds M2M Bearer validation (JWKS signature, `iss`, `aud` = Places API resource, `exp`, required permission) as a second accepted credential on `/api/places` routes; all other `/api/*` remain cookie-only.

## Impact

- API: one new endpoint (`POST /api/places/:id/refresh`); Bearer auth branch in the `/api/*` guard limited to `/api/places*`; Pocket ID config gains Places API resource/audience plus `read:places` + `refresh:places` M2M permissions for the Hermes ops client.
- Code: `src/app.ts` guard, `src/places/routes.ts` (new handler + field allowlist), config for OIDC resource/JWKS, Google details fetch reuse server-side.
- Systems: Hermes agent calls per-place (enumerate with `read:places`, refresh each with `refresh:places`); end-user UI can add a per-place Refresh button later (UI itself out of scope here).
