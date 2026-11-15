# Design

## Context

See proposal.md Why. Current state: `scripts/preprod-deploy.sh` (branch==checkout guard, slot file, `--fresh-db`/`--evict`) and `scripts/preprod-verify.sh` (exit 0/1/2) run from the homelab checkout; `.github/workflows/sast.yml` runs on `[self-hosted]` with `actions/checkout` pinned by SHA; `.env.preprod` is gitignored; DOCKER_SUDO auto-detect covers the runner user.

## Goals / Non-Goals

**Goals:**

- PR label in → preview URL + green evidence comment out, with zero operator shell time.
- Same B1 guarantees as manual deploys: one slot, explicit claim, no silent eviction.
- Teardown that can never nuke another PR's live preview.

**Non-Goals:**

- PR check-run annotations / status checks (comments suffice; revisit if missed).
- Fork-PR support (same-repo branches only; untrusted code + staging secrets don't mix).
- Runner provisioning (existing `self-hosted` runner is assumed).

## Decisions

- **Label gate over push-to-preview.** Rationale: every-push triggering burns builds and lets WIP evict live demos; the label is also the security authorization for running PR code with staging secrets on the host. Alternative (auto-deploy all PRs) rejected on both cost and trust grounds.
- **`cancel-in-progress: true` over queueing.** Rationale: preview value is always "latest head"; deploying superseded SHAs wastes minutes of `npm ci` + build. Cross-PR side effect (A's push cancels B's run) accepted as consistent with last-wins B1; comments make it visible.
- **Reseed-on-claim, keep-on-sync.** Rationale: fresh DB per *branch* preserves the demoable guarantee; per-*commit* reseeds would wipe requestor rows mid-validation. Implemented as flag choice in the workflow, no wrapper change.
- **Teardown guarded by slot ownership.** Rationale: `closed` fires for merges too (the common case — promotion, not abandonment); the guard makes teardown safe regardless of which PR closes when.
- **Reuse the wrapper as-is (`checkout -B` shim).** Rationale: the branch==checkout guard is a safety feature worth keeping; a two-line `git checkout -B <head-ref>` in the workflow satisfies it without weakening the script for local use.
- **`.env.preprod` staged from the canonical homelab path.** Rationale: secrets stay out of git and out of GitHub secrets UI duplication; the file already exists where the runner runs. Workflow fails loudly if absent.
- **`gh` CLI for comments over `actions/github-script`.** Rationale: `gh` is installed on the box, needs no new pinned action, and keeps the evidence-posting logic in shell next to the scripts that produce the evidence.

## Risks / Trade-offs

- [PR code runs with staging secrets] Any labeled branch executes on the homelab host → Mitigation: label is maintainer-only opt-in (personal repo); never auto-label; SAST still scans PRs.
- [Self-hosted runner maintenance] Runner upgrades/outages silently disable previews → Mitigation: Hermes watch already alerts on prod; preview staleness is visible as missing comments; document runner health as operator duty (out of scope).
- [Workspace slot drift] Runner `_work` checkout vs homelab checkout diverge (different slot files) → Mitigation: the runner workspace is the single writer once this lands; local manual deploys remain possible but should re-record the slot (wrapper does this automatically).
- [Same `places:latest` tag shared with local builds] Concurrent local + CI builds could interleave → Mitigation: concurrency group serializes CI runs; local deploys during a CI run are operator error, surfaced by the slot record.

## Migration Plan

No data migration. Land workflow (inactive until a label is applied) → skill/hermes doc updates → live drill on a throwaway PR → announce the `preview` label convention. Rollback: delete the workflow file; manual deploys keep working.

## Open Questions

- Comment strategy: one rolling comment edited per PR vs new comment per deploy (rolling is quieter; new-per-deploy preserves history).
- Whether merged-PR teardown should `preprod-down` (save RAM) or leave warm for the next preview.
