# Tasks

## 1. Locate plumbing

- [x] 1.1 Add one-shot geolocate helper + `◎ Locate` header button beside Fit to results and verify button renders, disables only in-flight, and re-runs locate on tap
- [x] 1.2 Wire first-open auto-locate in parallel with map init with once-per-mount guard and queued center, and verify granted position eases to user at zoom ~14 while denied/timeout stays on Paris with inline note

## 2. Dot and halo layers

- [x] 2.1 Add `user-halo` + `user-dot` circle layers beneath pins with standard blue styling and accuracy-derived halo radius, and verify dot persists across pan/filter/select in light and dark themes
- [x] 2.2 Ensure pin `setData`, fit-to-results, and cluster zoom never move or hide the dot, and verify fit still includes only pins while dot stays put

## 3. States and polish

- [x] 3.1 Add muted inline geo note distinct from danger errors for denied/timeout/unavailable, and verify copy shows on fallback and clears on successful locate
- [x] 3.2 Apply zoom policy (target 14, never zoom out) and cap oversized indoor halos, and verify close-up zoom is preserved and large accuracy values render sanely

## 4. Verification

- [x] 4.1 Run `npm run build` in `web/` and existing checks (`npx tsc --noEmit` / tests where applicable), and verify no type or build regressions
- [x] 4.2 Manual matrix in browser devtools (granted / denied / timeout via sensor emulation, zero pins, dark mode) and verify each spec scenario outcome
