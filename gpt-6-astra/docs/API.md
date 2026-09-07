# One Ghana engine API

Import public functions/types from `@/src/engine` and `POLICIES`, `POLICY_FAMILIES` from `@/src/data/policies`. Monetary flows are GH₵ billions per quarter; realGDP/nominalGDP are annual GH₵ billions at starting/current prices respectively. Rates and scores use 0–100 percentage points. Fictional campaign starts Q1 2027 with evidence frozen 4 September 2026; no claim about Ghana's real electoral calendar.

```ts
type FundingSource = 'reallocation' | 'tax' | 'borrowing';
type Beneficiary = 'national' | 'rural' | 'vulnerable';
type Safeguard = 'standard' | 'transparent' | 'community';
interface PolicyProposal {
  policyId: string;
  scale: number; // 0.25 to 2; default 1
  funding: FundingSource;
  beneficiaries: Beneficiary;
  safeguard: Safeguard;
}
createCampaign(options?: { seed?: number; name?: string }): GameState
previewProposal(state: GameState, proposal: PolicyProposal): PolicyPreview
submitPolicy(state: GameState, proposal: PolicyProposal): GameState
advanceQuarter(state: GameState): { state: GameState; report: TurnReport }
comparePolicies(state: GameState, proposals: PolicyProposal[], quarters?: number): BranchComparison[]
runLegacy(state: GameState): LegacyScenario[]
branchCampaign(state: GameState, name?: string): GameState
serializeCampaign(state: GameState): string
deserializeCampaign(json: string): GameState
validateCampaign(value: unknown): { valid: boolean; errors: string[] }
```

`GameState`: `id`, `name`, `schemaVersion`, `modelVersion`, `datasetVersion`, `seed`, `quarter` (0–32), `year`, `quarterOfYear`, `phase` (`presidency`/`legacy`), `tutorialCompleted`.
- `economy`: `realGDP`, `nominalGDP`, `growth`, `inflation`, `unemployment`, `exchangeRate`, `reservesUSD`, `cocoaProduction`, `cocoaFarmerIncome`, `electricityReliability`, `privateInvestment`.
- `fiscal`: `revenue`, `baseSpending`, `policySpending`, `debtService`, `balance`, `debt`, `debtToGDP`, `cash`, `borrowingLimit`, `annualBudget`, `yearSpending`.
- `institutions`: `parliamentSupport`, `administrativeCapacity`, `procurementIntegrity`, `judicialCapacity`, `accountability`, `governmentApproval`, `policyRate`.
- `welfare`: `livingStandards`, `jobs`, `health`, `education`, `lifeSatisfaction`, `inequality`, `freedoms`, `environment`; separate scores, no universal winning score.
- `regions`: `{id,name,population,poverty,output,agricultureShare,servicesShare,incomeIndex,employmentRate,serviceAccess,environment}`.
- `households`: `{id,name,livelihood,regionId,populationWeight,incomeIndex,consumptionIndex,jobSecurity,foodSecurity,description}`.
- `activePolicies`: `{id,proposal,status,progress,approvalQuarter,startQuarter,spent,implementationQuality,delayReason}`; status `approved`, `implementing`, `completed`, `rejected`, `suspended`.
- `history`: metric snapshots; `reports`: turn reports; `election`: latest result or null; `baseline`: frozen initial parameters.

`PolicyDefinition`: `id`, `name`, `family`, `summary`, `legalRoute`, `setupCost`, `recurringCost`, `implementationQuarters`, `approvalDifficulty`, `capacityRequired`, `benefits`, `tradeoffs`, `mechanism`, `evidenceIds`, `assumptions`.

`PolicyPreview`: `proposal`, `definition`, `valid`, `errors`, `quarterlyCost`, `annualCost`, `approvalProbability`, `implementationQuarters`, `fiscalHeadroom`, `fundingExplanation`, `mechanisms`, `tradeoffs`, `scenarioRange: {low,central,high}` (each `{farmerIncome,gdp,approval,debt}` deltas), `rangeLabel`.

`TurnReport`: `quarter`, `title`, `summary`, `attempted`, `implemented`, `mechanisms`, `external`, `uncertainties`, `householdChanges: {id,name,incomeChange,explanation}[]`, `fiscalExplanation`, `election`.

`BranchComparison`: `label`, `proposal`, `state`, `delta: {gdp,farmerIncome,debt,approval,livingStandards}`, `reports`, `sharedShockSeed`.

`LegacyScenario`: `id` (`maintenance`, `partial-reversal`, `external-stress`), `name`, `description`, `years: {year,gdp,livingStandards,environment,inequality,debtToGDP}[]`, `assumptions`.

