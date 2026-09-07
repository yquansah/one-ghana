# One Ghana — game interface and design system

Design owner: design agent. Implementation handoff: frontend agent. Updated 7 September 2026.

## Product posture

Open directly into a playable presidential briefing. The player is making a difficult public decision, not monitoring a company dashboard. Use warm paper, ink, forest green, restrained gold, and editorial typography. The visual rhythm is a government working desk: a clear briefing, a small set of decisions, evidence in the margin, and an explicit next action. Avoid a landing page, giant decorative hero, universal winning score, simulated official seals, or ornamental effects.

The header always identifies this as a fictional presidency. The starting campaign is Q1 2027, using a baseline frozen at 4 September 2026. Display “Fictional presidency” near the campaign date and “Evidence cutoff · 4 Sep 2026” in the evidence view. Annual public data can predate the campaign; retain each observation’s actual reference period.

## Visual implementation

Import `app/src/design/tokens.css` after the generated global stylesheet. It defines independent `--gh-*` tokens and reusable `gh-*` classes; frontend may add component styles. Use Georgia for editorial headings and a local/system sans for navigation and tables. No external font request is necessary. Use tabular numbers for money and measures.

| Role | Value | Use |
| --- | --- | --- |
| Canvas | `#F4F1E8` | Application background |
| Paper | `#FFFEF8` | Briefs, table rows, editable proposals |
| Ink | `#203A30` | Body text, titles |
| Secondary ink | `#5A695F` | Supporting copy, labels |
| Forest | `#173F31` | Sidebar, primary action, current region |
| Pale forest | `#E6EDE3` | Selection, positive change |
| Gold | `#DBB357` | Key decision accent and focus on dark surfaces |
| Dark gold | `#765510` | Assumption and projected-data labels |
| Red | `#A04436` | Shortfall, rejection, harmful change |
| Rule | `#D8DDCF` | Dividers, table borders |

Keep prose 15–16px, labels at least 12px, tables at least 13px. Main titles 36–42px with short line length; section titles 23–27px; indicator values 26–30px. Use 4/8/12/16/24/32/48px spacing. Cards have fine borders and an 8px radius; use few shadows and no glass/blur panels. Icons should be a consistent stroke family, accompanied by text for navigation and actions.

## Application shell

Desktop: a 216–232px forest sidebar and a paper main area. Sidebar contains a simple star mark, “ONE GHANA”, subtitle “The presidency”, and six destinations: Briefing, Ghana, Policies, Institutions, Results, Evidence. Show the fictional term and current quarter near the bottom, with campaign/save controls. Use an inset light indicator for the selected destination, `aria-current="page"`, and visible keyboard focus.

Main area: a compact top bar with “President’s desk”, campaign name, saved state, and “Advance quarter”. Beneath, each view has a short eyebrow, serif title and one-sentence explanation. Content has a maximum width near 1400px, generous 28–40px side padding. Show finite budget and proposal queue beside the advancing action. Mobile: header plus horizontally scrollable labelled navigation, content stacked, actions full width. Do not put a permanently fixed sidebar over content.

## Briefing: opening screen

Use the title “Your presidential briefing.” and the subheading “A stronger cocoa sector begins with the people who grow it.” The player sees a clear current-quarter label and an evidence/model badge, not an unexplained score.

1. A restrained four-item vital strip: real output/growth, consumer inflation, government approval, and fiscal position. Every item names its unit and period. Unavailable source values say “Not available”; they are never replaced with zero. Do not mix a sourced historical annual figure and a current simulated quarter without labels.
2. A broad cocoa briefing on the left and a narrower “This quarter’s fiscal position” on the right. The briefing states the task: “Improve farmer livelihoods while rebuilding productive cocoa farms.” Three concise constraints: rehabilitation takes time, financing has tradeoffs, and institutions determine delivery. Primary action: “Build a cocoa policy”. Secondary action: “Read the evidence”.
3. Fiscal panel uses explicit lines: opening treasury balance, quarterly revenue, committed expenditure, proposed spending and expected closing balance. Foreign reserves appear only as a separate external-sector indicator, never as spendable treasury cash. If the engine uses a synthetic opening treasury balance, mark it “Model assumption”.
4. “Decisions on your desk” shows draft/submitted/awaiting approval policies. The empty state explains “No proposals yet. Start with a cocoa policy, or advance a quarter to observe current conditions.” An empty queue does not disable observation-only turns.
5. A compact Ghana regional schematic plus selected regional/household context. Link to the full Ghana view. Do not invent precise district geography or data-driven choropleth shading from missing values.

## Guided cocoa opening

The lesson is dismissible and can be reopened. Mark progress through four real actions rather than a modal click-through: Understand the brief → Compare approaches → Finance a proposal → Review a quarter. Completion depends on a submitted policy and a resulting turn report.

Show four opening approaches using the actual catalogue identifiers: farmer pricing, rehabilitation/extension, processing/export investment, and an institutional route such as open procurement or land administration. Each option has a one-sentence mechanism, visible time horizon, likely beneficiary, and drawback. Rehabilitation prominently warns that trees require time and replanting can temporarily reduce income. The UI must not imply that announcing a policy immediately changes output.

Use a simple mechanism strip in the preview, for example “Fund extension → recruit and deliver → farmer participation → healthier trees → later output”, with temporary income disruption below it. Mechanisms must come from engine explanations and policy assumptions, not dynamically invented narrative.

## Policies: structured workspace

Left column: searchable/selectable catalogue grouped into six families with four templates each. Show a selected template’s summary and legal route. Right/main column: a real form with intervention, scale, funding, beneficiaries, implementing institution and safeguards. Use native/select controls with persistent labels; avoid free-text proposals that the numerical engine cannot execute.

