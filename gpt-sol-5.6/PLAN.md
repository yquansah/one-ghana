# The Ghana Mandate

## First Playable Version — Product and Implementation Plan

**Plan date:** September 3, 2026  
**Historical baseline:** Ghana, 2025–2026  
**Format:** Single-player web simulation  
**Campaign length:** Two four-year terms represented by 32 quarterly turns, with an election after turn 16

## 1. Product vision

Build a serious but approachable policy simulation in which the player becomes the fictional, nonpartisan president of Ghana. The player must improve both economic performance and human welfare while operating through Ghana's political institutions rather than above them.

The game will turn lessons from Daron Acemoglu and James A. Robinson's *Why Nations Fail* into systems the player can manipulate and observe. Inclusive political and economic institutions should generally produce broader, more durable gains. Extractive arrangements may deliver fast benefits to a governing coalition or a narrow group, but should create credible long-run costs such as lower trust, weaker state capacity, greater inequality, corruption, capital flight, unrest, or democratic backsliding.

The book will be the game's primary interpretive lens, not an unquestioned monocausal theory. Outcomes will also reflect human capital, geography, commodity exposure, administrative capacity, regional inequality, demographics, infrastructure, climate, and external shocks.

## 2. Player objective

The player balances four outcome pillars:

1. **Prosperity** — real growth, productivity, jobs, investment, exports, fiscal stability, and household incomes.
2. **Human wellbeing** — health, education, material security, public services, life satisfaction, and regional inclusion.
3. **Institutional inclusion** — rule of law, political accountability, competition, property rights, state capability, voice, and constraints on arbitrary power.
4. **National resilience** — debt sustainability, foreign reserves, energy reliability, climate resilience, economic diversification, and shock absorption.

There is no single perfect score. A policy may improve GDP while worsening debt, inequality, institutional quality, environmental conditions, or public trust. The game should reward durable governing systems rather than merely maximizing one number.

## 3. Scope of the first playable version

The MVP is a focused national policy laboratory rather than a complete model of Ghanaian society.

- One country: Ghana.
- One fictional administration and governing coalition.
- A constitutional system with Parliament, courts, an independent central bank, civil service, elections, local government, regulators, media, and civil society.
- Sixteen regional outcome profiles, with most policy authority remaining national and selected policies targetable by region.
- Thirty-two quarterly turns and an election after sixteen turns.
- A curated set of researched policy levers plus natural-language policy proposals that are matched locally to supported mechanics.
- Both inclusive and extractive strategies are playable.
- No live data feed, cloud account, external AI service, or API key is required.

## 4. Evidence baseline

The game will ship with a versioned evidence snapshot labeled **“Ghana 2025–2026; sources accessed September 3, 2026.”** A relative campaign clock will advance from that baseline; the game will not pretend that each simulated turn corresponds to newly fetched real-world data.

The starting dataset should distinguish observed values from modeled assumptions. Every observed datum should include its period, units, source, retrieval date, and any relevant caveat.

### Core country indicators

