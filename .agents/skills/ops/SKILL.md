---
name: ops
description: Router/index for operating the production "places" app ("In my Belly", 1001-restaurants). Use to find the right ops skill for observability, preprod deploys, prod incidents, data ops, runner health, or releases — then load only that one.
---

# Places Ops Skill (router)

Operate the production `places` app ("In my Belly", 1001-restaurants).
This skill is an index — the runbooks now live in dedicated skills.
Load the one you need; do not load all six.

Sources of truth mirrored by this family: `compose.yaml`, `compose.preprod.yaml`,
`hermes.yaml`, `.github/` (workflows + dependabot.yml), `Dockerfile`.

| Need | Skill |
|---|---|
| Observability (RED signals via LGTM + Google quota spend guard) | `.agents/skills/ops-observe/SKILL.md` (`scripts/lgtm-query.sh`, `scripts/quota-check.sh`) |
| Preprod preview deploy (single slot) + green verification | `.agents/skills/ops-preview/SKILL.md` (`scripts/preprod-deploy.sh`, `preprod-verify.sh`, `lib-docker.sh`) |
| Hermes prod watch + git-revert rollback | `.agents/skills/ops-incident/SKILL.md` |
| Ad-hoc Google refresh sweep + backup & restore | `.agents/skills/ops-data/SKILL.md` |
| Runner health watch (`github-runner` + preview queue) | `.agents/skills/ops-runner/SKILL.md` (`scripts/runner-watch.sh`) |
| Patching inspection (Dependabot + SAST) + version cut (release PR + tag) | `.agents/skills/ops-ship/SKILL.md` (`scripts/patch-check.sh`) |

Contract source of truth: `hermes.yaml` (thresholds, URLs, volumes, schedule
owner). Quota math follows `hermes.yaml:quota`; preprod green follows
`hermes.yaml:preprod`; prod green follows `hermes.yaml:prod`.

Never mutate app data outside the documented refresh endpoint (data skill),
the staging volume (preview skill), a git revert on `main` (incident skill),
a zerobyte restore into the prod volume on explicit order (data skill), or a
version-bump branch/PR plus its `v*` tag push (ship skill).

## Family conventions (apply to every ops-* skill)

These rules live here once; the leaf skills point back to them. Load this
router whenever you act under an ops-* skill and it is not already loaded.

* **Deploy ownership:** the agent verifies and prepares — Arcane owns
deploys. Never build, restart, or `exec` into prod; never touch prod
`/data` directly.
* **Explicit-order gates:** rollback (`ops-incident`), restore
(`ops-data`), eviction (`ops-preview`), and tag pushes (`ops-ship`) run
ONLY on explicit order. Without one: produce the assessment and prepare
the exact commands, do not execute them.
* **Secrets:** the agent MAY read `.env.preprod` and the Arcane-managed
prod `.env` for presence/shape validation (set?, valid URL?, length >=
32?). It MUST never print, commit, forward, or include secret values in
alerts, logs, prompts, or reports — presence/shape only (e.g.
`SESSION_SECRET set, length ok`).
* **Check exit codes (family convention):** `0` = green / checked-ok,
`1` = red / attention, `2` = check-errored — indeterminate, NOT a red:
fix access and re-run. Only exit-1 runs count toward the
consecutive-failure threshold (`ops-incident`). Scripts may refine `1`
semantically (e.g. quota `1` = urgent) but never `0` or `2`.
* **Host-side tooling:** check scripts run on the host and need `docker`
and/or `gh` + `jq`. Docker access auto-detects sudo via
`.agents/skills/ops-preview/scripts/lib-docker.sh` (override with
`DOCKER_SUDO=""` / `DOCKER_SUDO="sudo"`; never pipe a sudo password).
