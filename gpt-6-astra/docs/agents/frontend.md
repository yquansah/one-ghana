# Frontend implementation handoff

Completed 7 September 2026. All frontend files remain under the requested `gpt-6-astra` project.

## Owned files

- `app/app/page.tsx` mounts the game directly; `app/app/globals.css` imports the design agent’s tokens and supplies responsive game styles.
- `app/src/ui/game-app.tsx` owns the six-view shell and shared turn controls.
- `app/src/ui/use-game.ts` binds the worker client, autosave, archived campaigns and WebMCP to one serialized action queue. Registered handlers read current campaign/client refs, so browser tools and UI perform the same state transitions.
- `briefing.tsx`, `policies.tsx`, `places.tsx`, `results.tsx`, `evidence.tsx`, `campaign-controls.tsx`, and `shared.tsx` implement views and matching reusable elements.

## Delivered behavior

- Cocoa-first briefing; all 24 templates across six families; independent scale, funding, beneficiaries, delivery arrangement, and safeguards; engine-driven preview, validation, submission and policy delivery history.
- Separate agency, district and contracted specialist delivery. District and specialist cost/participation tradeoffs match backend definitions. Realized approval and delayed implementation are displayed separately.
- Sixteen accessible regional selectors beside the supplied schematic. GSS projected population is separate from synthetic regional economics and fictional household distributions.
- Separate welfare indicators, institutional constraints, election and succession outcomes, quarterly causal reports, historical trends with tables, actual common comparison horizon, and three 20-year legacy scenarios.
- Searchable evidence records expose source, units, reference period, publication-date gaps, revision status and caveats. Model guide covers accounting, institutional hypotheses, synthetic households, price transmission, inflation-cap limitation and scenario uncertainty.
- Autosave, versioned export/import, branch archive, exact archived-snapshot restore/export/removal and explicit new-campaign confirmation. Archive-before-replace failures retain the current campaign. Invalid imports do not mutate campaign state. A damaged main save still allows recovery from an independently loaded healthy archive.
- Archive UI identity consistently uses JSON tuples of campaign id, name and quarter, matching exact storage filtering.
- Modal recovery controls remain available before initialization succeeds. Save failures offer an export backup; worker errors retain campaign and draft.

## Verification and coordination

- `npm exec -- tsc --noEmit` passed after full integration and review fixes.
- `npm exec -- oxlint src/ui app/page.tsx` passed. No React compiler suppression remains. Scoped accessibility lint exceptions document keyboard-focusable scroll regions and the static local schematic SVG.
- `npm exec -- oxfmt src/ui app/page.tsx app/globals.css` applied repository formatting to owned implementation files.
- Root performed required live WebMCP checks: all five tools, invalid actions, district-delivery cocoa preview, comparison, submit/advance, exact reload persistence and worker-mode diagnostic. Root owns final production build, full release checks and private hosting.
- Design agent’s source review identified and resolved scenario-horizon wording, term-limit wording, delivery controls, archive identity and independent recovery. No browser visual QA was performed by this agent, as instructed.

## Limits made visible

This is an inspectable teaching simulation, not a calibrated forecast. Shared shocks isolate model differences; they do not establish real causal effects. Welfare and institutional scores are proxies. Reports label household income change as percentage change from the prior quarter, while national cocoa income and comparison changes use their specified index-point units.
