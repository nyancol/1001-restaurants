# ops-resilience deltas

## ADDED Requirements

### Requirement: Places SQLite is backed up nightly via zerobyte

Zerobyte SHALL mount prod `places_places-data` at `/places-data:ro` and run
a nightly backup job of source `Places` to the Pi REST repo `places-data`
(~04:00 Europe/Paris, 7 daily + 4 weekly retention). The job covers
`app.db` + `-wal` + `-shm` as one snapshot set.

#### Scenario: Fresh snapshot exists each morning

- **WHEN** the nightly job runs
- **THEN** the repo holds a snapshot younger than 26h containing all three
  SQLite files, visible in the zerobyte UI/API.

#### Scenario: Preprod data is never backed up as prod

- **WHEN** any backup job runs
- **THEN** only `places_places-data` is in scope; `places-preprod-data` is
  excluded (ephemeral, reseedable).

### Requirement: Restore is rehearsed and documented

Restore SHALL be: stop `places`, restore snapshot into the volume, run
`PRAGMA integrity_check`, start `places`, verify `GET /api/health` returns
200 with `db: ok`. A rehearsal to an empty temp volume SHALL succeed before
the backup is trusted, and yearly after.

#### Scenario: Rehearsal passes

- **WHEN** a snapshot is restored to a temp volume and served by a scratch
  container
- **THEN** `integrity_check` returns `ok` and health reports `db: ok` with
  the expected place count.

#### Scenario: Real restore recovers prod

- **WHEN** prod `/data` is lost or corrupt and the operator orders restore
- **THEN** the agent stops the app, restores the newest green snapshot,
  checks integrity, restarts, and posts health + version evidence.

### Requirement: Backup freshness is verified on demand, never polled

Zerobyte owns the nightly schedule and its own failure notifications; no
Hermes/cron polling SHALL exist for backups. The agent SHALL verify
freshness (newest snapshot younger than 26h, all three SQLite files
present) on demand: before any rollback, in the weekly RED report, or
whenever asked.

#### Scenario: Stale snapshot is reported without auto-alerting

- **WHEN** an on-demand check finds no fresh snapshot
- **THEN** the agent reports repo, last-good snapshot age, and the job
  error, and fixes the job in zerobyte — with no automatic alerts and no
  restore.

### Requirement: Google spend is counted app-side against per-SKU free caps

Project `mapstr-514323` (Places API New: per-SKU monthly free caps, no $200
cushion). The agent SHALL report month-to-date billable Google calls from
Tempo client spans in the weekly RED report, with `details` + `refresh`
counted together against the shared Place Details Enterprise cap (1,000
free/mo, $20/1k — both masks carry Enterprise trigger fields, none from
Enterprise+Atmosphere). Thresholds are 70% watch / 90% urgent per SKU cap.
When the operator grants GCP access, a Cloud Billing budget alert becomes
the authoritative guard and app-side counts remain as cross-check.

#### Scenario: Usage trend is visible without GCP access

- **WHEN** the weekly report runs
- **THEN** it includes per-SKU call totals and cap percentages (Enterprise
  cap shared by details+refresh; one full sweep ≈ 78% of it).

#### Scenario: Budget alert fires on GCP side

- **WHEN** usage crosses a threshold (or the GCP budget alert fires)
- **THEN** Discord receives the alert and the agent correlates it with
  the app-side call breakdown to name the driving endpoint.

### Requirement: Runner health is watched

A `preview`-labeled open PR with no workflow run in >15 min, or a down
`github-runner` container, SHALL alert Discord once per transition with a
recovery notice on return.

#### Scenario: Stalled preview alerts

- **WHEN** the queue check finds a labeled PR with no run
- **THEN** it posts the PR, label time, and runner state.

### Requirement: Monthly patching with preprod drill

Each month the agent SHALL review `npm audit` + Dependabot, rebuild on the
current `node:24-slim` (refreshing `better-sqlite3` bindings), require
`npm test` + `typecheck` + SAST green, drill on preprod
(`preprod-deploy` + `preprod-verify`), then ship via `main`. Critical CVEs
skip the queue with the same drill expedited.

#### Scenario: Patch train ships

- **WHEN** the monthly pass completes
- **THEN** preprod verifies green and prod advances via `main` with version
  evidence posted.
