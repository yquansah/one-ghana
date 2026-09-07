# Evidence release ghana-2026-09-04.v1

Frozen historical research cutoff: **4 September 2026**. Research retrieval: **7 September 2026**. This package supports a fictional inauguration and election calendar. No elected personality, approval rating or election forecast in the game is a claim about a real politician.

The executable catalogue is `app/src/data/evidence.ts`: 35 indicators, 18 source references, nullable unavailable values, source publication dates, reference periods, units, definitions, revision status and caveats. `app/src/data/baseline.ts` supplies observations, projections, all 16 regional populations, and a separately named `MODEL_BASELINE_ASSUMPTIONS` block. All official regional 2026 projections reconcile to **34,378,768**; their 2021 census bases reconcile to **30,832,019**.

Status means:

- **Observation:** a published measurement or policy announcement, retaining its original reference period. An announced price does not prove payment.
- **Projection:** a source agency's population projection; not a census count.
- **Assumption:** an authored game input, causal coefficient, fictional household allocation or operational starting condition. It may be authored after the historical cutoff.
- **Unavailable:** no verified usable quantity in this release. Null must remain visibly unavailable and must never silently become zero.

This is a bounded working evidence foundation. It does not establish that the simulation predicts Ghana's future. Post-cutoff source retrieval is permitted; post-cutoff historical releases must not enter this frozen dataset. Undated institutional text and the regional projection report preserve publication-date gaps instead of assigning invented dates. The projection document was indexed before the cutoff, but an exact publication day remains to be recovered.

## Verified anchors and reconciliation

| Item | Retained evidence | Implementation consequence |
|---|---|---|
| GDP | 2025 nominal GDP GH₵1,434.1147bn, BoG annual report table 3.9A; 6.0% real growth, July 2026 bulletin | Annual flow and nominal level. Constant-price growth must not be added to inflation twice. Rounded quarterly nominal values sum to 1,434.2bn, a rounding difference. |
| Sectors | Agriculture 22.8%, industry 31.3%, services 45.9%, BoG annual report section 3.3 | Broad composition only. Subsector value added and product-tax bridge still need reconciliation. |
| People | 2026 projection 34,378,768 from GSS table 6.1 | PLAN's 34.4m is rounded. Use published 16-region projections rather than invented regional populations. |
| Employment | 12.8% national unemployment; 21.9% for ages 15–35, Q1–Q3 2025 averages | Neither is a population-wide nonemployment rate. Do not substitute 15–24 youth statistics or NEET. |
| Reserves | June gross US$12,943.8m, net US$10,862.0m, programme gross US$10,951.0m; headline cover 5.0 months | Different reserve definitions; none is spendable treasury cash. |
| Export receipts | Calendar-2025 gold US$20,975.3m, cocoa US$4,000.8m, oil US$2,620.3m | Gross receipts are not government revenue or additional GDP on top of production value added. |
| Debt | May 2026 GH₵720.8bn = external 341.7 + domestic 379.1 | Stock; currency valuation, borrowing and amortisation need separate accounting. Broad SOE obligations are not completely reconciled. |

