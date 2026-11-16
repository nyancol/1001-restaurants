# Tasks: ops-resilience

## 1. Backup (implement now)

- [x] 1.1 Infra: mount `places_places-data:/places-data:ro` in
  `selfhosted-deployments-git/Backups/compose.yaml` + `external: true`
  volume; add `places-in-pi` repo and `places` volume to
  `Backups/provisioning.json` (companion diff, committed in that repo).
- [ ] 1.2 Arcane redeploys Backup stack; create volume/repo/job in zerobyte
  UI (nightly ~04:00, 7 daily + 4 weekly); record job settings in runbook.
- [ ] 1.3 App repo: skill capability 6 (backup & restore runbook),
  `hermes.yaml` backup section, `ops-resilience` spec B1–B3.
- [x] 1.4 Restore rehearsal to empty temp volume + `integrity_check` +
  `/api/health db:ok` (2026-11-16: copied `places_places-data` to scratch
  volume, `integrity_check ok`, 778 places / 2 users, scratch container on
  :5999 served health 200 `db: ok`; temp volume removed afterwards).

## 2. Google quota (next)

- [x] 2.1 App-side counting: daily/month-to-date totals for
  `/api/google/*` + refresh from client spans in skill 1.4 with quota
  line in the RED report template.
- [ ] 2.2 Operator grants GCP Billing API access; budget alert → ops Discord;
  app-side counts remain as cross-check.

## 3. Runner health (next)

- [x] 3.1 Watch `github-runner` container + preview-queue age (`scripts/runner-watch.sh`,
  0/1/2 convention, verified green with no open preview PRs); Discord alert
  per transition; drill by stopping runner (documented in skill capability 7).

## 4. Patching (next)

- [ ] 4.1 Monthly pass: audit, Dependabot, base-image rebuild, tests +
  typecheck + SAST, preprod drill, prod via `main`.