Module Worker request `{id,action,payload}`; actions `create`, `preview`, `submit`, `advance`, `compare`, `legacy`, `import`, `export`; replies `{id,ok:true,result}` or `{id,ok:false,error}`. `createEngineClient()` from `client.ts` exposes `request(action,payload)` and `dispose()` with fallback when Workers unsupported. Payloads: create options; preview/submit `{state,proposal}`; advance/legacy/export `{state}`; compare `{state,proposals,quarters?}`; import `{json}`. Long forecasts and comparisons use the worker.

Persistence: `saveCampaign(state)`, `loadCampaign()`, `clearSavedCampaign()` from `storage.ts`. Invalid save throws actionable error; no saved campaign returns null. Versions and frozen baseline preserved through export/import.

Transitions are pure. Shocks hash `(seed,quarter,stream)` independently of policy choice. All branches therefore face identical shocks. Scenario ranges are heuristic modelling scenarios, never statistical prediction intervals.

## Implementation handoff additions

`PolicyProposal.implementation?: 'agency' | 'district' | 'partnership'` is optional for compatible fixtures, defaults to agency. `defaultProposal(policyId)` supplies agency. National agency delivery uses existing capacity. District delivery costs 8% more, begins more slowly, and improves rural participation when targeted. Partnerships cost 15% more; specialist delivery depends on procurement integrity. These are independent choices from safeguards and never transfer parliamentary or judicial authority.

`Economy` additionally exposes `priceIndex`, `sectorOutput`, `exportsUSD`, `worldCocoaPriceUSD`, `processingCapacity`, and `cocoaProcessed`. Capacity, output and processing quantities use thousand tonnes; export amounts use annual US$ billions. Processing requires completed capacity, electricity and available beans (a visible model assumption assigns 35% of total beans to eligible domestic processing). There is no productive new-plant effect during construction. The baseline freezes initial capacity and cocoa export value.

`BranchComparison` includes `quartersSimulated` and `horizonNote`. Every branch is capped at the same next-election boundary (quarter 16 or 32), even when the requested horizon is longer. Baseline branch is the first result, with `proposal:null` and zero deltas. GDP delta is annual real GH₵ billions; farmer income is index points with initial value 100; debt is GH₵ billions; approval is percentage points; living standards is proxy score points.

Preview ranges now run the actual quarterly engine for up to four quarters, capped at the next election, conditional on passage. Three matched treatment/control simulations vary delivery capacity and procurement assumptions while sharing external shocks. Each metric's low/high values are an envelope across these runs; central is the unchanged-capacity simulation. The envelope is not a probability or validated prediction interval. Thus physical prerequisites, approval assumptions, replanting losses, financing and delays agree with gameplay.

`ElectionResult.kind` is `reelection` at quarter 16, and `succession` at quarter 32. At quarter 32 the constitutional term limit always ends the player's presidency; `won` then refers to the fictional governing-party successor outcome. Render `reason` to avoid implying a third presidential term.

Calendar fields describe the quarter about to be governed. `quarter` counts completed quarters; `quarter:0` means fictional Q1 2027 is next, and `quarter:4` means fictional Q1 2028 is next. Quarterly fiscal flows are the most recently completed quarter. Annual appropriation and year-to-date spending reset at the Q4/Q1 boundary. Programme funding is constrained by the remaining appropriation after service and interest commitments; reallocation also has a services ceiling. Tax surcharges fund delivered costs and lower disposable income; borrowing changes debt/cash, never tax revenue or foreign reserves.

Archive storage exports `archiveCampaign(state)`, `loadArchivedCampaigns(): GameState[]`, `removeArchivedCampaign(id, quarter?, name?)`, and `MAX_ARCHIVED_CAMPAIGNS` (12). Archive the current campaign before replacing it with a branch, imported file, restored snapshot or new campaign. The archive validates before mutation; a full or corrupt archive throws rather than discarding old snapshots. Main autosave remains untouched if archiving fails. Offer archive export/removal controls when full. `loadCampaign()` and `loadArchivedCampaigns()` preserve bad JSON for recovery and surface actionable errors.

Known dataset vintages are retained in `SUPPORTED_DATASET_VERSIONS`; append future supported vintages rather than replacing the registry. Existing state uses its frozen baseline. Unknown model/schema versions fail with a migration message. Import validates finite values, positive divisors, population/output/fiscal identities, household weights, physical processing limits, all nested frozen regions and exports, policy configurations, calendar, history, reports and election phase coherence.

The worker protocol and direct UI use the same validation/actions. `client.request()` is generic over the action and returns its exact typed result. Worker crashes reject pending requests. Initialization falls back only where the Worker API is unavailable or construction fails; the main-thread engine remains deterministic. Long scenarios should use the worker in normal browsers.

Archive identity is the tuple `(id, name, quarter)`. UI restore/export/remove handlers must use all three fields. `removeArchivedCampaign(id, quarter?, name?)` supports an exact name filter so sibling snapshots with a shared seed/id and turn are preserved. The browser client exposes read-only `mode` (`worker` or `fallback`) for integration diagnostics.
