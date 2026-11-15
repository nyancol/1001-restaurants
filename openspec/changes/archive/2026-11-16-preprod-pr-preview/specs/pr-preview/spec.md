# Spec Delta

## Purpose

Automate preprod preview deployment from pull requests: a maintainer-applied `preview` label makes the self-hosted runner deploy the PR head to the single staging slot, keeping B1 queue/evict semantics and reporting evidence back on the PR.

## ADDED Requirements

### Requirement: Label-gated preview trigger

The workflow SHALL deploy a PR head to the preprod slot only when the PR targets `main` and carries the `preview` label; pushes, opens, and synchronizes without the label SHALL build and deploy nothing.

#### Scenario: Unlabeled PR builds nothing

- **WHEN** a PR to `main` is opened or synchronized without the `preview` label
- **THEN** no workflow deploy runs and the staging slot is untouched

#### Scenario: Label added claims the slot

- **WHEN** the `preview` label is added to an open PR to `main`
- **THEN** the runner checks out the PR head, deploys it with a fresh demo DB (evicting any previous owner), and posts the preview URL plus green evidence as a PR comment

### Requirement: Synchronize rebuilds without reseeding

When new commits land on the already-deployed preview branch, the workflow SHALL rebuild and redeploy the new head while keeping the existing staging DB, so the requestor's own test rows survive iteration.

#### Scenario: New commit refreshes code, keeps data

- **WHEN** a labeled PR's head advances while the slot already belongs to that branch
- **THEN** the runner redeploys without `--fresh-db` and the comment reports the new SHA with the fixture/requestor rows intact

#### Scenario: New branch claims with fresh seed

- **WHEN** a labeled PR's branch differs from the current slot owner
- **THEN** the runner deploys with `--fresh-db --evict` and the evicted PR receives an eviction comment

### Requirement: Single-slot serialization in CI

Concurrent preview runs SHALL share one concurrency group so only the latest runs to completion; a superseded run SHALL cancel before deploying rather than queue behind.

#### Scenario: Superseded commit cancels

- **WHEN** two commits push in quick succession on a labeled PR
- **THEN** only the newest head is deployed and the older run cancels without touching the slot

### Requirement: Guarded teardown on close or unlabel

When a PR is closed or the `preview` label is removed, the workflow SHALL tear the preview down only when the slot owner is that PR's branch; otherwise it SHALL take no action.

#### Scenario: Merged PR frees its slot

- **WHEN** a labeled PR merges and the slot belongs to its branch
- **THEN** the runner stops the staging container, clears the slot record, and comments that the preview is promoted to prod via `main`

#### Scenario: Unrelated close touches nothing

- **WHEN** a PR closes while the slot belongs to a different branch
- **THEN** the workflow exits without stopping anything or clearing the slot

### Requirement: PR comments as evidence, never secrets

Every deploy, eviction, teardown, and red verdict SHALL be reported as a PR comment containing branch, SHA, health body, and green/red cause, and SHALL never include secret values.

#### Scenario: Green deploy posts evidence

- **WHEN** a preview deploy verifies green
- **THEN** the PR receives a comment with URL, SHA, health body, and fixture count

#### Scenario: Red deploy posts cause

- **WHEN** a preview deploy verifies red
- **THEN** the PR receives a comment naming the failing signal with the relevant log excerpt, and no secret values appear in logs or comments