Sources: [BoG July bulletin](https://www.bog.gov.gh/wp-content/uploads/2026/07/Summary-of-Economic-and-Financial-Data-July-2026.pdf), [BoG annual report](https://www.bog.gov.gh/wp-content/uploads/2026/06/BoG-2025-Annual-Report-and-Financial-Statements-1.pdf), [GSS regional projection tables](https://statsghana.gov.gh/gssmain/fileUpload/pressrelease/15_Upper_East_Region_fau_final.pdf), [GSS labour statement](https://www.statsghana.gov.gh/news-and-events/press-releases/more-than-one-third-of-ghanas-population-is-youth).

### Fiscal reconciliation requiring care

The July bulletin's 2025 annual nominal GDP row retains GH₵1,400.0bn, while some ratios align with revised GDP. Its cash balance (-3.1% GDP) differs from commitment balance (-1.0%). Revenue and reported expenditure ratios cannot simply be subtracted to reconstruct the cash account. The annual report also has a different total expenditure presentation. Preserve each release and accounting basis; avoid silently choosing a denominator to make inconsistent source rows balance.

The model may therefore use a **clearly synthetic**, internally closed opening fiscal ledger. `MODEL_BASELINE_ASSUMPTIONS` proposes revenue 16.1%, primary spending 13.5%, interest 3.6% of annual model GDP; total spending is 17.1% and deficit 1.0%. Initial free treasury cash of GH₵15bn is an assumption. These are pedagogical calibration values, not the observed 2026 budget. Quarterly allocation by one-fourth is also an assumption because real receipts and spending are seasonal. The backend's final parameters must remain visibly labelled if it uses other calibration values.

## Cocoa opening

The [COCOBOD release of 12 February 2026](https://cocobod.gh/news/press-release-on-cocoa-sector-reforms-for-financial-viability-and-long-term-sustainability) announces **GH₵41,392 per tonne** for the remainder of 2025/26. The release explains liquidity pressure and declining world prices. The game must distinguish price entitlement, financed purchases, actual farmer payment and net income after inputs. The per-bag quoted convention involves gross bag weight; use the official per-tonne amount rather than deriving tonnes from 64kg gross bags.

The [CHED mandate](https://cocobod.gh/subsidiaries-and-divisions/cocoa-health-and-extension-division) covers disease control, rehabilitation and extension. The [Tree Crops project labour document](https://cocobod.gh/resource_files/ghana-tree-crops-diversification-project-p180060-labour-management-procedure.pdf) provides a concrete mechanism: contractors cut infected/contact trees, farmers and landlords can receive loss compensation, maintenance involves contracts and inputs, and farms need follow-up. Those mechanisms support the tutorial; they do **not** identify an estimated national causal coefficient.

| Intervention | Mechanism and near-term tradeoff | Quantity status |
|---|---|---|
| Producer-price support | Higher payment per purchased tonne helps participating sellers; needs working capital and may squeeze COCOBOD margins. Net-buying households face funding/price effects. | Price anchor observed; purchase coverage and fiscal pass-through are assumptions. |
| Rehabilitation | Removes infected/old bearing trees, so cocoa income falls before young trees mature; compensation and secure participation can make waiting feasible. | Exact 12-quarter first-harvest delay is an assumption, with sensitivity scenarios; no instant yield bonus. |
| Processing | Uses beans, reliable power, transport, finance and buyers. Installed capacity alone does not create output. Exporting processed cocoa replaces some bean exports. | Current usable capacity and unit economics unavailable; assumed starting capacity must be labelled. |
| Institutional improvements | Clear contracts, accountable procurement, land access and extension can improve implementation and adoption over time. | No automatic inclusion-to-GDP coefficient is observed. Resistance and adjustment costs are modelled assumptions. |

Current 2025/26 crop tonnes remain unavailable. The [accessible COCOBOD purchases table](https://cocobod.gh/cocoa-purchases) stops at 2019/20 and uses cocoa operational regions including Brong Ahafo and Western South; it must not be mapped mechanically to Ghana's 16 administrative regions. Suggested 600,000 tonnes/year and 180,000 tonnes processing capacity are explicit scenario assumptions, not new official estimates. Keep crop years separate from calendar-year exports.

## Households, wellbeing and regions

`REGIONS` contains all 16 regions and original integer projections. These values establish population distribution, not regional GDP, cocoa shares, poverty or political support. A schematic is appropriate if labelled not to scale. Regional livelihood and capacity scores used by the game must have an assumption label.

The five illustrative livelihood groups in `HOUSEHOLD_GROUPS` use **synthetic person-equivalent weights**, not a processed joint survey distribution or national household counts. The [AHIES catalogue](https://microdata.statsghana.gov.gh/index.php/catalog/128/study-description) is verified as v1.1, created September 2025 and modified June 2026. Survey microdata have not been aggregated here. Future calibration must preserve survey weights and joint distributions instead of multiplying unrelated marginals.

[Afrobarometer Round 10](https://www.afrobarometer.org/publication/ghana-round-10-summary-of-results/) was published 23 April 2025 with August 2024 fieldwork. Its approval, trust and perceived economic conditions must not be relabelled life satisfaction. The game's health, education, life satisfaction, freedoms, environment and inequality proxy scores must remain separate, dimensionless, explicitly modelled measures unless a matching observed question/definition has been sourced.

## Unavailable-data register and next work

1. Recover exact regional-projection publication metadata; obtain original GSS annual/subsector national-account tables and product-tax bridge.
2. Reconcile 2026 midyear finance tables on a consistent cash basis, debt repayment profile, opening treasury cash and SOE/COCOBOD liabilities. Ministry [release index](https://www.mofep.gov.gh/publications/budget-statements/2026) is accessible, but linked midyear PDF retrieval failed in this pass.
3. Obtain current crop production/purchases, bearing hectares, yield, disease prevalence, realised farmer payment, cocoa-region crosswalk, processing utilisation and recurrent input costs.
4. Reconcile official full trade partner/product matrix; retain PLAN destination ranking as unverified.
5. Process representative AHIES distributions with survey design; source defined poverty, consumption, service and labour measures. Do not invent precision while these remain gaps.
6. Review legal routes for final policy texts and check model invariants, sensitivity and historical plausibility. Fit is not evidence of causal identification or predictive validation.

## Verification performed

Manual source-table checking; 16 unique region IDs; census and projected regional totals reconcile exactly; sector shares sum to one; synthetic household weights sum to one; external plus domestic debt equals total; all 35 record IDs unique; every record refers to a known source. Research files introduce no runtime dependencies.
