# Ghana: A Presidency and Institutions Learning Game

## 1. The experience

Build a private web game in which you govern Ghana through economic and political institutions, learning how decisions affect national output and people’s lives.

The agreed design is:

- **Realistic presidential constraints:** Parliament, courts, elections, public finances, administrative capacity, and organised interests affect what you can accomplish.
- **Deep, guided simulation:** begin with cocoa and farmer welfare, then reveal the wider economy.
- **Structured policy builder:** choose an intervention, funding, beneficiaries, implementation arrangements, and safeguards.
- **Quarterly turns:** annual budgets, up to two four-year terms, followed by a 20-year legacy simulation. Losing an election ends your presidency and begins the legacy phase.
- **Transparent explanations:** inspect mechanisms, assumptions, likely tradeoffs, and scenario ranges before deciding.
- **Welfare scorecard:** track economic output, household living standards, jobs, health, education, life satisfaction, inequality, freedoms, and environmental sustainability separately.

Use a current Ghana snapshot with a clearly fictional inauguration and election timetable. Freeze the initial research cutoff at **4 September 2026**; distinguish this alternative history from Ghana’s actual political calendar.

## 2. Ghana’s evidence base

The initial research has established these useful anchors. Completing and reconciling the underlying datasets is the first implementation milestone.

