# Proposal

## Why

Preprod deploys are manual (`mise run preprod-deploy` from the homelab checkout), so requestor validation waits on the operator and PR updates never refresh the preview. A label-gated PR workflow on the existing self-hosted runner automates the loop without weakening the B1 single-slot rules.

## What Changes

- Adds `.github/workflows/preprod-preview.yml` (runs on the existing `self-hosted` runner): on PR `opened`/`synchronize`/`labeled` to `main` it deploys the PR head to the staging slot when the `preview` label is present; on `unlabeled`/`closed` it tears the preview down when the slot owner is that PR's branch.
- Label is the trigger: pushes without the `preview` label build nothing; adding the label (maintainer opt-in) authorizes running PR code on the homelab host with staging secrets in env.
- `concurrency: group: preprod-slot, cancel-in-progress: true`: superseded commits cancel (never deploy a stale SHA); the single group serializes the B1 slot, last writer wins with an eviction comment.
- Reseed policy: label added (or slot owned by another branch) → `--fresh-db --evict`; `synchronize` on the already-deployed branch → rebuild, keep DB (requestor's test rows survive iteration).
- Checkout pins `actions/checkout` to the same SHA as `sast.yml` (with version comment); the workflow creates the PR branch locally (`git checkout -B <head-ref>`) to satisfy the deploy wrapper's branch==checkout guard.
- `.env.preprod` (gitignored) is staged into the runner workspace from the canonical homelab path, failing loudly if absent; the slot file persists in the workspace across runs.
- Evidence + teardown are posted as PR comments via `gh` (present on the runner) with `pull-requests: write` permission.
- Skill capability 3 documents the CI trigger, the label convention, and the guarded teardown; `hermes.yaml` records the label and workflow name.
- Acceptance is a live drill on a throwaway PR: label → green preview + comment; new commit → rebuild keeps DB; close → guarded teardown.

## Capabilities

### New Capabilities

- `pr-preview`: label-gated PR trigger that deploys PR heads to the single preprod slot via the self-hosted runner (claim/reseed on label, rebuild-keep-DB on synchronize, guarded teardown on close/unlabel, PR comments as evidence), honoring B1 queue/evict semantics.

### Modified Capabilities

(none — `ops-lifecycle` slot, green, and rollback behaviors are unchanged; this change only automates how deploys get initiated)

## Impact

- Repo: new workflow file, skill capability-3 runbook update, `hermes.yaml` trigger record. No change to `compose.*`, Caddy, PocketID, Arcane, or the deploy/verify scripts (wrapper used as-is).
- Systems: runner executes PR head code with staging env on the homelab host (label = maintainer authorization); prod untouched (Arcane still owns `main`).
- Secrets: workflow stages the existing gitignored `.env.preprod` into the workspace; no secret values in logs or PR comments (presence/shape only).
