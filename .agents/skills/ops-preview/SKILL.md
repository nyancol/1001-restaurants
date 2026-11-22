---
name: ops-preview
description: Deploy a branch to the single preprod staging slot and verify it green for requestor validation. Mutates preprod — invoke explicitly (e.g. /skill:ops-preview).
disable-model-invocation: true
---

# Places Preview Skill

Deploy a branch to the single staging slot for requestor validation.
Project `places-preprod`, container `places-staging`, volume
`places-preprod-data`. The slot file records `SLOT_BRANCH` / `SLOT_SHA` /
`SLOT_SINCE` / `SLOT_VALIDATED`: repo-local `.preprod-slot` (gitignored) for
manual runs, `$PREPROD_SLOT_FILE` (`/tmp/places-preprod-slot` on the
persistent runner filesystem) in CI — runner workspaces do not reliably
persist untracked files between runs.

Sources of truth: `compose.preprod.yaml`, `Dockerfile`, `mise.toml`
(preprod tasks).

Secrets and docker-access conventions follow the family conventions in the
`ops` router skill — load `.agents/skills/ops/SKILL.md` if not already
loaded.

## Shared context

* Tier ports (canonical map lives in `hermes.yaml`): dev API `3232` + vite
  HMR host `5173`; preprod container `5173` / host `5174` (Caddy
  `:8092 -> places-staging:5173`); prod container `5173` (Caddy
  `:8093 -> places:5173`), no host publication. The Arcane-managed prod
  `.env` MUST NOT set `HOST_PORT` (base `compose.yaml` only `expose:`s it;
  the variable is dead weight that invites a harmful publish).
* Docker access: `.agents/skills/ops-preview/scripts/lib-docker.sh` (sourced by the preprod scripts)
  auto-detects — runs docker directly when `docker info` already works,
  sudo only when needed. `mise run preprod-up/down/logs` honor the same
  rule. Override explicitly per host: `DOCKER_SUDO=""` (never sudo) or
  `DOCKER_SUDO="sudo"` (always sudo). If a box's sudo demands a TTY
  password, non-interactive runs must use `DOCKER_SUDO=""` (when docker
  allows it) or fix group membership — never pipe a password.

## Deploy

```bash
mise run preprod-deploy --branch <name> --fresh-db [--evict]
# --fresh-db reseeds the 2-user / 6-place demo fixture (src/scripts/seed-demo.ts
# runs INSIDE the staging container, PREPROD_RESEED=1, on its own volume).
# Without --evict, a slot owned by another branch is refused, not replaced.
```

CI behavior (`.github/workflows/preprod-preview.yml`, self-hosted runner):
the `preview` label on a PR to `main` controls whether it builds.
Label added (or slot owned by another branch) deploys with
`--fresh-db --evict`; `synchronize` on the already-deployed branch rebuilds
and keeps the DB (requestor rows survive iteration). Deploy, eviction,
teardown, and red verdict details include branch, SHA,
health body, green/red cause — never secrets. On PR close or label removal
the workflow tears the preview down only if that PR's branch owns the slot.
Same-repo branches only; fork PRs are refused. Manual `mise run
preprod-deploy` stays available as fallback and re-records the slot.

Rules:

- The wrapper never switches branches: current checkout must equal
  `--branch` or it refuses (avoids destructive checkout surprises).
- Refusal message states owner branch, owner-since, and last validation so
  the requestor knows who to ask. Take no destructive action on refuse.
- `--evict` is the only path that replaces another branch's preview; say
  so explicitly in the evidence post.
- Never copy anything from prod `places-data` into preprod (privacy).

## Preprod green (all must hold)

- Container `places-staging` UP longer than 30s.
- Staging `GET /api/health` → 200 with `db: ok` **at the
  `hermes.yaml`-declared URL**, not just localhost in the container.
- Running build matches the slot commit (`build-from-checkout` assumption is
  recorded, not hidden).
- `GET /api/auth/login` redirects (3xx). `503` = OIDC misconfigured.
- Fixture count matches when `--fresh-db` was used (6 demo places).
- Boot logs contain no `Invalid config` lines.

Read-only check any time:

```bash
mise run preprod-verify                 # all green signals
EXPECT_FIXTURE=1 mise run preprod-verify # additionally require 6-place seed
```

Exit codes: `0` = green, `1` = red, `2` = check errored (docker
unreachable, indeterminate — NOT a red, fix access
and re-run). Only exit-1 runs count toward the consecutive-failure
threshold (see `ops-incident` skill).

## Evidence summary

```
[PREVIEW] branch <name> @ <short-sha> — GREEN | RED (<cause>)
staging: <APP_ORIGIN>  direct: http://localhost:5174
health: <health body>  login: <3xx|503>  seed: <fixture counts>
slot: <owner-since>  evicted: <previous-branch|none>
```

RED names the failing signal plus the relevant log excerpt.
