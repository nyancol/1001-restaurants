# Design: ops-resilience

## Backup path

- Zerobyte and prod `places` share one Docker host, so the prod named volume
  `places_places-data` is mountable into zerobyte as
  `places_places-data:/places-data:ro` with an `external: true` declaration.
  Zerobyte never writes it.
- Provisioning entries mirror the existing convention (org
  `019cce20-…`, REST `http://192.168.1.121:8000`): repository `places-in-pi`
  (`path: places-data`, `isExistingRepository: false` → init on first sync),
  volume `places` (`backend: directory`, `path: /places-data`).
- Provisioning covers volume + repo only (zerobyte limitation). The backup
  **job/schedule** is created once in the UI: source `Places`, repo
  `places-in-pi`, nightly ~04:00 Europe/Paris, retention e.g. 7 daily + 4
  weekly. Runbook records the exact settings so a rebuild reproduces them.
- SQLite consistency: better-sqlite3 runs WAL. Restic snapshots `app.db`,
  `app.db-wal`, `app.db-shm` together — crash-consistent; on restore SQLite
  replays the WAL. Residual tear risk (write mid-snapshot) is accepted for
  homelab scale and mitigated by low-traffic scheduling + mandatory
  `PRAGMA integrity_check` on every restore rehearsal and real restore.

## Google quota path

- Phase 1 (no GCP access needed): count billable upstream calls app-side.
  Every `/api/google/autocomplete|details|geocode` hit and every
  `POST /api/places/:id/refresh` fans out to Google server-side; Loki
  (`span.url.path`) + Tempo give daily counts per endpoint. The weekly RED
  report gains a quota section with month-to-date totals vs the free-tier
  assumption.
- Phase 2 (operator grants GCP): Cloud Billing API budget + quota alerts
  become authoritative; app-side counts stay as the cross-check. No GCP keys
  in the repo — alert destination is the existing ops Discord channel.

## Runner health path

- Watch `github-runner` container state (`docker ps` / Arcane) plus the
  `preprod-preview.yml` run queue: a `preview`-labeled open PR with no
  workflow run in >15 min, or a runner container down, pages Discord.
  Same one-alert-per-transition semantics as Hermes prod watch.
- Meta-watch stays cheap: the check runs from the homelab host cron/Hermes
  schedule, not from the runner itself.

## Patching path

- Monthly: `npm audit`, Dependabot PR review, rebuild against current
  `node:24-slim` (also rebuilds `better-sqlite3` native bindings),
  `npm test` + `npm run typecheck` + SAST green, preprod drill
  (`preprod-deploy` + `preprod-verify` incl. fixture), then prod via `main`.
- Out-of-band: critical CVE in the dependency tree or base image skips the
  queue — same drill, expedited.
