# Ghana: A Presidency and Institutions Learning Game

## 1. The experience

Build a free public SaaS web game with Google sign-in in which you govern Ghana through economic and political institutions, learning how decisions affect national output and people’s lives.

The agreed design is:

- **Realistic presidential constraints:** Parliament, courts, elections, public finances, administrative capacity, and organised interests affect what you can accomplish.
- **Deep, guided simulation:** begin with cocoa and farmer welfare, then reveal the wider economy.
- **Structured policy builder:** choose an intervention, funding, beneficiaries, implementation arrangements, and safeguards.
- **Quarterly turns:** annual budgets, up to two four-year terms, followed by a 20-year legacy simulation. Losing an election ends your presidency and begins the legacy phase.
- **Transparent explanations:** inspect mechanisms, assumptions, likely tradeoffs, and scenario ranges before deciding.
- **Welfare scorecard:** track economic output, household living standards, jobs, health, education, life satisfaction, inequality, freedoms, and environmental sustainability separately.

Use a current Ghana snapshot with a clearly fictional inauguration and election timetable. Preserve **4 September 2026** as the original historical scenario cutoff. Continuous research produces separately versioned evidence and approved scenarios; distinguish the fictional campaign calendar from current real-world dates.

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

## 4. SaaS architecture: Cloudflare and WorkOS

The agreed public beta uses Cloudflare Workers with Static Assets for the existing React/TypeScript frontend and same-origin application API; D1 for account-owned campaigns, revisions, preferences, research metadata and audit records; private R2 for permitted research artifacts; Cron Triggers for hourly collection and daily discovery/digests; Workflows for research stages and review coordination; and Queues for email distribution. WorkOS AuthKit provides Google sign-in. Resend delivers emails and OpenAI Responses provides bounded research extraction/synthesis. Supabase is not part of this architecture.

Preserve the existing private Sites demo. All source, infrastructure configuration, documentation and work artifacts stay within gpt-6-astra. The default static build remains the historical demo; a separate SaaS build mounts the account-aware application. Use version-controlled Wrangler configuration with separate staging and production resources and managed secrets.

### Accounts and campaigns

Handle Google OAuth login/callback, secure HTTP-only sessions, refresh and logout in the Worker. Authenticate every protected request and protect cookie-authenticated mutations against CSRF. Map verified WorkOS identities to internal account IDs; never accept browser-supplied email as ownership. D1 access is server-only and every campaign query enforces ownership.

Keep server mutations authoritative using the same deterministic engine. Browser module workers compute previews and comparisons. Campaign revisions and idempotency keys prevent duplicate turns and cross-device overwrites; conflicts preserve drafts and offer reload/retry. Cloud saves, branches, versioned JSON import/export and explicit migration of local saves support portability. Original saves retain their baseline, seed, model version and outcomes. A classic campaign must explicitly create a separate live-event branch before enabling current events.

Retain the briefing, regional/household view, policy workspace, institutional constraints, results and evidence. Add account campaign controls, Ghana-now briefings, scenario review, notification preferences and an administrator research dashboard. Extend WebMCP through the same authenticated and validated handlers as the UI.

### Current events

Every briefing separates reported facts, attributed announcements, interpretation and model assumptions. Show source links, publication/retrieval dates, event dates, relevance and uncertainty. Players preview and accept reviewed scenarios for a future fictional game quarter. Reading a briefing or clicking an email never applies an event. Retain immutable applied event payloads and mapping versions; deterministic comparisons use the same accepted events and external shocks. Corrections supersede public items without rewriting campaign history. AI cannot invent executable rules or directly alter simulation state.

Initial mapping v1 supports bounded cocoa-yield, electricity-availability and external-demand scenarios. All mappings require human approval and documented assumptions. They are teaching parameters, not estimated real policy effects. Events outside the reviewed catalogue remain briefings.

## 5. Continuous research and email

