# Release verification record

Status: **private release 1 successfully published on 7 September 2026**.

Dataset: `ghana-2026-09-04.v1`. Historical cutoff: 4 September 2026. Model: `1.0.0`. Fictional inauguration: Q1 2027. The game is a learning simulation with synthetic fiscal, household, political and response parameters, not a forecast of Ghana's presidency.

## Infrastructure verification, 7 September 2026

- Targeted dependency remediation completed. `work/npm-audit-after.json`: zero reported vulnerabilities. The original scan is retained in `work/npm-audit.json`.
- Typecheck passes on the patched stack. Production static export succeeds with vinext beta.9; intermediate build log `work/build-infrastructure.log`.
- Unit, WebMCP contract, evidence-link, static-server and campaign acceptance tests are discoverable through `npm test`. The latest full infrastructure run passed **30/30 tests** in `work/test-infrastructure.log`; the final focused infrastructure run passed all seven tests after lint fixes.
- Authored infrastructure scripts/tests pass lint. The package lint command excludes unchanged generated components; scoped engine/frontend/integration findings were sent to their owners and remain a coordinator integration check.
- Acceptance covers all 24 policy templates × three funding choices through elections and twenty-year legacy, tracking cumulative cash/debt versus quarterly fiscal balances, processing input/capacity bounds and repeated annual save/export/import.
- Import tests found and prompted fixes for zero baseline divisors, absent cocoa household weights, negative processing capacity and output beyond bean supply. Autosave tests exercise storage quota failure and corrupted persisted JSON.
- Static preview rejects traversal/symlink escapes and absent assets, handles HEAD, restricts methods, and serves worker JavaScript with the appropriate content type.
- `check:static` requires the built simulation-worker asset, verifies HTML references and writes a SHA-256 manifest. The coordinator must run it after final frontend integration and production build.

## Sensitivity and historical plausibility

`npm run analyze:model` writes `work/model-sensitivity.json`: 24 baseline seeds and 12 common-seed scenarios vary administrative capacity, opening debt/GDP, rehabilitation scale and world cocoa price level. Each perturbation is an explicitly synthetic model scenario. These are not fitted coefficients, a probability distribution or validated prediction intervals.

In the initial infrastructure run the no-new-policy four-year real-GDP CAGR ranged **4.15–4.53%** across 24 seeds. Ghana's published annual real growth for 2021–2025 was **5.1%, 3.8%, 3.1%, 5.8%, 6.0%** in the [BoG annual report, tables 3.1/3.3](https://www.bog.gov.gh/wp-content/uploads/2026/06/BoG-2025-Annual-Report-and-Financial-Statements-1.pdf). This is a deliberately single June-2026 vintage; July revises 2024 growth to 5.7%. Annual observations and a four-year model average are different statistics. The model's ordinary path lies within that broad history, but is materially smoother and has not reproduced a historical episode out of sample.

The same source's end-year CPI inflation includes **54.1% in 2022**. The present model caps inflation at 35%, so it **cannot reproduce that crisis**. This is a model limitation, not evidence that such inflation is impossible. A crisis/default reconstruction, exchange-rate valuation of external debt, and independently reconciled SOE obligations remain outside this bounded model.

Higher administrative capacity in the rehabilitation sensitivity accelerates implementation and removal of old trees, producing larger early farmer-income losses before harvest recovery. Larger rehabilitation scale likewise deepens the temporary loss. Those outcomes explain why more implementation need not immediately raise welfare. They require agricultural calibration before interpreting magnitudes empirically.

Changing only the opening world cocoa price from US$2,500 to US$7,000 per tonne changes export valuation in the current model but leaves farmer-income index outcomes unchanged under the same percentage shocks. Farmer income responds to harvest and commodity-shock changes, not that starting absolute price level. Farmgate/contract/spot-price transmission needs further calibration; the current response must not be presented as an estimated pass-through.

Every displayed health, education, life-satisfaction, freedoms, inequality and environment index is a model proxy unless a matching observed definition is explicitly cited. The model keeps life satisfaction separate from approval. No universal winning score is calculated.

Matching broad historical ranges is only a plausibility screen. It is neither causal identification nor proof that the game predicts policy outcomes. See `docs/research/README.md` for unavailable data and source-vintage reconciliation.

## Coordinator final verification, 7 September 2026

- Final `npm run check:release`: **34/34 tests pass**, TypeScript passes, production static export succeeds, and `check:static` verifies 28 exported files and one module-worker asset with no missing HTML references. Log: `work/release-check.log`; hashes: `work/static-release-manifest.json`.
- Full authored-source `npm run lint` passes; log: `work/release-lint.log`. No force dependency upgrades were used.
- Focused live browser verification covers all five WebMCP schemas, invalid-input rejection without campaign mutation, same-shock comparison without live-state mutation, policy preview/submission, quarter advancement and autosave/reload. The final static build independently ran its emitted module worker and reproduced the deterministic cocoa transition. See `docs/WEBMCP-VERIFICATION.md`.
- Responsive layouts, semantic controls, keyboard targets and error states received source/design review. Broad visual screenshots and responsive browser manipulation were not performed. Full campaign/election/legacy, storage, evidence and fiscal invariants were exercised by the automated suite.
- Review fixes include branch archive identity by ID/name/quarter, independent archive recovery from a corrupted active save, shared preview/delivery estimates, real delivery-arrangement choices, term-limit succession, equal comparison horizons and stricter import/policy validation.
- Model transition coefficients did not change after the recorded sensitivity run. Known inflation-crisis and cocoa-price-transmission limitations remain visible in the game.
- Exact validated application source committed and pushed as `8ea6455cd3e726f2e27876249fb1deba02603984`; source worktree is clean. Archive contains static output and hosting metadata only.

## Published release

- URL: https://one-ghana-astra.ybquansah.chatgpt.site
- Access: owner-private. Created in this flow with unchanged owner-only access; the private publishing operation verified that scope. No access expansion was requested or performed.
- Site: `appgprj_6a9f1ca041108191932b906200bab87b`.
- Saved version 1: `appgprj_6a9f1ca041108191932b906200bab87b~appgver_a877585648b8819192e8873f09e5d507`.
- Deployment: `appgdep_6a9f2808d3908191857f9464e6e8ee80`; terminal status **succeeded**, reported at `2026-09-07T21:11:27.849392+00:00`.
- Source: `8ea6455cd3e726f2e27876249fb1deba02603984`. Archive SHA-256: `2a6b8fbafbeb24359a7f1cbebb938c4bc2e92f542787447dc194fcca7a747b7d`.
- Browser handoff targets the existing game tab. Local production WebMCP validation is recorded above; no claim of hosted browser action testing is made.

All five requested roles have completed their work. Further research beyond the release cutoff or expanded empirical calibration is future work, not an unattended ongoing process.
