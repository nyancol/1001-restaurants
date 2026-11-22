---
name: ops-runner
description: Health watch for the single self-hosted github-runner that drives the preprod preview loop. Use when preview CI runs are stuck, missing, or the runner container looks unhealthy. Read-only.
---

# Places Runner Skill

The preprod preview loop depends on the single self-hosted `github-runner`.
Check with `.agents/skills/ops-runner/scripts/runner-watch.sh` (host-side, needs docker + `gh`):
container alive + every open `preview` PR has a `preprod-preview` run on
its current head (stuck = non-completed run older than 15m).

Exit codes follow the family check convention (`ops` router skill):
`0` = green, `1` = red, `2` = indeterminate.

Assessment content:

```
[RUNNER RED] <container-down | stalled-queue>
detail: <e.g. PR #N (branch) has no run on <sha> | run still <status> after <age>s>
next: watching; label-triggered deploys are stalled until the runner returns
```

Never debug by running preview
workflows locally; the slot lives on the homelab host.
