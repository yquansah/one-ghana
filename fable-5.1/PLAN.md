# Ghana Nation-Builder — "Why Nations Fail" Simulation Game

## Context

The user is reading *Why Nations Fail* (Acemoglu & Robinson) and wants a playable way to internalize its thesis: inclusive economic/political institutions drive sustainable prosperity; extractive ones deliver short-term growth that stagnates. The game: player is head of state of **modern Ghana (2025)**, making yearly policy/budget decisions that balance economic output against human happiness. Real-world Ghana data (researched from IMF, World Bank, Ghana Statistical Service, Afrobarometer, etc.) seeds the simulation.

**Confirmed decisions (user-approved):**
- Start: modern Ghana 2025, real data baked in as static seed (no live APIs)
- Yearly turns; elections every 4 turns (2028, 2032…) matching Ghana's real cycle
- V1 = full core loop: policies + budget, institutional feedback loops, 8 factions, events, elections, coup, win/fail states, chart dashboard
- Stack: React 18 + Vite + TypeScript + Tailwind + Recharts + zustand; localStorage saves; no backend
- New project at `/Users/yoofiquansah/Desktop/ghana-nation-builder`

## Real-world seed data (from research)

**Economy 2025:** GDP $112B nominal ($3,190/capita), growth 5.7%, inflation ~15 (recent range 9–24%, spiked >50% in 2022), policy rate 27%, debt/GDP ~62% (post-2022 default restructuring, active IMF ECF program w/ deficit ceiling ~4%), tax revenue 13% of GDP, reserves $8.98B (~4 months import cover). Exports $20.4B: gold 51%, oil 18%, cocoa 7% → 83% commodity concentration. Top partners: Switzerland, China, India, USA. Informal sector 65–75% of jobs. Galamsey ≈35% of gold output, smuggled/untaxed, severe river/farmland damage.

**Society:** pop 34.5M (+1.81%/yr), median age 21.6, 59% urban. Happiness 4.34/10 (WHR rank 125). HDI 0.602, 37% inequality loss; north-south gap (Accra 0.670 vs Northern 0.496). Poverty 23.4% (multidimensional 45.6%). Youth unemployment very high. Trust in president 28%; military most-trusted institution. CPI corruption 43/100. ~80% land under customary chieftaincy tenure. Ethnic: Akan 45.7%, Mole-Dagbani 18.5%, Ewe 12.8%, Ga-Dangme 7.4%.

**Politics:** Fourth Republic since 1992, NPP/NDC two-party, unbroken peaceful transfers, 4-yr terms max 2. 2024: Mahama (NDC) 56.5%, 184/276 seats.

**Book → mechanics:** inclusive loop (property rights + pluralism → innovation → growth → reinforcement); extractive loop (rent capture → elite power → reform resistance → decay); elites block creative destruction; extractive growth works ~5–10 turns then stagnates (the temptation must be real); Cocobod monopsony as Ghana's textbook extractive institution.

## Architecture

Hard rule: `src/engine/` + `src/data/` are pure TypeScript — no React, no `Math.random` (seeded mulberry32 PRNG only, call-count persisted for determinism). Enforce via ESLint `no-restricted-imports` scoped to those dirs.

```
ghana-nation-builder/
├── scripts/simulate.ts           # headless balance harness (tsx)
├── src/
│   ├── engine/
│   │   ├── types.ts              # all interfaces
│   │   ├── constants.ts          # EVERY tuning number, named
│   │   ├── rng.ts                # mulberry32; rngCalls tracked in state
│   │   ├── engine.ts             # resolveTurn / resolveEventChoice / finalizeTurn
│   │   ├── selectors.ts          # inclusivity, nationScore, coupRisk, budget math
│   │   └── systems/              # policies, economy, institutions, factions,
│   │                             # events, happiness, elections, coup, scoring
│   ├── data/                     # seed.ts (Ghana 2025), policies.ts (~24),
│   │                             # events.ts (~14), factions.ts, advisors.ts
│   ├── state/gameStore.ts        # zustand; only place engine is called from UI
│   ├── state/persistence.ts      # localStorage, SAVE_VERSION
│   └── components/               # layout/, dashboard/, policies/, budget/,
│                                 # events/, election/, advisor/, report/, common/
└── tests/                        # engine unit tests, determinism test,
                                  # balance/archetypes.test.ts (crossover contract)
```

