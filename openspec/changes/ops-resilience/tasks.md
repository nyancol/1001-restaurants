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

- [x] 4.1 First pass (2026-11-16): `npm audit` found 5 moderate (one chain
  under OTEL's GCP detector); fixed via `glob ^14.0.2` + `minimatch ^11.0.1`
  overrides (existing esbuild pattern) → 0 vulns; typecheck clean, 104/104
  tests, `npm run build` OK. Majors deferred: better-sqlite3 13, pino 10.
  No open Dependabot PRs. Node v24.22.2 matches mise pin.
- [ ] 4.2 Monthly recurrence: audit, Dependabot, base-image rebuild, tests +
  typecheck + SAST, preprod drill, prod via `main`. Critical CVEs skip the
  queue, same drill expedited.
