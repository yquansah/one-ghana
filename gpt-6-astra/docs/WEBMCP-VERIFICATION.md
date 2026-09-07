# Live WebMCP verification

Verified on 7 September 2026 in the supported Codex in-app browser, against the integrated localhost game in development and the final static production build.

All five registered tools exposed the expected JSON schemas and side-effect annotations: `read_presidency`, `preview_policy`, `submit_policy`, `advance_quarter`, and `compare_policies`. Each used the same frontend serial action queue and campaign state as the player interface.

## Valid cases

- Read the initial campaign: seed 20260904, quarter 0, pinned dataset `ghana-2026-09-04.v1`, model `1.0.0`, no policies.
- Preview cocoa rehabilitation with reallocation funding, rural beneficiaries, transparent safeguards and district delivery. Reported cost, approval probability, real delayed implementation and negative initial farmer-income scenario.
- Compare rehabilitation with farmer-price support over eight quarters. Both policy alternatives and the baseline used seed 20260904 and the same eight-quarter horizon; the live campaign stayed at quarter 0.
- Submit rehabilitation: approved, zero spending and zero implementation at announcement.
- Advance one quarter: progress 6.767489711934157%, spending GH₵0.8316bn, farmer-income index 97.3982395403196. Fiscal explanation and read-back state agreed.
- Reload the page, refetch registered tools, and read back the same quarter, proposal, implementation, debt, cash and welfare values. This verified live autosave/reload through the browser.

## Invalid cases

Unexpected read parameters, unknown preview policy, submission scale 10, an unsupported multi-quarter advance argument, and a comparison containing only one proposal all failed intentionally. The campaign remained at quarter 0 with no policies after this invalid-input batch.

These are focused WebMCP and game-state integration checks. Broad visual screenshots, responsive browser manipulation and unrelated browser UI testing were not performed. The automated engine, storage and release checks provide the additional verification recorded in RELEASE.md.

## Final static production build

The exact release artifact was served locally on port 4173. All five tools registered after hydration. `read_presidency` confirmed `simulationMode: worker`, quarter 0 and the pinned dataset/model. The cocoa district-delivery preview reported 15 quarters using the same delivery-quality and resistance formula as the simulation. Submitting and advancing produced the same deterministic first-quarter progress, GH₵0.8316bn expenditure and farmer-income index as the development check above. No application server or remote model was involved.
