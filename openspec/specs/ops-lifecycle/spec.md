# Ops-Lifecycle Specification

## Purpose

Tier-segregated operations for the places app: a single-slot preprod preview loop, Hermes-based prod watch with Discord alerts, and git-revert-only rollback, so requestor validation and Arcane auto-deploys stay safe on one homelab host.

## Requirements

### Requirement: Single-slot preprod preview with queue semantics

The system SHALL provide exactly one preprod preview slot (`places-staging:5173`, volume `places-preprod-data`, staging URL); a deploy request naming a branch while the slot is owned by another branch SHALL be refused unless the operator confirms eviction.

#### Scenario: Deploy to free slot succeeds

- **WHEN** the operator requests `preprod-deploy --branch feature-x --fresh-db` and the slot is free
- **THEN** the agent rebuilds the staging container from that branch, reseeds the demo DB, and posts the staging URL plus health and version evidence

#### Scenario: Contended slot is refused without confirm

- **WHEN** the slot is owned by branch-A and a deploy for branch-B arrives without explicit evict confirmation
- **THEN** the agent refuses, states the current owner branch, owner-since time, and last validation, and takes no destructive action

#### Scenario: Confirmed eviction replaces preview

- **WHEN** the operator confirms eviction of branch-A for branch-B
- **THEN** the agent tears down A's preview, deploys B with a fresh DB, and records B as the new slot owner

### Requirement: Fresh demo seed per preview deployment

Each preview deployment with `--fresh-db` SHALL reset the preprod volume to migrated-empty plus a deterministic demo fixture (demo users, places, tags), so a requestor always sees a living app and never another preview's data or prod data.

#### Scenario: Fresh seed is present after deploy

- **WHEN** a preview deploy completes with `--fresh-db`
- **THEN** the staging DB contains exactly the fixture dataset (known count of demo places) and no rows from the previous preview

#### Scenario: Prod data never flows to preprod automatically

- **WHEN** any preview deploy runs
- **THEN** the agent copies nothing from the prod `places-data` volume into preprod

### Requirement: Preprod green definition

A preprod preview SHALL be reported green only when all hold: container UP longer than 30s, staging `GET /api/health` returns 200 with `db: ok`, running version equals the deployed branch HEAD, `GET /api/auth/login` redirects (OIDC discovery ok, not 503), fixture place count matches, and boot logs contain no `Invalid config` lines.

#### Scenario: Preview reported green

- **WHEN** all preprod green signals hold after a deploy
- **THEN** the agent posts a green report with URL, version, health body, and fixture count

#### Scenario: Preview reported red with cause

- **WHEN** any preprod green signal fails
- **THEN** the agent posts a red report naming the failing signal plus the relevant log excerpt

### Requirement: Hermes scheduled prod watch with Discord alerts

Hermes SHALL poll prod `GET /api/health` on the cadence and failure threshold declared in `hermes.yaml`, posting one Discord alert per red transition with evidence and one recovery notice per green return, and SHALL NOT repeat alerts while the state is unchanged.

#### Scenario: Consecutive failures trigger one alert

- **WHEN** prod health fails for the declared consecutive-failure threshold
- **THEN** Hermes posts a single Discord alert containing the health response, running version vs `main` HEAD, and a log tail excerpt

#### Scenario: No alert spam while red persists

- **WHEN** prod remains red after an alert was posted
- **THEN** Hermes posts no further alerts until the state changes to green or a new distinct cause appears

#### Scenario: Recovery posts green notice

- **WHEN** prod health returns to green after a red period
- **THEN** Hermes posts a recovery notice with the restored version and time-to-green

### Requirement: Prod green definition

Prod SHALL be reported green only when all hold: `GET /api/health` returns 200 with `db: ok`, running version equals `main` HEAD, boot logs show OIDC discovery ok, no sustained 5xx on places CRUD, and OTEL signals for the running version are visible in LGTM (a signal gap with steady 200s indicates exporter break, not health).

#### Scenario: Stale version is prod-red

- **WHEN** the container is healthy but its version differs from `main` HEAD after an Arcane poll window
- **THEN** the watch reports red with cause `version-stuck` and the expected vs running versions

#### Scenario: OIDC misconfiguration is prod-red

- **WHEN** boot logs contain OIDC discovery failure or `/api/auth/login` returns 503 while OIDC is expected
- **THEN** the watch reports red with cause `oidc-config` and the log excerpt

### Requirement: Git-revert rollback on explicit order only

Rollback SHALL be performed only as `git revert` of the offending commit on `main` followed by push (so Arcane redeploys), only on explicit operator order, and only after a migration-safety pre-check passes (reverted migrations are additive-only and replay safely).

#### Scenario: Ordered rollback executes

- **WHEN** the operator orders rollback of a commit and the migration-safety check passes
- **THEN** the agent creates the revert commit, pushes `main`, and verifies prod green (version advances to the revert commit)

#### Scenario: Rollback without order is refused

- **WHEN** the watch detects prod-red but no operator order exists
- **THEN** the agent alerts and prepares the exact revert commands without executing them

#### Scenario: Unsafe migration blocks rollback

- **WHEN** the offending commit contains a destructive migration (drop/rename/rewrite outside the additive replay rule)
- **THEN** the agent refuses automatic revert and reports the blocking migration with a manual recovery proposal

### Requirement: Tier port mapping without host conflicts

Dev SHALL keep API `3232` plus vite HMR `5173`; preprod SHALL keep internal `5173` (matching Caddy `places-staging:5173`) while publishing host `5174` so vite and preprod coexist; prod SHALL publish no host port and SHALL keep its container `PORT` equal to its Caddy target, with both declared in `hermes.yaml`.

#### Scenario: Dev and preprod run together

- **WHEN** `mise run dev` (vite on host `5173`) and the preprod container run on the same machine
- **THEN** both bind successfully with no port conflict and each serves its own health endpoint

#### Scenario: Prod declares no host publish

- **WHEN** the prod deployment is inspected
- **THEN** it has no `ports:` publication and no `HOST_PORT` variable, with container `PORT` equal to the Caddy `reverse_proxy places:<PORT>` target

#### Scenario: Green implies declared-URL reachability

- **WHEN** a tier is reported green
- **THEN** its health check passed at the `hermes.yaml`-declared URL and port, not merely localhost inside the container

### Requirement: hermes.yaml reference contract

The repo SHALL keep a `hermes.yaml` reference declaring prod/preprod URLs, poll cadence, alert threshold, Discord channel, slot identity, and deploy/verify commands, and any rename of those commands, URLs, or health semantics SHALL update `hermes.yaml` in the same change.

#### Scenario: Contract drift is caught in review

- **WHEN** a change renames the preprod deploy command or health endpoint
- **THEN** review rejects the change unless `hermes.yaml` is updated alongside it

### Requirement: Secrets handling for ops

The ops agent SHALL be permitted to read `.env.preprod` and the Arcane-managed prod `.env` for presence and shape validation (URL validity, secret length), and SHALL never print, commit, forward, or include secret values in Discord messages, logs, or prompts.

#### Scenario: Secret validation without exposure

- **WHEN** validating tier config with secrets present
- **THEN** the agent reports only presence/shape results (e.g. `SESSION_SECRET set, length ok`) and redacts values in all output