| Area | Starting evidence to encode | Primary source |
|---|---|---|
| Economy and population | 2025 GDP of approximately US$114.21 billion; GDP per capita of approximately US$3,257.20; real growth of 6.0%; population of approximately 35.06 million. Life expectancy was approximately 66 years in 2024. | [World Bank — Ghana](https://data.worldbank.org/country/ghana) |
| GDP structure | Q3 2025 shares: services 39.7%, industry 32.1%, agriculture 28.2%, with detailed subsector growth and composition. | [Ghana Statistical Service — Q3 2025 GDP](https://www.statsghana.gov.gh/gssmain/fileUpload/National%20Accounts/Newsletter_Quarterly_2025_Q3_December_2025_Edition_GSS.pdf) |
| Trade partners | In Q2 2025, leading export destinations included the United Arab Emirates (36.3%), Switzerland (13.1%), South Africa (9.0%), India (7.9%), and China (6.3%). | [Ghana Statistical Service — Q2 2025 Trade](https://statsghana.gov.gh/gssmain/fileUpload/Trade/2025_Q2_Trade_Newsletter_11_09_25_Rev_Website.pdf) |
| Export structure | Merchandise exports are highly concentrated in gold, petroleum, and cocoa, creating both fiscal opportunities and commodity-price exposure. | [Ghana Statistical Service — 2024 Trade Report](https://www.statsghana.gov.gh/gssmain/fileUpload/Trade/2024_Trade_Full_Year_Report-_25-02-2025_Final_Print.pdf) |
| Foreign reserves | Bank of Ghana reported gross international reserves of approximately US$12.9 billion, equivalent to about five months of import cover, in June 2026. Different reserve definitions must be labeled rather than combined. | [Bank of Ghana — July 2026 MPC Statement](https://www.bog.gov.gh/wp-content/uploads/2026/07/MPC-Decision-Statement-July-2026.pdf) |
| Fiscal and debt position | Encode the post-restructuring fiscal position, debt constraints, program targets, risks, and the IMF's narrower reserve measures as separate series. | [IMF — Ghana 2026 Article IV and Sixth Review](https://www.imf.org/en/publications/cr/issues/2026/08/04/ghana-2026-article-iv-consultation-sixth-review-under-the-arrangement-under-the-extended-578480) and [Ghana 2026 Budget](https://www.mofep.gov.gh/sites/default/files/budget-statements/2026-Budget-Statement-and-Economic-Policy.pdf) |
| Labor market | More than 15 million people were in the labor force in Q3 2025 and about 87% were employed. Employment was roughly 6 million in services, 5 million in agriculture, and 2.5 million in industry. Headline unemployment was approximately 13%, with youth unemployment and underemployment modeled separately. | [Ghana Statistical Service — Quarterly Labour Force Survey](https://microdata.statsghana.gov.gh/index.php/catalog/132) |
| Multidimensional poverty | Encode regional and urban-rural disparities. In Q4 2023, multidimensional poverty incidence was substantially higher in rural areas (59.8%) than urban areas (26.9%). | [Ghana Statistical Service — Multidimensional Poverty](https://statsghana.gov.gh/gssmain/storage/img/infobank/2023_Q1-Q4_MPI_Report_Bulletin.pdf) |
| Public priorities | Survey evidence placed unemployment, roads, and health among Ghanaians' leading priorities, alongside material deprivation and dissatisfaction with economic management. | [Afrobarometer — Ghana](https://www.afrobarometer.org/articles/unemployment-tops-ghanaians-priorities-amidst-strong-support-for-key-government-initiatives-afrobarometer-survey-show/) |
| Subjective wellbeing | Ghana's average life evaluation was 4.554, ranked 115th for the 2023–2025 period. This is one imperfect input to a broader wellbeing system, not a complete measure of happiness. | [World Happiness Report 2026](https://files.worldhappiness.report/WHR26.pdf) |
| Constitutional structure | Elections, separation of powers, judicial review, parliamentary lawmaking, independent bodies, and constitutional limits form enforceable game constraints. | [Electoral Commission of Ghana](https://ec.gov.gh/electoral-system/) and [Constitution of Ghana](https://judicial.gov.gh/index.php/the-constitution) |
| Extractive-sector governance | Mining and petroleum policy should include licensing, disclosure, beneficial ownership, revenue collection, local impacts, and accountability. | [Ghana EITI](https://eiti.org/countries/ghana) |
| Institutional theory | Use inclusive versus extractive political and economic institutions as a central causal framework while exposing competing explanations and uncertainty. | [Harvard overview — Why Nations Fail](https://www.wcfia.harvard.edu/publications/why-nations-fail) |

The private sector should not be presented as a GDP sector alongside agriculture, industry, and services. It is an ownership and production overlay measured through investment, employment, informality, credit access, firm entry and exit, competition, productivity, and domestic versus foreign ownership.

## 5. Quarterly gameplay loop

Each turn represents one quarter:

1. **Cabinet briefing** — review the economy, budget, public welfare, institutions, regional conditions, risks, and citizen priorities.
2. **Build the agenda** — choose researched policy cards or type a proposal in plain language.
3. **Interpret the proposal** — an on-device matcher returns up to three supported policy templates, explains its matches, and asks the player to select one when ambiguity remains.
4. **Configure the policy** — set intensity, funding, target population or region, implementation mode, and timing.
5. **Use political capital** — place up to three measures on the quarterly agenda.
6. **Institutional response** — Parliament, courts, ministries, regulators, local governments, the central bank, civil society, the public, and markets respond according to their authority, incentives, trust, and capacity.
7. **Resolve the quarter** — seeded external events and implementation conditions affect outcomes.
8. **Causal report** — show what changed, why it changed, who gained or lost, which consequences are delayed, and how confident the model is.

The default interface should show understandable forecasts and causal links. Exact formulas, assumptions, coefficients, and citations should be available one layer deeper.

## 6. Simulation model

A common effect pipeline keeps mechanics explainable:

```text
realized effect
  = base policy effect
  × policy intensity
  × funding adequacy
  × state capacity
  × institutional compatibility
  × implementation progress
  × external shock factor
```

Effects may be immediate, lagged, compounding, or temporary. Policies can interact: reliable electricity makes industrial investment more productive; credible procurement raises the return on public infrastructure; weak courts reduce the benefit of formal property rights; excessive cocoa concentration raises exposure to weather and commodity prices.

### National state variables

- Nominal and real GDP, GDP per capita, growth, productivity, and sector output.
- Inflation, policy interest rate, exchange rate pressure, credit conditions, and foreign reserves.
- Government revenue, expenditure, primary balance, debt service, public debt, and fiscal space.
- Employment, unemployment, youth unemployment, informality, wages, and labor-force participation.
- Poverty, inequality, material security, health, education, housing, infrastructure access, and life satisfaction.
- Exports by product, export destinations, imports, current-account pressure, and commodity dependence.
- Electricity reliability, food security, climate exposure, and environmental damage.
- Trust, approval, polarization, protest risk, media freedom, corruption risk, and electoral support.
- Rule of law, judicial independence, civil-service capability, regulatory quality, political accountability, and constraints on executive power.

### Regional state variables

Each of Ghana's sixteen regions should track a deliberately smaller set:

- Population and urbanization.
- Dominant economic activities.
- Employment and household income.
- Multidimensional poverty and service access.
- Roads, electricity, health, education, and water conditions.
- Local trust, approval, and grievance pressure.
- Exposure to climate, commodity, and displacement risks.

An accessible SVG map should visualize outcomes, with a keyboard-navigable table containing equivalent information.

### Uncertainty and model honesty

- Separate observed values, derived values, assumptions, and invented scenario values.
- Give forecasts ranges rather than false precision where appropriate.
- Show confidence levels for causal relationships.
- Record the source and rationale for every baseline and coefficient.
- Use deterministic random seeds so a saved campaign can be reproduced.
- Include a methodology panel explaining where the simulation is simplified.

## 7. Policy library

The MVP should include approximately 28 configurable policy templates across these groups:

### Institutions and accountability

- Procurement transparency and open contracting.
- Beneficial-ownership enforcement.
- Judicial capacity and case management.
- Civil-service merit and pay reform.
- Audit, anti-corruption, and enforcement independence.
- Local-government fiscal accountability.

### Business, public finance, and competition

- Business registration and formalization.
- SME credit guarantees and financial inclusion.
- Competition enforcement and market-entry reform.
- Property and land-administration reform.
- Tax-base expansion and tax-administration modernization.
- Expenditure reprioritization and debt management.

### Agriculture and cocoa

- Cocoa producer-price reform.
- Extension, disease control, and replanting.
- Irrigation and climate-smart agriculture.
- Feeder roads, storage, and agricultural logistics.
- Crop diversification and domestic processing.

### Extractives and energy

- Mining-license and royalty reform.
- Illegal-mining enforcement and land restoration.
- Petroleum-revenue saving and stabilization.
- Electricity-sector loss reduction.
- Grid reliability and renewable investment.

### Human development and inclusion

- Primary healthcare and maternal health.
- Basic education quality and teacher support.
- Technical and vocational education linked to employers.
- Targeted cash transfers and social protection.

### Structural transformation

- Manufacturing clusters and export facilitation.
- Digital infrastructure and ICT services.
- Tourism, creative industries, and cultural assets.
- Port, customs, and regional trade reform.

Each template should specify legal requirements, budget effects, administrative demands, affected groups, regional applicability, time lags, dependencies, risks, indicators, evidence, and possible implementation modes.

## 8. Inclusive and extractive choices

Where credible, policy templates offer three approaches:

- **Inclusive:** rules-based, broadly accessible, transparent, and contestable. Usually slower or more politically demanding, with wider and more persistent benefits.
- **Discretionary:** targeted through executive or administrative discretion. Faster in some cases, but more vulnerable to favoritism, capture, and reversal.
- **Extractive:** designed to concentrate resources, rents, or power. It may produce rapid revenue, investment, or coalition loyalty, but damages inclusion and creates compounding institutional risks.

Attempts to bypass Parliament, courts, independent agencies, or constitutional limits can fail, be amended, be challenged, trigger public resistance, or undermine those institutions. The player begins with a simple working parliamentary majority but no unilateral constitutional power.

## 9. Example: expanding cocoa production

If the player enters “Increase cocoa production and invest more in cocoa,” the local matcher should propose related supported instruments rather than inventing a new simulation system:

1. Cocoa producer-price and purchasing reform.
2. Extension, disease control, replanting, and climate resilience.
3. Feeder roads, storage, logistics, and domestic processing.

The preview should reveal tradeoffs involving the budget, COCOBOD liquidity, farmer incomes, implementation capacity, export earnings, foreign exchange, climate and disease risk, child-labor safeguards, food-crop displacement, corruption leakage, regional distribution, and commodity concentration. Strong short-run export gains can coexist with greater long-run vulnerability if the player does not diversify.

## 10. Elections and political economy

Turn 16 is an election. Electoral support should depend on more than aggregate GDP:

- Real household conditions and job access.
- Inflation and currency stability.
- Regional distribution of gains and losses.
- Public services and visible implementation.
- Trust, corruption, rights, and institutional legitimacy.
- Campaign credibility and unfulfilled promises.
- Shocks outside the government's control, moderated by perceived competence.

Winning provides a second term. Losing ends the campaign but still produces a substantive scorecard explaining the institutional and welfare legacy. The player may also complete two terms and receive a historical assessment of durability, inclusion, and resilience.

## 11. Web experience

Build a single-route React and TypeScript application with six primary sections:

1. **Cabinet** — quarterly briefing, urgent decisions, agenda slots, and turn resolution.
2. **Country** — macroeconomic, fiscal, labor, trade, welfare, and risk dashboards.
3. **Regions** — sixteen-region map, comparison table, and targetable outcomes.
4. **Institutions** — Parliament, courts, civil service, central bank, regulators, local government, media, and civic constraints.
5. **Evidence** — definitions, data periods, citations, assumptions, formulas, and confidence.
6. **Journal** — policy history, causal reports, promises, election results, and player reflections.

The visual language should feel like a national briefing room rather than an arcade game. Ghana's colors can provide restrained functional accents for status and navigation. Charts must remain legible without color alone, support reduced motion, and have textual alternatives.

Use Recharts for standard charts and a custom accessible SVG for the regional map. Use a typed client-side store, browser local storage, multiple save slots, and JSON export/import.

## 12. Data and software design

Core TypeScript types:

```ts
type SourceRecord = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  publishedAt?: string;
  accessedAt: string;
  notes?: string;
};

type ObservedDatum = {
  id: string;
  label: string;
  value: number;
  unit: string;
  period: string;
  sourceIds: string[];
  confidence: "high" | "medium" | "low";
  caveat?: string;
};

type CountryState = Record<string, number>;

type RegionState = {
  regionId: string;
  indicators: Record<string, number>;
};

type InstitutionState = {
  institutionId: string;
  capacity: number;
  independence: number;
  legitimacy: number;
  captureRisk: number;
};

type PolicyDefinition = {
  id: string;
  title: string;
  tags: string[];
  legalPath: string[];
  costs: Record<string, number>;
  effects: PolicyEffect[];
  sources: string[];
};

type PolicyProposal = {
  policyId: string;
  intensity: number;
  funding: number;
  targetRegionIds?: string[];
  implementationMode: "inclusive" | "discretionary" | "extractive";
};

type TurnResult = {
  turn: number;
  changes: StateChange[];
  events: GameEvent[];
  explanations: CausalExplanation[];
};

type GameSave = {
  schemaVersion: number;
  seed: string;
  state: SimulationState;
  history: TurnResult[];
};
```

The simulation engine should be pure and deterministic: given the same state, proposals, and seed, it returns the same result. UI components should never directly mutate game state.

### Natural-language proposal matching

Implement an entirely local matcher:

- Normalize the player's text.
- Score policy-template titles, descriptions, sectors, problems, instruments, and synonyms.
- Return up to three ranked matches with short explanations.
- Require the player to confirm a supported template before staging it.
- Explicitly say when a proposal is outside the modeled policy space.

This offers flexible input without pretending the simulation understands unrestricted policy language.

### Optional WebMCP interface

Expose three bounded tools for compatible clients:

- `read_country_brief` — returns the current country summary without changing state.
- `stage_policy` — configures a supported policy proposal but does not advance time.
- `advance_quarter` — resolves a turn after explicit confirmation in the interface.

## 13. Testing and validation

### Data provenance tests

- Every observed datum has a valid source and period.
- Units are explicit and consistently converted.
- Conflicting definitions, especially reserves and labor indicators, remain separate.
- The evidence interface can reach every source used by the baseline.

### Simulation invariant tests

- Fiscal identities reconcile within defined tolerances.
- Population and labor-force measures remain internally consistent.
- Sector shares and trade shares stay within valid bounds.
- Reserves, debt ratios, approval, institutional scores, and wellbeing cannot silently exceed defined ranges.
- Identical seeds and inputs produce identical results.

### Mechanic tests

- Funding a policy beyond administrative capacity produces diminishing returns or leakage.
- Institutional reform changes the effectiveness and durability of later policies.
- Extractive strategies can provide benefits but create observable long-run risks.
- External shocks affect exposed sectors and transmit through trade, revenue, jobs, prices, and welfare.
- Regional targeting changes distributional outcomes and political support.
- Typed proposals reliably match relevant policy templates and reject unsupported requests.

### Balance tests

- No single policy or sector dominates every campaign.
- Cocoa expansion is useful in some circumstances but risky as a universal strategy.
- Debt-financed growth cannot continue indefinitely without macroeconomic consequences.
- Inclusive reform is neither an instant-win button nor consistently inferior to extraction.
- A capable player can complete two terms through multiple viable strategies.

### Accessibility and interface tests

- All controls and map regions are keyboard accessible.
- Charts and maps have equivalent text or table views.
- Focus order, contrast, screen-reader labels, reduced motion, and responsive layouts are verified.
- Save, load, export, and import work across supported browsers.

## 14. Acceptance scenario

A successful first playable build must allow a new player to:

1. Start a campaign from the documented Ghana baseline.
2. Understand the country's economy, institutions, welfare, and regional disparities without reading a separate manual.
3. Type a cocoa-investment proposal and receive sensible supported policy matches.
4. Configure and submit policies through credible political and administrative constraints.
5. Advance quarters and see transparent short- and long-term causal effects.
6. Experience a mix of domestic, political, commodity, and climate events.
7. Reach an election after sixteen turns.
8. Finish or lose a two-term campaign and receive a detailed prosperity, wellbeing, inclusion, resilience, and legacy scorecard.
9. Inspect the source, period, assumption, and formula behind important indicators.
10. Save locally and export a campaign without creating an account.

## 15. Out of scope for the MVP

- Multiplayer or competitive elections.
- User accounts and cloud synchronization.
- Live economic feeds or automatic baseline updates.
- District-level micromanagement.
- Simulation of named living politicians or partisan campaigning.
- Generative AI or a required external API.
- Unrestricted policies unsupported by researched mechanics.
- A claim to predict Ghana's real future or quantify institutional causality with scientific precision.

## 16. Implementation sequence

1. Scaffold the React and TypeScript site, design tokens, navigation, state schema, and deterministic engine shell.
2. Encode sources, baseline data, definitions, and the Evidence section.
3. Implement national indicators, regional profiles, institution states, and simulation invariants.
4. Add the first policy templates and the inclusive/discretionary/extractive effect pipeline.
5. Build the Cabinet loop, agenda, turn resolution, and causal report.
6. Add Country, Regions, Institutions, and Journal views.
7. Implement local natural-language matching and the cocoa acceptance scenario.
8. Add shocks, elections, endgame scoring, local saves, and JSON portability.
9. Run balance, provenance, accessibility, and deterministic tests.
10. Conduct a full 32-turn campaign review and tune coefficients while preserving documented assumptions.

## 17. Guiding principle

The game should teach that policy results emerge from the interaction of incentives, institutions, implementation capacity, distribution, history, and shocks. The player's most powerful achievement is not a temporarily high GDP number; it is leaving behind a Ghanaian state and economy capable of producing broad opportunity after the player's own power ends.
