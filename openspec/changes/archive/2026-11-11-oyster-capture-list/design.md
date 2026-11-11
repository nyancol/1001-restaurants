# Design

## Context

See proposal.md for why. Foundation (`oyster-foundation`) owns auth, tenancy, API, DB, and Google proxy; this change is the first browser UI on top. Constraints: phone-first capture, same-container static serving, no map yet.

## Goals / Non-Goals

**Goals:**
- One-tap-feel capture from lookup to saved; list that answers "what was that place?" in under 5 seconds.
- Reuse foundation contract with no API breakage.

**Non-Goals:**
- Map pins/tiles, friend overlay UI, CSV import, offline support.

## Decisions

- **Vite + React + Tailwind, two routes (`/add`, `/`) served as static by the API container:** fast to build, responsive with minimal CSS, no SSR needed behind tunnel. Alternative (server-rendered or Next.js) rejected as heavier ops for this scale.
- **Lookup via foundation Google proxy with explicit Search button (min 2 chars) + pick-to-prefill, results cached per query in-session, draft kept in local state:** explicit search (not per-keystroke autocomplete) keeps Google API usage to one call per search; avoids key leakage, survives save errors without losing input. Duplicate `googlePlaceId` per owner triggers update-confirm rather than silent fork.
- **Tag field as multi-value combobox hitting `GET /api/tags?q=`:** shows counts, keyboard-first, creates on Enter; normalization stays server-side as source of truth.
- **List as server-filtered query (`owner=me&status=&tags=&q=`) with URL-synced filter state:** shareable link, back-button safe; inline edit via `PATCH` with optimistic toggle and rollback on 403/400.
- **Unauthenticated UI redirects to login; 401 from API surfaces a login prompt, not silent failure.**

## Risks / Trade-offs

- [Google suggestion picked but details fetch fails] → Mitigation: keep typed text, allow manual save without coords (enrichment later fills pins).
- [Tag input over-fetching] → Mitigation: debounce + min 2 chars + client cache per session.
- [Phone keyboard covering form] → Mitigation: single-column layout, sticky save bar, tested at 360px width.

## Migration Plan

- Additive static assets only; no DB migration. Rollback by serving previous bundle.

## Open Questions

- None that change specs or tasks; visual polish (empty states, exact star widget) left to implementation.