## Data model (key shapes)

- **GameState**: `meta` (seed, rngCalls, turn, year 2025+turn, phase: planning|events|election|gameover, ending), `institutions` (0–100: propertyRights 48, politicalPluralism 65, stateCapacity 45, eliteCapture 55, innovation 38, legitimacy 52, corruption 57), `economy` (gdp 112, sectorShares .45/.30/.25, commodity price indices gold/oil/cocoa =100, exportConcentration 83, inflation 15, debtToGdp 62, reservesMonths 4, taxRevenue 13, galamseyShare 0.35, imfProgramActive true), `society` (pop 34.5M, happiness 43.4 internal /100, poverty 23.4, youthUnemployment 65, northSouthGap 60), `factions` (8 approvals), `budget` (7 categories incl. deficitSpending), `policies` (enacted + cooldowns), `events` (pendingQueue, log, cooldowns), `politics` (termNumber, nextElectionYear 2028, lastVoteShare 56.5, electionsRigged, thirdTermAmendment), `history: TurnSnapshot[]` (flat, chart-ready, with annotation strings).
- **Factions** (electoralWeight/seed approval): cocoaFarmers .10/55, urbanWorkers .22/50, businessElite .08/52, military .05/50 (coupRelevance 1.0), chiefs .08/55, civilServants .10/50, northernRegions .15/45, youth .22/42.
- **Policy**: data-driven effect DSL — `Effect = instant | annual (w/ rampYears) | delayed | growthMult | revenueFlat` targeting a whitelisted `StatPath` union; plus `annualCostB`, duration, cooldown, prerequisites (Condition[]), mutuallyExclusiveWith, factionShift, tags (inclusive|extractive|neutral), `lesson` (book pedagogy text). 3 bespoke policies (rigElection, exitImf, thirdTermAmendment) via `special` registry key in engine — data stays serializable.
- **GameEvent**: kind random|scripted|triggered, weight/trigger conditions/scriptedYear, 1–3 EventChoices (effects + factionShift + cost), optional lesson.

## Engine: turn pipeline (per year)

