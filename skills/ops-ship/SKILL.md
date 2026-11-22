# Places Ship Skill

Monthly patching inspection (read-only) and version cuts (release PR +
tag). Patching never merges, rebuilds, or deploys; releases never bundle
feature code with the version bump and never move a pushed tag.

---

## Part 1 — Patching inspection (Dependabot + SAST, read-only)

Read-only: never merges, rebuilds, or deploys. Check with
`skills/ops-ship/scripts/patch-check.sh` (host-side, needs `gh` + `jq`): open Dependabot
PRs (npm + docker, per `.github/dependabot.yml`) plus the latest SAST
(`sast.yml`) run on `main`.

```bash
./skills/ops-ship/scripts/patch-check.sh
# exit 0 checked-ok / 1 attention (SAST failed on main, or dependabot.yml
# missing from the checkout) / 2 check-errored
```

Exit codes match the preprod/runner convention: `0` = checked ok,
`1` = attention, `2` = check-errored (gh/jq missing, auth failed,
indeterminate — NOT a verdict, fix access and re-run). Open Dependabot
PRs are informational, never a red by themselves; a SAST failure on
`main` is the red (it blocks the monthly train).

### What NOT to do

- Never merge a Dependabot PR without the full drill: `npm audit` +
  review, base-image rebuild (`node:24-slim`), `npm test` + `typecheck`
  + SAST green, preprod drill (`preprod-deploy` + `preprod-verify` —
  see `ops-preview` skill), then prod via `main`. Critical CVEs skip the
  queue — same drill, expedited.
- Never read "zero open PRs" as "nothing to do" without checking the
  SAST line and the `dependabot.yml present` line (a missing config
  looks calm but is blind).

---

## Part 2 — Version cut (release PR + tag)

Cut a release as a **release PR off `main`, then a tag push after merge**.
`release.yml` fires only on a `v*` tag push: it checks out the tag, fails
unless tag == `package.json` version and `CHANGELOG.md` has a
`## [<version>]` entry, then builds, attaches an SPDX SBOM, and publishes
the GitHub Release. No deploys — Arcane pulls `main` separately.

### Branch off main

```bash
git checkout main && git pull origin main
git checkout -b chore/release-<X.Y.Z>
```

Work from a fresh `main` so the release PR contains only the version bump
plus the CHANGELOG move — never bundle feature code into it.

### Bump + CHANGELOG

```bash
npm version --no-git-tag-version <patch|minor|major>
# --no-git-tag-version: package.json (+ lockfile) bumped and committed
# locally, but NO local tag is created. The tag is created on
# post-merge main — pushing a branch-time tag would pin the release
# workflow to the pre-merge commit (wrong after squash-merge).
```

Then move the `[Unreleased]` entries into the new section (Keep a Changelog):

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- ...

## [Unreleased]
```

Commit the CHANGELOG with a Conventional Commit
(`chore(release): prepare vX.Y.Z`), push, and open a PR to `main`. Pick the
bump from the Conventional Commits merged since the last tag (`fix:` →
patch, `feat:` → minor, `feat!:`/`BREAKING CHANGE:` → major).

### PR checks (must be green before merge)

- `ci.yml` verify (typecheck, lint, format check, tests + coverage gate,
  production build), `npm audit`, betterleaks, Dockerfile build, SAST.
- Fresh `main` (rebase if it moved) — the tag below must land on the
  merged HEAD so `release.yml` builds exactly what prod runs.

### Merge, then tag on post-merge main

```bash
# merge the PR (merge or squash — content is identical either way), then:
git checkout main && git pull origin main
node -p "require('./package.json').version"   # must print X.Y.Z
grep -Eq "^## \\[X\\.Y\\.Z\\]" CHANGELOG.md && echo "changelog ok"
git tag vX.Y.Z && git push origin vX.Y.Z
```

Pushing the tag fires `release.yml`. Watch the run to green and confirm
the GitHub Release carries the CHANGELOG excerpt + `sbom-vX.Y.Z.spdx.json`.

### What NOT to do

- Never push the tag from the release branch or before the merge — the
  workflow would build pre-merge code while Arcane deploys post-merge `main`.
- Never `npm version` without `--no-git-tag-version` on a branch; if a
  stray local tag exists, delete it (`git tag -d vX.Y.Z`) before tagging.
- Never retag or move a pushed tag. If the release is wrong, cut `X.Y.Z+1`.
- Never hand-edit `package.json` version without the matching CHANGELOG
  entry — `release.yml` fails the run and there is no release.
