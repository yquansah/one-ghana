# Backend / simulation implementation handoff

Status: initial complete engine delivered 7 September 2026. Owned files: `app/src/engine/*`, `app/src/data/policies.ts`, `docs/API.md`, this handoff. No server, paid AI API, database or account is required for gameplay; browser module worker runs all simulations.

Implemented:

- Typed pure deterministic quarterly transitions, frozen research baseline, 16 official regional population projections, synthetic regional economic allocations and weighted fictional livelihood groups.
- 24 templates across all six requested families. Configurable scale, financing, beneficiaries, separate delivery arrangement and safeguards. Legal route, mechanisms, costs, assumptions and resolvable evidence/source links for every policy.
- Legislative rejection, independent court review examples, funding suspension, capacity/procurement delays, implementation resistance and recurring maintenance costs. Announcements produce no productive effect.
- Closed revenue/spending/interest/debt/cash accounting; annual appropriation headroom and reallocation limits; inflation-responsive simulated Bank of Ghana. Treasury and FX reserves remain separate. Sector/regional output sums to real GDP; nominal GDP reconciles to real GDP and price index.
- Cocoa replanting losses, 12-quarter first-harvest lag, disease/weather/world prices, participation and land mechanisms. Processing and generation require completed projects; cocoa throughput respects beans and powered capacity. Export receipts are not added to GDP a second time.
- Household distribution, welfare dimensions, approval distinct from life satisfaction, quarterly causal reports and external shocks. Institutions transmit through project leakage, delivery, contract conditions and actual accumulated private investment, with no direct institutional GDP bonus.
- Four-quarter preview envelopes use actual engine runs under matched delivery assumptions. Campaign comparisons use identical shocks and stop at a common election boundary.
- Election loss at quarter 16 ends control. At quarter 32 the two-term limit always ends control; successor election is explicitly distinct from incumbent reelection. Three deterministic 20-year legacy scenarios cover maintenance, reversal and external stress; durability acts through retention.
- Versioned JSON validation, autosave, bounded recoverable archive, export/import, branching, typed worker protocol and client, main-thread compatibility fallback.

Verification performed in this agent sandbox:

- `npx tsc --noEmit --pretty false`: passed.
- `node --import tsx --test src/engine/*.test.ts`: 20 engine tests passed.
- `npm test`: 29 tests passed including infrastructure's 24 policies × 3 financing paths through presidency/legacy; one static-server test could not bind 127.0.0.1 (`EPERM`) because this child sandbox has no network grant. Root/infra can complete that network-dependent test with its grant. No game-engine test failed.
- Tests cover baseline reconciliation, all policy/source definitions, immutability, deterministic replay, cash/debt and fiscal identities, distributional funding costs, replanting lag, processing gates, suspension, rejection, preview validation/lag consistency, shared-shock election horizons, defeat/term limits, 24-seed numeric stability, all legacy scenarios, archive/autosave import recovery boundaries, corrupt JSON/nested state/zero divisors, and worker protocol parity.

Model limits are explicit calibration assumptions, not missing user permissions: welfare and institution scores are proxies; regional GDP/poverty/livelihood distributions synthetic; policy coefficients and politics not empirically identified; annual legacy scenarios simplify successor decisions; no predicted causal policy effects or statistical confidence intervals are asserted. Scope of research law sources supports simplified institutional routes, not a complete legal interpretation.

Root/remaining release work: final UI browser tests and accessibility, archive selectors/actions, live WebMCP action binding, production worker loading, private hosting verification. Frontend has the complete API and schema additions. Infrastructure owns acceptance tests/server configuration. Re-dispatch backend for concrete integration failures discovered during those checks.
