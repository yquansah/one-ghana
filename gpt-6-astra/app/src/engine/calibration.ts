/** Synthetic calibration, separated from observations. Every score is a model assumption. */
export const MODEL_VERSION = '1.0.0';
export const SCHEMA_VERSION = 1;
export { DATASET_VERSION } from '../data/evidence';
/** Append supported vintages; never replace this registry when a new baseline is added. */
export const SUPPORTED_DATASET_VERSIONS = ['ghana-2026-09-04.v1'] as const;
export const MODEL_ASSUMPTIONS = [
  'This is a learning model, not a forecast or an estimate of causal policy effects.',
  'Fiscal calibration: annual revenue 16.1%, primary spending 13.5%, initial interest 3.6% of nominal GDP and opening cash GH₵15bn. This synthetic ledger has an initial deficit of 1% of GDP; initial observed debt GH₵720.8bn comes from May 2026.',
  'Regional output, livelihood composition, income, poverty, services and every welfare/institution score are synthetic allocations; population uses the source package where available.',
  'Cocoa output starts at an illustrative 600 thousand tonnes; farmer real income starts at index 100. Neither is represented as a newly observed value.',
  'Uncertainty ranges vary implementation and transmission assumptions; they are model scenarios, not validated prediction intervals.',
  'Processing assumes 35% of cocoa output can be allocated to domestic plants, initially 180 thousand tonnes of capacity. New plants add capacity only on completion; throughput requires beans and reliable power.',
  'Annual appropriations reserve baseline services and interest before authorising additional tax-funded or debt-funded programmes. A synthetic 8% price buffer and 0.75% of GDP programme allowance accompany each annual budget.',
  'Agency delivery is the default; district coordination costs 8% more and is initially slower with stronger rural participation; partnerships cost 15% more and depend on procurement integrity. These are illustrative options, not claims about institutional mandates.',
  'Life satisfaction is a model proxy distinct from electoral approval. No single score measures success.',
];
export const REGION_DEFAULTS = [
  ['western', 'Western', 0.071, 42],
  ['central', 'Central', 0.086, 42],
  ['greater-accra', 'Greater Accra', 0.178, 8],
  ['volta', 'Volta', 0.054, 50],
  ['eastern', 'Eastern', 0.094, 46],
  ['ashanti', 'Ashanti', 0.176, 27],
  ['western-north', 'Western North', 0.028, 64],
  ['ahafo', 'Ahafo', 0.018, 60],
  ['bono', 'Bono', 0.04, 48],
  ['bono-east', 'Bono East', 0.039, 59],
  ['oti', 'Oti', 0.024, 64],
  ['northern', 'Northern', 0.075, 66],
  ['savannah', 'Savannah', 0.021, 72],
  ['north-east', 'North East', 0.019, 74],
  ['upper-east', 'Upper East', 0.042, 68],
  ['upper-west', 'Upper West', 0.035, 70],
] as const;
