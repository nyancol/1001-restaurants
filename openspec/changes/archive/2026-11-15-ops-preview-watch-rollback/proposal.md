# Proposal

## Why

Production deploys are now GitOps (Arcane polls `main`, pulls, builds, restarts), but preprod has no defined purpose, prod has no watcher, and rollback is ad-hoc. A single-slot preprod for requestor validation plus a Hermes-based watch/alert + git-revert rollback loop makes `main`-to-prod safe without adding infrastructure.

## What Changes

- Defines preprod as one ephemeral preview slot (B1): single container `places-staging:5173`, single volume `places-preprod-data`, single staging URL; each deployment reseeds a fresh demo DB; concurrent requests queue — second deploy without explicit evict confirm is refused.
- Defines prod as Arcane-owned: the agent never builds/restarts prod; it verifies (`/api/health` db:ok, running version == `main` HEAD, OIDC discovery ok, no sustained 5xx, OTEL visible) and prepares rollbacks.
- Adds Hermes scheduled watch: poll prod health + version, post evidence-backed Discord alerts (one alert per state change, no spam), post recovery notice.
- Adds git-revert-only rollback runbook: on explicit operator order the agent reverts the offending commit on `main` and pushes so Arcane heals; guarded by a migration-safety pre-check (additive migrations only).
- Adds `hermes.yaml` reference contract in this repo (poll target, cadence, thresholds, channel, deploy command) so Hermes config drift is reviewable.
- Extends `skills/ops/SKILL.md` with preview-deploy, prod-watch, and rollback capabilities plus Discord message templates; relaxes the secrets rule to may-read-env-for-validation, never-print/commit/forward.
- Adds a minimal demo seed (fixture or script) so "fresh DB" means demoable, not blank.
- Normalizes tier port mappings: dev keeps `3232` (API) + `5173` (vite HMR); preprod keeps internal `5173` (Caddy `:8092 -> places-staging:5173` untouched) but moves host publish to `5174` so vite and preprod coexist; prod drops vestigial `HOST_PORT` (base `compose.yaml` only `expose:`s) and declares its canonical `PORT`/Caddy-target pair in `hermes.yaml` with a `PORT == Caddy target` assertion.
- Acceptance is drill evidence: deploy happy path, slot-contention refusal, watch/alert on induced preprod failure, dry-run revert construction.

## Capabilities

### New Capabilities

- `ops-lifecycle`: tier-segregated operations for the places app — single-slot preprod preview lifecycle with fresh demo seed and queue/evict rules; prod health + version watch with Hermes schedule and Discord alerts; git-revert-on-main rollback on explicit order with migration-safety guard; `hermes.yaml` contract; green definitions per tier and drill acceptance.

### Modified Capabilities

(none — `observability` and `auth` behaviors are unchanged; this change only operates around them)

## Impact

- Repo: new `hermes.yaml`, extended `skills/ops/SKILL.md`, new seed fixture/script, one `mise run preprod-deploy` wrapper if needed; `compose.preprod.yaml` host publish moves to `5174`, prod `.env` drops `HOST_PORT`; no change to Caddy routes, PocketID clients (shared client kept), or Arcane polling.
- Systems: preprod container/volume reused per preview; prod `/data` volume untouched by the agent; Discord channel gains alert traffic; Hermes gains a scheduled polling activity.
- Secrets: agent may read `.env.preprod` and the Arcane-managed prod `.env` for validation; must never print, commit, or forward secret values.
