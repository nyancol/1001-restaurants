# PR phases — check the one that applies, delete the other

Closes #

## Phase 1 — Spec (Draft PR)

- [ ] Scope frozen from issue discussion (ambiguity resolved in the issue, wording refined here)
- [ ] `openspec/changes/<slug>/{proposal,design,tasks}.md` + `specs/` deltas committed
- [ ] Out-of-scope section explicit in `proposal.md`
- [ ] No `src/` / `web/` changes in this phase
- [ ] Reviewers approved scope; `spec-ready` label applied

Trigger implementation with a PR comment: `@agent implement` (spec is now frozen).

## Phase 2 — Implementation (Ready for Review)

- [ ] Implemented against the locked spec; spec changes (if any) re-approved in PR comments
- [ ] `mise run check` green (typecheck + lint + format:check + tests)
- [ ] `ci.yml` + `sast.yml` green
- [ ] PR marked Ready for Review; human merges (agent never merges, never claims preprod, never pushes tags)