| Indicator | Starting evidence |
|---|---|
| Annual GDP | Reported 2025 nominal GDP: **GH₵1.434 trillion**; real growth: **6.0%**. Sectoral shares: services **45.9%**, industry **31.3%**, agriculture **22.8%**. [GSS briefing reported by GNA](https://gna.org.gh/2026/03/ghanas-economy-grows-by-six-per-cent-in-2025-gss/) |
| Population | Approximately **34.4 million projected for 2026**. [National Population Council statement](https://www.ghanamissionun.org/04132026/) |
| Foreign reserves | June 2026: **US$12.944bn gross**, **US$10.862bn net**, and **5.0 months of import cover** on the gross measure. [Bank of Ghana](https://www.bog.gov.gh/wp-content/uploads/2026/07/Summary-of-Economic-and-Financial-Data-July-2026.pdf) |
| Major exports | BoG reports 2025 gold exports of **US$20.975bn**, cocoa **US$4.001bn**, and oil **US$2.620bn**. [Bank of Ghana](https://www.bog.gov.gh/wp-content/uploads/2026/07/Summary-of-Economic-and-Financial-Data-July-2026.pdf) |
| Export destinations | Reporting of GSS’s 2025 figures places **UAE, India, Switzerland, South Africa, and China** first. Reconcile the full official partner table before freezing the dataset. [Reported GSS figures](https://thechronicle.com.gh/uae-india-lead-ghanas-export-markets/) |
| Employment | Unemployment averaged **12.8%** during Q1–Q3 2025; **21.9%** among ages 15–35. [GSS](https://www.statsghana.gov.gh/news-and-events/press-releases/more-than-one-third-of-ghanas-population-is-youth) |

Build a versioned research library covering:

- **Production and trade:** GDP subsectors, employment, productivity, commodity quantities and prices, processing, exports and imports by product and partner.
- **Public finances and money:** revenue, expenditure, debt service, domestic and external debt, state enterprise obligations, inflation, exchange rates, credit, remittances, investment flows, and reserves.
- **People and places:** all 16 regions, urban/rural differences, age, education, livelihoods, informality, consumption, poverty, food security, health, migration, and access to services.
- **Institutions and infrastructure:** constitutional powers, land tenure, procurement, public administration, justice, electricity, transport, water, and environmental pressures.

Prioritise GSS, BoG, the Ministry of Finance, COCOBOD, Ghana’s sector agencies, and legislation. Supplement with the World Bank, IMF, WTO, DHS, and Afrobarometer. Ghana’s [household survey](https://microdata.statsghana.gov.gh/index.php/catalog/128/study-description) and [Afrobarometer survey](https://www.afrobarometer.org/publication/ghana-round-10-summary-of-results/) provide foundations for household circumstances and public attitudes.

Every observation must retain its source, reference period, publication date, units, definition, and revision status. Separate observations, projections, and modelling assumptions. Keep unavailable values visibly unavailable; document any estimates used by the engine.

Preserve distinctions between nominal and real output, annual and quarterly flows, public and private ownership, and formal and informal activity. Foreign reserves are separate from treasury funds; export receipts are not added to GDP twice.

## 3. Simulation and policy design

### Connected economic and social systems

Use an inspectable numerical model linking sector production, employment, household income, prices, taxation, public services, investment, trade, and environmental conditions.

Represent Ghana through regional economies and weighted household groups. Different livelihoods and circumstances produce different responses to the same policy. Use observed joint distributions where available and label synthetic allocations where necessary. Illustrative households are fictional.

Institutions influence concrete mechanisms: access to markets and credit, security of investment, contract enforcement, allocation of public money, implementation quality, accountability, and the ability to resist reform.

*Why Nations Fail* supplies hypotheses about these mechanisms. Inclusion must not be an automatic GDP bonus. Reforms can impose immediate costs, threaten established interests, and produce benefits only after sustained implementation. The [Nobel Committee’s account](https://www.nobelprize.org/prizes/economic-sciences/2024/popular-information/) provides a complementary explanation of institutional persistence and resistance to change.

Keep monetary policy under a simulated Bank of Ghana response mechanism, reflecting its [monetary policy mandate](https://www.bog.gov.gh/monetary-policy/our-monetary-policy-framework/). Presidential influence operates through the appropriate institutions.

### Initial policy catalogue

Implement these six families, with four configurable templates each:

| Family | Policies |
|---|---|
| Agriculture and cocoa | Farmer pricing; rehabilitation and extension; irrigation and storage; land administration |
| Business and trade | SME credit guarantees; licensing and formalisation; competition enforcement; processing and export investment |
| Infrastructure | Roads and ports; grid maintenance; generation investment; targeted energy support |
| Human development | Primary healthcare; school investment; technical training and apprenticeships; targeted cash support |
| Public finances and resources | Tax policy and compliance; spending reallocation; debt management; mining licensing and royalties |
| Institutional reform | Open procurement and audits; merit-based administration; court capacity and access; local accountability and whistleblower protection |

Each proposal shows its legal route, funding needs, recurring costs, implementation time, affected groups, political support, risks, and evidence.

Policies progress through approval, funding, implementation, and evaluation. Announcing a policy produces no automatic productive benefit. Implementation is constrained by money, staffing, procurement, participation, and institutional resistance.

### Cocoa opening

The tutorial asks you to improve farmer welfare and cocoa productivity within the existing fiscal position.

Compare producer-price support, rehabilitation, processing investment, and institutional improvements. Model the temporary income loss from replanting, the need for farmer participation, disease, weather, land rights, transport, electricity, financing, and world prices. COCOBOD’s [rehabilitation and extension responsibilities](https://cocobod.gh/subsidiaries-and-divisions/cocoa-health-and-extension-division) ground this scenario.

### Learning and uncertainty

Each turn explains:

1. What you attempted and what was implemented.
2. What changed, for whom, and through which mechanisms.
3. What resulted from external conditions.
4. Which conclusions depend heavily on uncertain assumptions.

Allow campaign branches that compare policies under identical external shocks. Present uncertainty as model scenario ranges, not validated prediction intervals.

After leaving office, show 20-year legacy scenarios covering policy maintenance, partial reversal, and external stress. Track whether institutions make improvements durable.

## 4. Application and implementation

Use the Sites starter with React and TypeScript. Run the simulation in a browser worker so forecasts and comparisons do not block interaction.

The interface opens directly into the game:

- **Presidential briefing:** current conditions, decisions awaiting action, budget position, and next turn.
- **Ghana view:** regional map with sector and household drilldowns.
- **Policy workspace:** build, compare, finance, and submit proposals.
- **Institutions view:** legislative support, implementation capacity, accountability, and reform progress.
- **Results and evidence:** welfare trends, causal explanations, campaign comparisons, sources, and assumptions.

Provide engine interfaces for creating a campaign, previewing a proposal, submitting actions, advancing a quarter, and running legacy scenarios. Separate baseline data, model parameters, policy definitions, game state, and turn reports.

Use browser storage for automatic saves, plus versioned export/import and campaign branching. Save the dataset version, model version, policy history, and random seed. Dataset updates apply to new campaigns; existing campaigns retain their original baseline.

Provide a small WebMCP interface using the same game actions and validation as the UI. No paid AI service is required for gameplay or explanations.

Deliver in this order:

1. **Evidence foundation:** sourced data package, reconciliation notes, and documented model assumptions.
2. **Cocoa playable slice:** complete policy-to-outcome loop with households, finances, institutional constraints, and explanations.
3. **Full campaign:** wider sectors, all policy families, regional differences, elections, comparisons, and legacy.
4. **Validated private release:** production build, private hosting, and an in-game guide to the model’s limits.

## 5. Acceptance criteria and defaults

The game is ready when:

- Starting indicators reconcile to their source definitions and periods.
- Fiscal accounts, debt, production, trade, and population accounting remain internally consistent.
- Replanting takes time; processing requires inputs and capacity; spending requires financing.
- The same policy can benefit some households while disadvantaging others.
- Legislative rejection, implementation failure, election loss, and policy reversal work coherently.
- Identical seeds and actions reproduce results; comparisons preserve the same external shocks.
- Save, reload, import, and campaign branching preserve state correctly.
- Baseline and stress scenarios remain numerically stable throughout the presidency and legacy period.
- Every policy has a causal explanation and clearly identified assumptions.
- The player can complete the cocoa lesson, govern a full term, and understand why outcomes differed from expectations.

Defaults: single player, English, desktop-first responsive interface, private hosting, fictional political personalities within real institutional structures, and no universal winning score. Life satisfaction remains distinct from government approval; any simulated wellbeing measure is labelled as a model proxy.

Historical comparisons and sensitivity tests will assess plausibility. Matching historical data alone will not be presented as proof that the game predicts policy effects.