1. Validate + apply player actions (staged policies + budget); reject if over budget or prereqs fail; inclusive-policy cost × `(1 + max(0, eliteCapture−50)/50)` — **the reform-resistance markup, shown in UI**
2. Active policy annual/delayed effects (ramped)
3. **Economy**: commodity random walk (σ: gold .10, oil .15, cocoa .12, clamp 40–220); windfall = exportShare(≈.18) × weighted Δprices × 0.25; growth = 5.9 base + 0.06·(innovation−38) + 0.04·(stateCapacity−45) + windfall + policy mults − 0.08·max(0,inflation−12) − 0.05·max(0,debt−70) − 0.03·max(0,eliteCapture−65), clamp ±[−8,12] (calibrated: seed → ~5.7%); revenue = gdp·tax% + flats; debt/reserves/inflation update (inflation sticky AR: 0.6·prev + 0.4·(8 + 1.5·deficit% + depreciation shock if reserves<3mo − rate effect)); IMF deficit >4% GDP → review-failed event next turn
4. **Institutions** (the thesis; drifts clamped ±4/yr, bound-damped near 0/100):
   - `inclusivity = (propertyRights + pluralism + (100−eliteCapture) + (100−corruption))/4` (seed ≈ 50 — knife's edge)
   - innovation chases inclusivity with lag (0.20·gap) + education spend − elite blocking (0.05·max(0,eliteCapture−55))
   - eliteCapture += 0.6·extractivePressure + 0.04·(corruption−50) − 0.05·(pluralism−50) − reforms
   - corruption += 0.05·(eliteCapture−50) − 0.06·(stateCapacity−45) — vicious circle legs
   - propertyRights/pluralism erode −0.02·max(0,eliteCapture−60) each
5. **Factions**: approval += Σ interest-weighted stat deltas + 0.10·(50−approval) mean reversion
6. **Events roll**: scripted-for-year + triggered (conditions) + weighted random draw {0:30%,1:50%,2:20%} → pendingQueue → phase 'events' (modal choices) → finalize
7. **Happiness/legitimacy**: happiness' = 0.5·prev + 0.5·(0.30·econSat + 0.25·services + 0.25·factionApproval + 0.20·(100−2·poverty)); legitimacy += 0.4·Δhappiness + pluralism term − scandal/rig penalties
8. **Election/coup check** (below)
9. Snapshot to history, endings check, year++

**Determinism contract**: same seed + same action script → deep-equal state (tested).

## Elections & coup

- **Vote share** = 50 + 0.30·Σ(weight·(approval−50)) + 0.15·(happiness−50) + 3·clamp(2yr gdp/capita growth, ±2) − 0.4·max(0,inflation−15) − 2.5·(term−1) + rig bonus 8 + rng ±3. Seed state → ~51–54 (nervous but winnable 2028). Lose → 'votedOut' ending (still scored). Term limit exits game end of year 8 unless Third-Term Amendment (pluralism −20, legitimacy −12 — poisoned extractive apple).
- **Rig Election** (election year only): +8 share, legitimacy −15, pluralism −10; exposure chance scales with *low* corruption + press freedom → "Stolen Verdict" event. Pedagogy: rigging is safest in already-extractive states.
- **Coup risk** = clamp(0.40·max(0,45−legitimacy) + 0.50·max(0,40−militaryApproval) + 0.30·max(0,35−happiness) + unrest +10 + 4·riggedCount − 0.20·max(0,pluralism−60), 0, 35). Escalation ladder: warning at 6 → "Barracks Whispers" event at 12 → harsher event at 18 → roll. Hidden on dashboard until ≥6.
- **Endings**: Coup, Debt Crisis (debt>110% or reserves<1mo ×2yr), Mass Unrest (happiness<25 & legitimacy<30), Voted Out, Term-Limit Exit (normal, scored at turn 20 w/ continue-to-30 option). Overlays: **Virtuous Circle** (inclusivity≥70 & innovation≥65), **Extractive Trap** (GDP +40% but inclusivity≤35).
- **Nation Score** = 0.35·growth component + 0.30·happiness + 0.35·inclusivity.

## UI (single page, tabs under persistent header)

- **Header**: year/term, treasury, 4 tickers (GDP growth, inflation, happiness/10, legitimacy) w/ delta arrows, End Turn (confirm summary)
- **Dashboard**: 2×2 Recharts (GDP/capita; happiness+legitimacy; institutions multi-line; debt+inflation), faction bars, inclusivity gauge, conditional coup badge; **chart annotations for policies/events** (cause-and-effect visibility = pedagogy)
- **Policies**: category chips, cards w/ adjusted cost ("Reform resistance +40%" in red when markup >1×), plain-language effects, faction thumbs, "What the book says" expander
- **Budget**: 7 sliders, remaining-treasury bar, IMF 4% deficit warning, projected debt readout
- **Nation**: faction cards (wants, sparkline), institution explainers w/ drift direction ("Innovation falling because Elite Capture is 68")
- **Modals**: Event (queued), Election (vote-share breakdown table — teaches the model), Coup, EndReport (score breakdown, annotated timeline, counterfactuals like "reforms after 2031 cost you 48% extra")
- **AdvisorPanel**: right rail, ≤3 condition-gated hints; 3 voices — Economist, Political Scientist (channels Acemoglu/Robinson), Security Advisor

## Policy catalog (~24) — exemplars

Land Title Registration (chiefs −12, propertyRights +2.5/yr ramp 3) · Formalize & Tax Galamsey vs Military Galamsey Crackdown (mutually exclusive: slow-inclusive vs fast-corrosive) · Patronage Hiring Wave (extractive classic: civilServants +15, eliteCapture +4, stateCapacity −1/yr) · Judicial Independence Package (corruption −1.5/yr, businessElite −5 short-term) · Election-Year Cash Transfers · Raise Cocobod Farmgate Share vs Liberalize Cocoa Marketing · Free SHS Expansion · Northern Infrastructure Corridor vs Southern Ports · Central Bank Independence · Exit IMF [special] vs Comply w/ Targets · Export Diversification Grants · State Gold Company · Privatize SOEs · Press Freedom Act vs Media Clampdown · Procurement Transparency Portal · Chieftaincy Land Compact · Youth TVET · Security Budget Boost · Rig Election [special] · Third-Term Amendment [special].

## Events (~14)

Scripted: IMF Third Review (2026), Afrobarometer Report (2027), AfCFTA Opportunity (2029). Random: Gold Surge/Crash, Cocoa Swollen Shoot, Dumsor Power Crisis, Cedi Slide, Corruption Scandal (weight scales w/ corruption), Harmattan Drought. Triggered: Poisoned Rivers (galamsey>0.30 ×3yr), Barracks Whispers/General's Ultimatum (coup ladder), Stolen Verdict (rig exposure), Brain Drain (youth<35 & youthUnemployment>60 → innovation −2/yr).

## Implementation phases (playable loop by end of Phase 3)

0. **Scaffold** (½d): Vite react-ts, Tailwind, vitest, zustand, recharts, tsx; ESLint engine-purity rule; seed.ts w/ all researched constants. ✓ dev server renders; lint fails on React-in-engine
1. **Engine core headless** (1–2d): types, rng, seed, economy, institutions, happiness, engine (no policies/events yet); `scripts/simulate.ts` year-table. ✓ seed → 5.7±0.5% growth yr 1; 30-turn autopilot stays in bounds, no NaN; determinism test
2. **Policies/budget/factions** (1–2d): effect interpreter, catalog, reform markup. ✓ **crossover test** (CI balance contract): extractive GDP > inclusive turns 3–7; inclusive overtakes by turn 12±2; extractive inclusivity <35 by turn 15
3. **Playable UI loop** (2d): store, persistence, shell, dashboard (2 charts min), policy + budget tabs, end-turn flow. ✓ manual 10-turn play; annotation appears; refresh restores; same seed reproduces
4. **Events** (1–2d): system + catalog + modal + queue phase. ✓ scripted 2026 IMF review fires; triggered events fire from forced state; determinism holds w/ choices
5. **Elections/coup/endings** (1–2d): all modals + EndReport. ✓ seed vote share ~51–54; ladder warns before roll; all 6 endings reachable in tests
6. **Pedagogy & polish** (1–2d): advisors, lessons, teach tables, counterfactuals, onboarding coach marks. ✓ full playthroughs of both archetypes; every hint reachable
7. **Balance pass** (1d, recurring): tune constants.ts only, harness sweeps 50 seeds. ✓ crossover holds ≥90% of seeds; mixed strategy wins ~60–70%

## Key risks

1. **Balance dominance** — if extractive strictly wins, game teaches the opposite lesson; if strictly loses, no temptation. Crossover test is the enforced contract; all tuning in constants.ts; real Phase 7.
2. **Unrecoverable death spirals** — bound-damping + ±4/yr clamps + flat reform effects w/ scaling costs keep an expensive escape path (book says circles are strong, not absolute). Test: from trap fixture (capture 80, innovation 20) max-reform reaches inclusivity 55+ in 10 turns.
3. **Engine purity erosion** — ESLint rule + determinism test from Phase 1.
4. **Mid-turn event state machine** — explicit `phase` field; illegal transitions throw; test save/load during events phase.
5. **False precision** — real 2025 numbers are seed dressing; do NOT add econometric structure; constants.ts header comment says so.
6. **UI overwhelm** — 4 header tickers only, coup risk hidden till relevant, plain-language effect text w/ numbers behind expanders.

## Verification (end-to-end)

- `npm test`: unit + determinism + crossover balance suite
- `npx tsx scripts/simulate.ts --strategy extractive|inclusive|mixed --seeds 50 --csv`: eyeball/assert trajectories
- Browser: play 2028 election cycle both ways (honest vs rigged), trigger a coup by tanking military approval, complete a 20-turn run to EndReport, refresh mid-game to confirm save/restore
