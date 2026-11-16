# Proposal: ops-resilience (backup, quota, runner, patching)

## Why

Prod `places` has no backup, no Google spend guard, no self-hosted runner
watch, and no patching cadence. A single host loss or SQLite corruption is
currently unrecoverable (rollback spec even references a backup that does not
exist). Google Places API (New) + Geocoding is pay-as-you-go past the free
tier; the homelab assumes usage stays inside free monthly credits with no
verification. The preprod preview loop and any future CI depend on one
self-hosted runner with no health signal. Base image (node:24-slim) and npm
deps float without a scheduled update pass.

## What Changes

- **Backup (implemented now):** zerobyte mounts prod named volume
  `places_places-data` at `/places-data:ro` (infra repo `Backups/compose.yaml`
  + `provisioning.json` already edited, uncommitted); nightly backup job to
  the Pi REST repo `places-data`; restore + verify runbook in skill capability
  6 and `hermes.yaml:backup`; spec `ops-resilience` requirements B1–B3.
- **Google quota (planned):** app-side call counting from Loki/Tempo for
  `/api/google/*` + refresh endpoint immediately; Cloud Billing API budget
  alert as the authoritative guard (operator grants access); spec Q1–Q2.
- **Runner health (planned):** Hermes-style watch on the `github-runner`
  container + queue depth; Discord alert when the runner is down or a
  `preview`-labeled PR waits with no run; spec R1.
- **Patching (planned):** monthly cadence — `npm audit` + Dependabot review,
  `node:24` rebuild, `better-sqlite3` native rebuild check, SAST triage;
  preprod drill before prod; spec P1.

## Capabilities

### New Capabilities

- `ops-resilience`: backup/restore evidence, Google spend guard, runner
  health, patching cadence for the places stack.

### Modified Capabilities

- `ops-lifecycle`: rollback BLOCK path ("restore `/data` from backup") now
  resolves to the zerobyte procedure instead of a nonexistent backup.

## Impact

- Infra repo (`selfhosted-deployments-git/Backups`): compose mount +
  provisioning entries (this change's companion diff, committed separately
  there since Arcane owns that stack).
- App repo: `skills/ops/SKILL.md` capability 6, `hermes.yaml` backup section,
  `openspec/specs/ops-resilience/spec.md`. No app code changes; no prod
  deploys; backup job schedule itself is created in the zerobyte UI
  (provisioning does not support jobs).
- Secrets: no new secrets; restore procedure never prints backup contents
  beyond row counts and `integrity_check` verdict.