Run hourly approved-source checks and daily broader discovery in cloud jobs independently of browsers and Codex. Collect source evidence, reconcile units/reference periods, cluster duplicates, retain provenance, detect revisions, and draft source-supported briefings. Start with official Ghana statistical, monetary, fiscal, agricultural, legislative, judicial and electoral institutions, supplemented by reputable reporting.

Automatically publish only validated official-data briefings and clearly attributed announcements. Disputed political claims, conflicting evidence, substantive interpretation and every new numerical event mapping require administrator review. The project owner is the initial administrator. Missing source support fails closed; unavailable data stays unavailable. Prefer source metadata, hashes and permitted excerpts; store larger permitted artifacts privately. New baseline datasets require their own reconciled release rather than being inferred from individual news stories.

Persist job progress, deduplicate processing, retry bounded failures and surface source freshness, review backlog, failed jobs and spending. A source or AI outage leaves gameplay usable with a visible freshness notice. Research is generated once and shared across players; selected topics and active policy sectors determine relevance.

Email starts disabled until explicit consent. Offer daily digests at **08:00 Africa/Accra**, weekly summaries or off. Major-event alerts require separate opt-in and a reviewed designation, capped at two per day. Skip empty digests. Each message explains the development, sources, relevant game tradeoffs and links to its briefing.

Use a durable outbox and Cloudflare Queues to Resend; queue delivery is at least once, so enforce database and provider idempotency. Recheck consent before sending, verify delivery webhooks, suppress bounces/complaints and honor unsubscribe without login. Never send from an unverified domain. Secrets remain server-side.

## 6. Delivery and operations

1. Update this plan and conflicting architecture/operations documents.
2. Implement Cloudflare bindings, WorkOS login, D1 ownership, cloud campaigns and migration.
3. Implement durable research, provenance and hybrid editorial publication.
4. Integrate optional event scenarios and Ghana-now briefings.
5. Implement consent-based queued email, operational controls and public-beta deployment.

Use a **$250 monthly operating ceiling**: reserve fixed platform/email costs before allocating variable research costs, share summaries, bound requests/tokens, meter spending, alert on thresholds and suspend discretionary work before its budget is exhausted. Never automatically purchase upgrades. Provider billing alerts alone are not hard application limits. Deployment requires valid Cloudflare access, production WorkOS/Google settings, OpenAI and Resend secrets, an approved application origin and a verified sender domain. Staging sending/research remain off until verified; production enablement follows staging acceptance. Preserve rollback to the existing private demo.

## 7. Acceptance and defaults

Retain all original simulation acceptance: source definitions/periods reconcile; fiscal/debt/production/trade/population accounting is consistent; replanting, capacity and financing constraints apply; households experience different outcomes; rejection, failure, elections and reversal work; seeds/actions reproduce results; comparisons preserve shocks; saves/branches preserve state; full-term and legacy scenarios remain numerically stable; and every policy explains assumptions and mechanisms.

Additional SaaS acceptance:

- Two accounts cannot read or mutate each other's campaigns; OAuth/session/CSRF validation and logout work.
- Legacy imports preserve original data; concurrent writes and duplicate requests cannot lose or repeat turns.
- Accepted events apply once at the intended turn, survive export/import, and replay identically through corrections.
- Disputed sources, malicious document instructions, duplicate stories, malformed AI output and failed jobs cannot bypass review or invent approved effects.
- Email respects current consent, deduplicates retries, skips empty digests and suppresses unsubscribed/bounced recipients.
- Research continues while browsers are closed; freshness, failures and budget limits are visible.
- Existing engine tests pass alongside backend, migration, research, email and integration tests.

Defaults: single player, English, desktop-first responsive interface, free public beta, Google identity, cloud persistence, fictional political personalities and timetable, optional events and no universal winning score. Life satisfaction remains distinct from approval. Monetary values, observed data and model proxies retain clear labels. Historical plausibility is not proof of causal prediction. Billing, multiplayer, enterprise organizations and automatic event application are out of scope.
