# Tasks

## 1. Contract and seed foundation

- [x] 1.1 Add `hermes.yaml` reference (prod/preprod URLs, poll cadence 5m, alert threshold 3 consecutive failures, Discord channel, slot identity, deploy/verify commands) and verify `openspec validate --change ops-preview-watch-rollback` passes and every URL/command in it resolves to a real target.
- [x] 1.2 Add deterministic demo seed fixture/script (migrations + 2 demo users, ~6 places, tags) and verify a local reseed produces exactly the expected fixture counts with no prod data involved.
- [ ] 1.3 Add `mise run preprod-deploy --branch <x> --fresh-db` wrapper reusing `compose.preprod.yaml` (rebuild, reseed, print URL + health + version) and verify it deploys a throwaway branch to staging green.
- [x] 1.4 Normalize tier ports (preprod host publish `5173` -> `5174`, prod `.env` drops `HOST_PORT`, `hermes.yaml` declares canonical ports with `PORT == Caddy target`) and verify vite + preprod bind together, prod has no host publish, and both tiers answer at their declared URLs.

## 2. Skill extension (Hermes runtime)

- [x] 2.1 Extend `skills/ops/SKILL.md` with capability 3 (single-slot preview deploy: owner tracking, refuse-without-evict-confirm, fresh-seed rule, preprod green evidence) and verify the documented deploy/refuse flows read correctly against the spec scenarios.
- [x] 2.2 Extend `skills/ops/SKILL.md` with capability 4 (Hermes prod watch: poll cadence/threshold from `hermes.yaml`, prod green definition incl. version==main and OTEL visibility, one-alert-per-transition + recovery notice, Discord templates) and verify template renders contain evidence and no secret values.
- [x] 2.3 Extend `skills/ops/SKILL.md` with capability 5 (git-revert rollback runbook: explicit-order gate, migration-safety pre-check for additive-only migrations, revert+push+verify steps) and verify the runbook refuses a destructive-migration fixture.
- [x] 2.4 Relax the skill secrets rule to may-read-`.env.preprod`-and-prod-`.env`-for-validation / never-print-commit-forward and verify no skill example echoes a secret value.

## 3. Drill acceptance

- [ ] 3.1 Run Drill 1 (preprod deploy happy path on a throwaway branch) and verify PREPROD green report with URL, version == branch HEAD, health db:ok, and fixture count.
- [ ] 3.2 Run Drill 2 (slot contention: second branch without evict confirm) and verify the agent refuses with current owner branch, owner-since, and takes no destructive action.
- [ ] 3.3 Run Drill 3 (induced preprod failure: stop staging container) and verify exactly one Discord alert with evidence posts, no repeats while red, plus a recovery notice after restart.
- [ ] 3.4 Run Drill 4 (dry-run revert construction for a past commit, no push) and verify the prepared revert commands are migration-safe and would target `main` for Arcane pickup.

## 4. Integration check

- [ ] 4.1 Verify read-only prod checks (health, running version vs `main` HEAD, OIDC login reachability, LGTM signal presence, `PORT == Caddy target` and declared-URL reachability per tier) pass and the Hermes schedule mapping in `hermes.yaml` matches the skill commands exactly.
- [ ] 4.2 Verify `openspec validate --change ops-preview-watch-rollback --strict` passes with all scenarios using WHEN/THEN and all requirement descriptions within limits.