The preview panel shows up-front and recurring cost separately; start and effect horizon; legal approval route; delivery capacity; affected groups; potential opposition; risks and evidence. Give money a GH₵ prefix and scale, and distinguish per-quarter recurring flows from one-time allocations. Funding options must reflect the engine validation; invalid proposals stay editable and explain exactly what needs correction.

Use “Preview effects” for the inspectable scenario calculation and “Submit proposal” for the state-changing action. After submission, show the actual status and next stage: approval → funding → implementation → evaluation. Include a stable policy history entry. Disabled buttons have nearby reason text. Destructive campaign actions require a clear confirmation; ordinary reversible configuration changes do not.

Forecasts use “Model scenario range” and lower/central/upper values. These are scenarios, not calibrated prediction intervals. Never render a decorative uncertainty band disconnected from computed outputs. Show a loading status while the worker runs, keep the form responsive, and preserve input if a preview fails.

## Ghana: places and people

Deliverable `app/public/design/ghana-regions.svg` is a functional, labelled regional schematic with all 16 region groups. It is deliberately not a geographic boundary source. Label it “Regional schematic · not to scale”. The UI should render actual SVG elements or use an accessible list of buttons beside a static image; an image element by itself cannot support region selection. Each group id and `data-region` slug can drive selection when embedded. For keyboard interaction give each region a named button-equivalent with Enter/Space selection, or make the adjacent native region picker the fully equivalent control.

Selection changes a detail panel, never just a colour. Show the region name, GSS projected 2026 population (when the research dataset supplies it), modeled livelihoods/household outcomes, selected policy exposure, and source links. Distinguish official projected population from synthetic regional sector or household allocations. Each fictional household has “Illustrative household” above its story. Show who gains and who bears transition costs, including farmer and urban/informal household differences when available.

No choropleth legend implying evidence exists for unavailable values. Use pale neutral fill for regions, forest for selected region, and an explicit selection legend. Colour and boundary shape do not encode population by default.

## Institutions

Use four institutional sections: Parliament, administration/procurement, courts/accountability, and Bank of Ghana. Each has a named mechanism, relevant capacity/support value with units, and affected active proposals. Model a chain of permissions and bottlenecks rather than a single democracy/GDP meter. Public support, parliamentary approval and implementation capacity are distinct. The Bank of Ghana panel describes the independent simulated monetary response, with no presidential interest-rate control.

Make rejection understandable: name the institutional constraint, show the proposal status, and offer a valid edit or future action. Public personalities are fictional. Never present a fictional faction/person as current real Ghanaian political reporting.

## Results, comparisons and legacy

After advancing, focus the new report heading and display four sections: “What you attempted”, “What was delivered”, “What changed and why”, and “External conditions and uncertainty”. Call out delayed effects and external shocks separately. Charts need visible units, periods and accessible textual/table equivalents. Small charts may use native SVG with labelled points; do not hide evidence in hover-only tooltips.

The welfare view keeps output, household living standards, jobs, health, education, life satisfaction, inequality, freedoms and environment separate. Life satisfaction is labelled “Model proxy”; government approval is a separate political indicator. Deltas have words/arrows in addition to colour, with the comparison period stated. Higher is not automatically better for every measure.

Campaign branching uses a visible branch name and source quarter. Comparison views explicitly say “Same external shocks” only when the shared seed and branching implementation actually ensure it. Show chosen actions and the difference in outcomes, not only overlaid lines. A file export includes dataset/model version and seed; import errors explain format/version failure without losing the active campaign.

Election result shows continuing/ended presidency and why, then routes into legacy. Legacy offers maintenance, partial reversal and external stress over 20 years. Keep scenario assumptions visible. Do not imply the 20-year path is a real forecast. Completion text explains what persisted, for whom, and under which conditions.

## Evidence and data trust

Use small text badges with non-colour meaning: Observed, Projected, Model assumption, Synthetic allocation, Unavailable. Observation details expose source/publisher, reference period, publication date, units/definition, revision status and link. Synthetic allocations link to the model assumption. Put evidence beside the related policy or indicator, with a full searchable evidence library as the destination.

The model guide explains annual versus quarterly flows, nominal versus real output, exports versus GDP, reserves versus treasury, causal mechanisms, external shocks, household synthesis and scenario limits. No paid AI service or generated narration is necessary for gameplay.

## Accessibility, reliability and interaction

- Aim for WCAG AA text contrast. Muted text remains dark enough on paper; gold is an accent or background, not small low-contrast text. All primary controls at least 44px high. Focus rings have an offset and remain visible on both paper and forest.
- Use landmark elements, one h1 per view, labelled controls, real buttons/links, `aria-live="polite"` for save/worker status, and `role="alert"` for blocking errors. An icon button needs an accessible name.
- Respect reduced motion. Charts and changing numbers do not autoplay or flash. No animation is needed to understand turn results.
- At 1280px the page has no horizontal overflow; at 390px all form actions, navigation and reports remain usable. Tables may scroll inside their own named container; the whole page should not.
- Save status: “Saved on this device”, “Saving…”, or actionable “Couldn’t save on this device — export a backup”. Browser storage is not cloud synchronisation.
- Worker failure: preserve campaign and draft, show error text with Retry. Invalid import: explain the problem and retain the current game. Empty history: explain which action generates data. Data unavailable: show the missing state and a source/assumption explanation.

## Frontend verification checklist

Validate the opening view at desktop and mobile; select all 16 regions through an accessible control; configure/preview/submit a cocoa proposal; observe an empty quarter and a policy quarter; inspect a rejection or funding error; read evidence; save/reload/export/import; branch and compare; finish an election and launch legacy. Check that no default starter branding remains. Compare every visual status, money amount and range with engine outputs. Design review should prioritize usable decisions, honest labels and coherent whitespace before adding decoration.
