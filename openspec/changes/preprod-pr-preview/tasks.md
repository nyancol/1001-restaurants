# Tasks

## 1. Workflow

- [x] 1.1 Add `.github/workflows/preprod-preview.yml` (PR `opened`/`synchronize`/`labeled` deploy when `preview` present, `unlabeled`/`closed` guarded teardown, `concurrency: preprod-slot` + `cancel-in-progress: true`, `runs-on: [self-hosted]`, `pull-requests: write`, checkout SHA pinned like `sast.yml` with version comment) and verify `openspec validate --change preprod-pr-preview` passes and the YAML parses (`python3 -c yaml` or `actionlint` if available).
- [x] 1.2 Implement label-added deploy path (checkout PR head, `git checkout -B <head-ref>`, stage `.env.preprod` from the canonical homelab path with loud failure if absent, `preprod-deploy.sh --branch <head> --fresh-db --evict`, `preprod-verify.sh`, post URL + green/red evidence as PR comment via `gh`) and verify each step resolves to a real command, path, and permission.
- [x] 1.3 Implement synchronize path (same branch already owns slot → rebuild without `--fresh-db`, DB kept; branch differs → `--fresh-db --evict` + eviction comment on the previous owner's PR) and verify the flag choice reads the slot file rather than assuming.
- [x] 1.4 Implement guarded teardown (only when slot owner equals the closing/unlabeling PR's branch: `preprod-down`, clear slot record, promotion comment) and verify the guard cannot stop another PR's preview.

## 2. Docs and contract

- [x] 2.1 Document the CI trigger in skill capability 3 (label convention, what CI posts, manual path unchanged, teardown guard) and verify the text matches the workflow's actual triggers and flags.
- [x] 2.2 Record the trigger in `hermes.yaml` (label name, workflow file, reseed policy) and verify the workflow implements exactly what the contract declares.

## 3. Live drill on a throwaway PR

- [ ] 3.1 Open a throwaway PR to `main`, add the `preview` label, and verify the runner deploys a fresh green preview and posts the evidence comment.
- [ ] 3.2 Push a second commit to the drill PR and verify the runner rebuilds without reseeding (requestor rows preserved) and updates the evidence.
- [ ] 3.3 Close the drill PR without merging and verify guarded teardown runs (slot cleared, container stopped, comment posted) and nothing else is touched.
