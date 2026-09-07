export type FundingSource = 'reallocation' | 'tax' | 'borrowing';
export type Beneficiary = 'national' | 'rural' | 'vulnerable';
export type ImplementationArrangement = 'agency' | 'district' | 'partnership';
export type Safeguard = 'standard' | 'transparent' | 'community';
export type PolicyFamily =
  | 'agriculture'
  | 'business'
  | 'infrastructure'
  | 'human-development'
  | 'public-finances'
  | 'institutions';
export interface PolicyProposal {
  policyId: string;
  scale: number;
  funding: FundingSource;
  beneficiaries: Beneficiary;
  safeguard: Safeguard;
  implementation?: ImplementationArrangement;
}
export interface PolicyEffects {
  growth?: number;
  farmerIncome?: number;
  health?: number;
  education?: number;
  jobs?: number;
  inequality?: number;
  environment?: number;
  freedoms?: number;
  capacity?: number;
  integrity?: number;
  courts?: number;
  accountability?: number;
  electricity?: number;
  revenue?: number;
  spendingEfficiency?: number;
  debtPremium?: number;
  investment?: number;
  cocoa?: number;
}
export interface PolicyDefinition {
  id: string;
  name: string;
  family: PolicyFamily;
  summary: string;
  legalRoute: string;
  setupCost: number;
  recurringCost: number;
  implementationQuarters: number;
  approvalDifficulty: number;
  capacityRequired: number;
  benefits: string[];
  tradeoffs: string[];
  mechanism: string;
  evidenceIds: string[];
  assumptions: string[];
  effects: PolicyEffects;
}
export interface RegionState {
  id: string;
  name: string;
  population: number;
  poverty: number;
  output: number;
  agricultureShare: number;
  servicesShare: number;
  incomeIndex: number;
  employmentRate: number;
  serviceAccess: number;
  environment: number;
}
export interface HouseholdState {
  id: string;
  name: string;
  livelihood: string;
  regionId: string;
  populationWeight: number;
  incomeIndex: number;
  consumptionIndex: number;
  jobSecurity: number;
  foodSecurity: number;
  description: string;
}
export interface Economy {
  realGDP: number;
  nominalGDP: number;
  priceIndex: number;
  growth: number;
  inflation: number;
  unemployment: number;
  exchangeRate: number;
  reservesUSD: number;
  cocoaProduction: number;
  cocoaFarmerIncome: number;
  electricityReliability: number;
  privateInvestment: number;
  sectorOutput: { agriculture: number; industry: number; services: number };
  exportsUSD: { gold: number; cocoa: number; oil: number };
  worldCocoaPriceUSD: number;
  processingCapacity: number;
  cocoaProcessed: number;
}
export interface FiscalState {
  revenue: number;
  baseSpending: number;
  policySpending: number;
  debtService: number;
  balance: number;
  debt: number;
  debtToGDP: number;
  cash: number;
  borrowingLimit: number;
  annualBudget: number;
  yearSpending: number;
  revenueRate: number;
  spendingRate: number;
  effectiveInterestRate: number;
}
export interface Institutions {
  parliamentSupport: number;
  administrativeCapacity: number;
  procurementIntegrity: number;
  judicialCapacity: number;
  accountability: number;
  governmentApproval: number;
  policyRate: number;
}
export interface Welfare {
  livingStandards: number;
  jobs: number;
  health: number;
  education: number;
  lifeSatisfaction: number;
  inequality: number;
  freedoms: number;
  environment: number;
}
export interface ActivePolicy {
  id: string;
  proposal: PolicyProposal;
  status: 'approved' | 'implementing' | 'completed' | 'rejected' | 'suspended';
  progress: number;
  approvalQuarter: number;
  startQuarter: number;
  spent: number;
  implementationQuality: number;
  delayReason: string | null;
}
export interface BaselineSnapshot {
  datasetVersion: string;
  nominalGDP: number;
  realGrowth: number;
  population: number;
  initialCocoaProduction: number;
  initialProcessingCapacity: number;
  initialCocoaExportsUSD: number;
  initialCocoaIncome: number;
  initialInflation: number;
  initialWorldCocoaPrice: number;
  regions: RegionState[];
  assumptions: string[];
}
export interface MetricSnapshot {
  quarter: number;
  year: number;
  gdp: number;
  farmerIncome: number;
  approval: number;
  debtToGDP: number;
  livingStandards: number;
  unemployment: number;
  inflation: number;
  environment: number;
}
export interface ElectionResult {
  kind: 'reelection' | 'succession';
  quarter: number;
  voteShare: number;
  won: boolean;
  reason: string;
}
export interface TurnReport {
  quarter: number;
  title: string;
  summary: string;
  attempted: string[];
  implemented: string[];
  mechanisms: string[];
  external: string[];
  uncertainties: string[];
  householdChanges: {
    id: string;
    name: string;
    incomeChange: number;
    explanation: string;
  }[];
  fiscalExplanation: string;
  election: ElectionResult | null;
}
export interface GameState {
  id: string;
  name: string;
  schemaVersion: number;
  modelVersion: string;
  datasetVersion: string;
  seed: number;
  quarter: number;
  year: number;
  quarterOfYear: number;
  phase: 'presidency' | 'legacy';
  tutorialCompleted: boolean;
  economy: Economy;
  fiscal: FiscalState;
  institutions: Institutions;
  welfare: Welfare;
  regions: RegionState[];
  households: HouseholdState[];
  activePolicies: ActivePolicy[];
  history: MetricSnapshot[];
  reports: TurnReport[];
  election: ElectionResult | null;
  baseline: BaselineSnapshot;
}
export interface ScenarioDelta {
  farmerIncome: number;
  gdp: number;
  approval: number;
  debt: number;
}
export interface PolicyPreview {
  proposal: PolicyProposal;
  definition: PolicyDefinition;
  valid: boolean;
  errors: string[];
  quarterlyCost: number;
  annualCost: number;
  approvalProbability: number;
  implementationQuarters: number;
  fiscalHeadroom: number;
  fundingExplanation: string;
  mechanisms: string[];
  tradeoffs: string[];
  scenarioRange: {
    low: ScenarioDelta;
    central: ScenarioDelta;
    high: ScenarioDelta;
  };
  rangeLabel: string;
}
export interface BranchComparison {
  label: string;
  proposal: PolicyProposal | null;
  state: GameState;
  delta: ScenarioDelta & { livingStandards: number };
  reports: TurnReport[];
  sharedShockSeed: number;
  quartersSimulated: number;
  horizonNote: string;
}
export interface LegacyScenario {
  id: 'maintenance' | 'partial-reversal' | 'external-stress';
  name: string;
  description: string;
  years: {
    year: number;
    gdp: number;
    livingStandards: number;
    environment: number;
    inequality: number;
    debtToGDP: number;
  }[];
  assumptions: string[];
}
