# Places Ops Skill (router)

Operate the production `places` app ("In my Belly", 1001-restaurants).
This skill is an index — the runbooks now live in dedicated skills.
Load the one you need; do not load all six.

| Need | Skill |
|---|---|
| Observability (RED signals via LGTM + Google quota spend guard) | `skills/ops-observe/SKILL.md` (`scripts/quota-check.sh`) |
| Preprod preview deploy (single slot) + green verification | `skills/ops-preview/SKILL.md` (`scripts/preprod-deploy.sh`, `preprod-verify.sh`, `lib-docker.sh`) |
| Hermes prod watch + git-revert rollback | `skills/ops-incident/SKILL.md` |
| Ad-hoc Google refresh sweep + backup & restore | `skills/ops-data/SKILL.md` |
| Runner health watch (`github-runner` + preview queue) | `skills/ops-runner/SKILL.md` (`scripts/runner-watch.sh`) |
| Patching inspection (Dependabot + SAST) + version cut (release PR + tag) | `skills/ops-ship/SKILL.md` (`scripts/patch-check.sh`) |

Contract source of truth: `hermes.yaml` (thresholds, URLs, volumes, schedule
owner). Quota math follows `hermes.yaml:quota`; preprod green follows
`hermes.yaml:preprod`; prod green follows `hermes.yaml:prod`.

Never mutate app data outside the documented refresh endpoint (data skill),
the staging volume (preview skill), a git revert on `main` (incident skill),
a zerobyte restore into the prod volume on explicit order (data skill), or a
version-bump branch/PR plus its `v*` tag push (ship skill).
Secrets: the agent MAY read `.env.preprod` and the Arcane-managed prod `.env`
for presence/shape validation (set?, valid URL?, length >= 32?). It MUST
never print, commit, forward, or include secret values in alerts,
logs, prompts, or reports — presence/shape only (e.g. `SESSION_SECRET set,
length ok`).
