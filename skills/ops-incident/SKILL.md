# Places Incident Skill

Prod health + version watch (Hermes) and git-revert rollback. The agent
verifies and prepares — Arcane owns deploys. Rollback runs ONLY on explicit
order.

Secrets: the agent MAY read the Arcane-managed prod `.env` for
presence/shape validation (set?, valid URL?, length >= 32?). It MUST never
print, commit, forward, or include secret values in alerts, logs, prompts,
or reports — presence/shape only (e.g. `SESSION_SECRET set, length ok`).

## Shared context

* Tier ports (canonical map lives in `hermes.yaml`): prod container `5173`
  (Caddy `:8093 -> places:5173`), no host publication. The Arcane-managed
  prod `.env` MUST NOT set `HOST_PORT`.
* Telemetry: prod `places` exports OTLP/HTTP to `http://lgtm:4318`.
  Every signal carries `service.name="places"`,
  `deployment.environment="production"`. A signal gap with steady 200s =
  exporter break, not zero users (see `ops-observe` skill for the RED lens).
* Thresholds live in `hermes.yaml`: alert after 3 consecutive failures, 10m
  version-stuck grace after a merge.

---

## Prod watch

### Prod green (all must hold)

- `GET <prod-health-url>` → 200 with `db: ok`.
- Running version equals `main` HEAD past the merge grace window
  (`version-stuck` with expected-vs-running versions otherwise).
- Boot logs show OIDC discovery ok; `/api/auth/login` does not 503.
- No sustained 5xx on places CRUD (RED lens from `ops-observe`).
- OTEL signals for the running version are visible in LGTM. A signal gap
  with steady 200s = exporter break, not zero users.
- Container `PORT` equals the Caddy `reverse_proxy places:<PORT>` target
  and health passed at the declared URL (catches env-to-Caddy drift).

### Assessment templates (evidence-backed, never secrets)

```
[PROD RED] <cause: down|version-stuck|oidc-config|5xx|exporter-break>
health: <body or unreachable>
running: <version>  expected(main): <sha>  since: <UTC time>
logs: <tail excerpt, secrets redacted>
next: watching; rollback only on your order (see below)
```

```
[PROD GREEN] recovered at <UTC time> (was <cause>, red for <duration>)
running: <version>  health: <body>
```

### What NOT to do

- Never build, restart, or `exec` into prod; never touch prod `/data`.
  The agent verifies and prepares — Arcane owns deploys.
- Never include secret values: presence/shape only
  (e.g. `SESSION_SECRET set, length ok`).

---

## Git-revert rollback

Rollback is `git revert` of the offending commit on `main` + push so Arcane
redeploys. No direct prod rebuild, no image pinning — one deploy mechanism.

### Gate

- Run ONLY on explicit order (`revert <sha>`, `roll back prod`).
  Without an order: produce the prod-watch assessment above and prepare the exact
  commands, do not execute them.

### Migration-safety pre-check (must pass before revert)

```bash
git show --stat <sha>                # what did it touch?
git show <sha> -- src/db/index.ts    # migration SQL, if any
```

- PASS: `src/db/index.ts` untouched, or the diff adds only `CREATE TABLE`,
  `ALTER TABLE ... ADD COLUMN`, `CREATE INDEX`, or `INSERT` statements.
- BLOCK: any `DROP`, `RENAME`, table rebuild (`places_new` pattern),
  backfill that rewrites existing rows, or any change outside additive SQL.
  On BLOCK: refuse the automatic revert and propose manual recovery instead
  (restore `/data` volume from backup — see `ops-data` skill — then revert,
  then redeploy).

### Execute + verify

```bash
git revert --no-edit <sha> && git push origin main
# then: prod green per the definition above (version advances to the revert commit)
```

Report the revert commit, the push result, and the post-revert green check.
If green does not return within the Arcane poll window + build time, escalate
with fresh evidence — do not stack further reverts blindly.

### Dry run (no push)

For rehearsal or approval: run the pre-check, print the exact `git revert` command
that WOULD run, and stop.
