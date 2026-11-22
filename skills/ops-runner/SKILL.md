# Places Runner Skill

The preprod preview loop depends on the single self-hosted `github-runner`.
Check with `skills/ops-runner/scripts/runner-watch.sh` (host-side, needs docker + `gh`):
container alive + every open `preview` PR has a `preprod-preview` run on
its current head (stuck = non-completed run older than 15m).

Exit codes match the preprod convention: `0` = green, `1` = red,
`2` = check errored (indeterminate — NOT a red, fix access and re-run).

Assessment content:

```
[RUNNER RED] <container-down | stalled-queue>
detail: <e.g. PR #N (branch) has no run on <sha> | run still <status> after <age>s>
next: watching; label-triggered deploys are stalled until the runner returns
```

Never debug by running preview
workflows locally; the slot lives on the homelab host.
