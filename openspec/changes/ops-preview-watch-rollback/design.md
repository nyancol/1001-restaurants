# Design

## Context

See proposal.md Why. Current state: `compose.yaml` (prod defaults, `places-data`, external `caddy` + `telemetry` nets), `compose.preprod.yaml` (staging override, own volume, publishes `${HOST_PORT:-5173}:${PORT}`), dev vite HMR fixed on host `5173` (`web/vite.config.ts`), preprod `.env` sets `PORT=5173`/`HOST_PORT=5173` so vite and preprod collide on one box, prod `.env` carries vestigial `HOST_PORT` although base compose only `expose:`s, and `Caddyfile` hardcodes `reverse_proxy places(-staging):5173` with no enforcement that container `PORT` matches.

## Goals / Non-Goals

**Goals:**

- One predictable preprod slot with ownership, fresh demo data, and green evidence per deploy.
- Prod watch that distinguishes healthy-stale (version != main), misconfigured (OIDC), sick (5xx/db), and blind (OTEL gap) states.
- Rollback path that reuses the single GitOps mechanism (revert on main), gated on explicit order + migration safety.
- `hermes.yaml` as the reviewable contract between this repo and Hermes.

**Non-Goals:**

- Multi-slot or dynamic per-branch previews (revisit if B1 queuing hurts).
- Hermes scheduler internals, Arcane configuration, Caddy reconfiguration, PocketID client split, OTEL pipeline changes.
- Prod data seeding into preprod (explicitly excluded for privacy).

## Decisions

- **B1 single slot over N-slots/dynamic.** Rationale: one staging URL + one OIDC callback on the shared client keeps operations explainable; contention is visible (refuse + state owner) rather than silently parallel. Alternative B2 (2 numbered slots) kept as the documented escalation if queue waits become routine.
- **Single `ops-lifecycle` capability over three micro-specs.** The behaviors share green/seed/owner vocabulary and one acceptance drill set; splitting would triple ceremony for a homelab workflow. Revisit if the capability exceeds ~10 requirements.
- **Discord templates live only in the skill.** The spec requires evidence-backed alerts; the skill pins the exact shape. Single source Hermes imports verbatim; no spec/skill template drift.
- **`hermes.yaml` is a reference, not executable config.** Hermes reads it as documentation of URLs/cadence/commands; its own scheduler remains authoritative. Keeps this repo free of Hermes runtime coupling while making drift reviewable.
- **Fresh seed = migrations + deterministic fixture, not empty DB.** Blank map reads as broken to requestors; a small fixture (2 demo users, ~6 places, tags) demos a living app and exercises list/detail paths. No prod snapshot (privacy + WAL-copy risk).
- **Poll defaults 5m / 3 consecutive failures.** Homelab traffic is low; faster polling adds noise without faster recovery (Arcane poll + rebuild dominates). Tunable via `hermes.yaml` without code change.
- **Preprod host publish moves to `5174`, Caddy targets untouched.** Rationale: internal `5173` keeps both `reverse_proxy` lines valid with zero Caddy change; moving only the host side resolves the vite collision with the smallest diff. Alternative (drop `ports:` entirely, Caddy-only access) kept as an option if direct localhost debugging proves unneeded.
- **Prod drops `HOST_PORT`, keeps `PORT == Caddy target` by assertion.** Base compose never publishes, so the variable is dead weight that invites a harmful "fix". `hermes.yaml` declares the canonical pair and the watch asserts equality instead of adding templating across repos.
- **Revert-construction dry run before live revert.** Drill 4 proves the agent builds a migration-safe revert without pushing a deliberately-bad main, de-risking the day live revert is ordered.

## Risks / Trade-offs

- [Shared PocketID client across tiers] Staging logins pollute prod IdP audit; one rotation breaks both tiers → Mitigation: accepted for now; document both callbacks registered; revisit client split when audit matters.
- [Same SECRET values across tiers today] Staging compromise equals prod compromise → Mitigation: spec requires per-tier secrets validation reporting; rotation to distinct values recommended as a follow-up chore (out of this change's scope).
- [Single slot blocks parallel validation] Second requestor waits or evicts → Mitigation: refuse-by-default + owner/since visibility; escalation path to B2 documented.
- [Version-equals-main check depends on Arcane poll latency] False `version-stuck` red right after merge → Mitigation: grace window after merge before version check bites (declared in `hermes.yaml`).
- [OTEL gap vs zero-traffic ambiguity] Low homelab volume makes "no signals" ambiguous → Mitigation: correlate with health 200s (gap + 200s = exporter break per existing skill notes).
- [Port env-to-Caddy handshake is manual across repos] Container `PORT` and `Caddyfile` target can drift silently; local health stays green while Caddy traffic dies → Mitigation: `hermes.yaml` declares both, watch asserts `PORT == Caddy target`, and green requires declared-URL reachability.
- [Skill-only Discord templates escape spec review] Template regressions not caught by `openspec validate` → Mitigation: drill transcripts include rendered messages; reviewers check them.

## Migration Plan

No data migration. Deploy order: land `hermes.yaml` + skill extension + seed (inactive until used) → run drills 1-4 on preprod + read-only prod checks → Hermes enables scheduled watch. Rollback of this change: delete `hermes.yaml`/skill additions (docs-only); no runtime state to unwind.

## Open Questions

- Poll cadence/threshold final values (defaults proposed; Hermes operator confirms).
- Separate Discord test channel for drills vs same ops channel with `[DRILL]` prefix.
- Exact fixture contents (which demo places/tags best represent requestor validation).
