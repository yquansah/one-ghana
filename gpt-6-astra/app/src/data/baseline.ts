import { DATASET_VERSION, RESEARCH_CUTOFF } from './evidence';

export const REGION_PROJECTION_SOURCE = 'gss-projections';
/** GSS table 6.1. Census bases are from the same projection vintage. */
const regionRows = [
  ['western', 'Western', 2060585, 2288102],
  ['central', 'Central', 2859821, 3237844],
  ['greater-accra', 'Greater Accra', 5455692, 6286269],
  ['volta', 'Volta', 1659040, 1761123],
  ['eastern', 'Eastern', 2925653, 3093705],
  ['ashanti', 'Ashanti', 5440463, 5819707],
  ['western-north', 'Western North', 880921, 978298],
  ['ahafo', 'Ahafo', 564668, 610894],
  ['bono', 'Bono', 1208649, 1372986],
  ['bono-east', 'Bono East', 1203400, 1375328],
  ['oti', 'Oti', 747248, 810654],
  ['northern', 'Northern', 2310928, 2751015],
  ['savannah', 'Savannah', 653277, 758859],
  ['north-east', 'North East', 658946, 770373],
  ['upper-east', 'Upper East', 1301226, 1447550],
  ['upper-west', 'Upper West', 901502, 1016061],
] as const;
export const PROJECTED_POPULATION = 34378768;
// Published regional integer projections reconcile exactly to the national value.
export const REGIONAL_PROJECTION_SUM = regionRows.reduce((sum, row) => sum + row[3], 0);
export const REGIONS = regionRows.map(([id, name, censusPopulation2021, projectedPopulation2026]) => ({
  id, name, censusPopulation2021, projectedPopulation2026,
  populationWeight: projectedPopulation2026 / REGIONAL_PROJECTION_SUM,
  sourceId: REGION_PROJECTION_SOURCE, referencePeriod: '2026', status: 'projection' as const,
  publicationDate: null,
  note: 'GSS published projection. Weights normalized by the sum of regional values so game allocations sum exactly to one; original counts retained.',
}));

/** Operational calibration, explicitly separate from sourced observations. */
export const MODEL_BASELINE_ASSUMPTIONS = {
  sourceId: 'model-v1', status: 'assumption' as const,
  fiscal: {
    treasuryCashBillionGhs: 15,
    annualRevenueShare: 0.161,
    annualPrimarySpendingShare: 0.135,
    annualInterestShare: 0.036,
    note: 'Synthetic closed fiscal ledger: revenue 16.1%, primary spending 13.5%, interest 3.6% of model nominal GDP. Hence total spending 17.1% and deficit 1.0%. This is a pedagogical calibration, not a reconstructed 2026 budget. Opening cash is assumed.',
  },
  cocoa: {
    annualProductionTonnes: 600000,
    replantingFirstHarvestQuarters: 12,
    processingCapacityTonnes: 180000,
    note: 'Crop volume, processing capacity and exact gestation are scenario assumptions. No productive gain at announcement. Replanting removes bearing trees, requires participation and maintenance, and delays harvest. Processing must consume available beans, energy and working capital.',
  },
  householdNote: 'Synthetic mutually exclusive livelihood groups assigned for learning; weights represent people-equivalents, not observed counts of households, jobs or workers. Named households are fictional.',
};
export const HOUSEHOLD_GROUPS = [
  { id: 'cocoa-farmers', name: 'Cocoa farming families', weight: 0.10, exposure: 'Farmgate income, harvest, disease, land access and seasonal credit' },
  { id: 'food-farmers', name: 'Food farming families', weight: 0.24, exposure: 'Weather, input costs, food prices, storage and rural access' },
  { id: 'informal-workers', name: 'Informal traders and workers', weight: 0.30, exposure: 'Consumer demand, food and transport costs, licensing and credit' },
  { id: 'formal-workers', name: 'Formal wage households', weight: 0.20, exposure: 'Wages, taxes, reliability of power and formal labour demand' },
  { id: 'jobseekers', name: 'Households seeking secure work', weight: 0.16, exposure: 'Skills, job creation, household transfers and public services' },
].map(group => ({ ...group, status: 'assumption' as const, sourceId: 'model-v1', note: MODEL_BASELINE_ASSUMPTIONS.householdNote }));

export const BASELINE = {
  datasetVersion: DATASET_VERSION, researchCutoff: RESEARCH_CUTOFF,
  nominalGdpBillionGhs: 1434.1147,
  realGrowthPercent: 6,
  population: PROJECTED_POPULATION,
  populationMillion: PROJECTED_POPULATION / 1000000,
  populationStatus: 'projection' as const,
  sectorShares: { agriculture: 0.228, industry: 0.313, services: 0.459 },
  inflationPercent: 5.3,
  exchangeRateGhsPerUsd: 11.35,
  policyRatePercent: 14,
  reserves: { grossMillionUsd: 12943.8, netMillionUsd: 10862, programGrossMillionUsd: 10951, grossImportCoverMonths: 5, referencePeriod: 'End June 2026' },
  exportsMillionUsd: { gold: 20975.3, cocoa: 4000.8, oil: 2620.3, total: 31248, referencePeriod: 'Calendar 2025' },
  unemploymentPercent: 12.8,
  youthUnemploymentPercent: 21.9,
  cocoa: { producerPriceGhsPerTonne: 41392, internationalPriceUsdPerTonne: 4271.9, realizedPriceUsdPerTonne: 3748.2, priceReferencePeriod: 'Producer: 12 February 2026; international/realized: June 2026' },
  debt: { totalBillionGhs: 720.8, externalBillionGhs: 341.7, domesticBillionGhs: 379.1, referencePeriod: 'End May 2026' },
  fiscal: MODEL_BASELINE_ASSUMPTIONS.fiscal,
  regions: REGIONS,
  households: HOUSEHOLD_GROUPS,
  note: 'Mixed-date evidence snapshot for a fictional inauguration. National projections and measured historical indicators keep their own periods. Continuing a historical level into the game is a modelling choice, not a claim about actual inauguration conditions.',
} as const;
