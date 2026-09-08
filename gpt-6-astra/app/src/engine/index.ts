import {
  BASELINE,
  REGIONS,
  MODEL_BASELINE_ASSUMPTIONS,
} from '../data/baseline';
import { POLICIES, POLICY_BY_ID } from '../data/policies';
import {
  MODEL_VERSION,
  SCHEMA_VERSION,
  DATASET_VERSION,
  MODEL_ASSUMPTIONS,
  REGION_DEFAULTS,
} from './calibration';
import type {
  ExternalQuarterEffects,
  ExternalEventSchedule,
  ActivePolicy,
  BranchComparison,
  GameState,
  LegacyScenario,
  MetricSnapshot,
  PolicyEffects,
  PolicyPreview,
  PolicyProposal,
  RegionState,
  ScenarioDelta,
  TurnReport,
} from './types';
export * from './types';
export { MODEL_VERSION, SCHEMA_VERSION } from './calibration';
export {
  serializeCampaign,
  deserializeCampaign,
  validateCampaign,
} from './validation';
const clamp = (n: number, low = 0, high = 100) =>
  Math.min(high, Math.max(low, n));
const arrangementCost = (p: PolicyProposal) =>
  p.implementation === 'district'
    ? 1.08
    : p.implementation === 'partnership'
      ? 1.15
      : 1;
const clone = <T>(value: T): T => structuredClone(value);
const round = (n: number) => Math.round(n * 10000) / 10000;
/** Counter-based streams preserve external shocks across different action histories. */
export function seededRandom(
  seed: number,
  quarter: number,
  stream: string,
): number {
  let hash = (seed ^ Math.imul(quarter + 1, 0x9e3779b9)) >>> 0;
  for (let i = 0; i < stream.length; i++)
    hash = Math.imul(hash ^ stream.charCodeAt(i), 16777619) >>> 0;
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b);
  hash ^= hash >>> 16;
  return (hash >>> 0) / 4294967296;
}
export function getQuarterShocks(seed: number, quarter: number) {
  return {
    weather: seededRandom(seed, quarter, 'weather') * 2 - 1,
    commodity: seededRandom(seed, quarter, 'commodity') * 2 - 1,
    global: seededRandom(seed, quarter, 'global') * 2 - 1,
    disease: seededRandom(seed, quarter, 'disease') < 0.12 ? 0.025 : 0.002,
  };
}
function snapshot(s: GameState): MetricSnapshot {
  return {
    quarter: s.quarter,
    year: s.year,
    gdp: s.economy.realGDP,
    farmerIncome: s.economy.cocoaFarmerIncome,
    approval: s.institutions.governmentApproval,
    debtToGDP: s.fiscal.debtToGDP,
    livingStandards: s.welfare.livingStandards,
    unemployment: s.economy.unemployment,
    inflation: s.economy.inflation,
    environment: s.welfare.environment,
  };
}
function initialRegions(gdp: number): RegionState[] {
  const productivity = REGIONS.reduce(
    (sum, r) =>
      sum +
      r.populationWeight *
        (r.id === 'greater-accra' ? 1.75 : r.id === 'ashanti' ? 1.2 : 0.86),
    0,
  );
  return REGIONS.map(
    ({ id, name, projectedPopulation2026, populationWeight: weight }) => {
      const agricultureShare =
        REGION_DEFAULTS.find((r) => r[0] === id)?.[3] ?? 45;
      return {
        id,
        name,
        population: projectedPopulation2026,
        poverty: clamp(9 + agricultureShare * 0.5),
        output:
          (gdp *
            weight *
            (id === 'greater-accra' ? 1.75 : id === 'ashanti' ? 1.2 : 0.86)) /
          productivity,
        agricultureShare,
        servicesShare: clamp(72 - agricultureShare * 0.55, 20, 75),
        incomeIndex: 100,
        employmentRate: 100 - BASELINE.unemploymentPercent,
        serviceAccess: clamp(89 - agricultureShare * 0.48),
        environment: 60,
      };
    },
  );
}
export function createCampaign(
  options: { seed?: number; name?: string } = {},
): GameState {
  const seed = options.seed ?? 20260904;
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295)
    throw new Error('Seed must be an integer from 0 to 4294967295.');
  const gdp = BASELINE.nominalGdpBillionGhs,
    population = BASELINE.population,
    regions = initialRegions(gdp);
  const cocoaRegions = [
    'western',
    'western-north',
    'ashanti',
    'eastern',
    'ahafo',
    'bono',
  ];
  const households = regions.flatMap((r) => {
    const farming = r.agricultureShare / 100;
    const cocoa = cocoaRegions.includes(r.id) ? farming * 0.45 : 0;
    const groups = [
      ['cocoa', 'Cocoa-growing household', cocoa],
      ['smallholder', 'Food-farming household', farming - cocoa],
      ['informal', 'Informal trading household', (1 - farming) * 0.6],
      ['salaried', 'Salaried household', (1 - farming) * 0.4],
    ] as const;
    return groups
      .filter(([, , weight]) => weight > 0)
      .map(([livelihood, label, weight]) => ({
        id: r.id + '-' + livelihood,
        name: label + ' · ' + r.name,
        livelihood,
        regionId: r.id,
        populationWeight: (r.population / population) * weight,
        incomeIndex: 100,
        consumptionIndex: 100,
        jobSecurity: livelihood === 'salaried' ? 75 : 45,
        foodSecurity: livelihood === 'salaried' ? 78 : 62,
        description:
          'Fictional illustrative group. Regional livelihood weights are synthetic, not a measured joint household distribution.',
      }));
  });
  const revenue = (gdp * BASELINE.fiscal.annualRevenueShare) / 4,
    baseSpending = (gdp * BASELINE.fiscal.annualPrimarySpendingShare) / 4,
    debt = BASELINE.debt.totalBillionGhs,
    debtService = (gdp * BASELINE.fiscal.annualInterestShare) / 4;
  const s: GameState = {
    id: 'ghana-' + seed,
    name: (options.name ?? 'My Ghana presidency').slice(0, 80),
    schemaVersion: SCHEMA_VERSION,
    modelVersion: MODEL_VERSION,
    datasetVersion: DATASET_VERSION,
    seed,
    quarter: 0,
    year: 2027,
    quarterOfYear: 1,
    phase: 'presidency',
    tutorialCompleted: false,
    economy: {
      realGDP: gdp,
      nominalGDP: gdp,
      priceIndex: 100,
      growth: BASELINE.realGrowthPercent,
      inflation: BASELINE.inflationPercent,
      unemployment: BASELINE.unemploymentPercent,
      exchangeRate: BASELINE.exchangeRateGhsPerUsd,
      reservesUSD: BASELINE.reserves.grossMillionUsd / 1000,
      cocoaProduction:
        MODEL_BASELINE_ASSUMPTIONS.cocoa.annualProductionTonnes / 1000,
      cocoaFarmerIncome: 100,
      electricityReliability: 69,
      privateInvestment: 50,
      sectorOutput: {
        agriculture: gdp * 0.228,
        industry: gdp * 0.313,
        services: gdp * 0.459,
      },
      exportsUSD: {
        gold: BASELINE.exportsMillionUsd.gold / 1000,
        cocoa: BASELINE.exportsMillionUsd.cocoa / 1000,
        oil: BASELINE.exportsMillionUsd.oil / 1000,
      },
      worldCocoaPriceUSD: BASELINE.cocoa.internationalPriceUsdPerTonne,
      processingCapacity:
        MODEL_BASELINE_ASSUMPTIONS.cocoa.processingCapacityTonnes / 1000,
      cocoaProcessed:
        (MODEL_BASELINE_ASSUMPTIONS.cocoa.processingCapacityTonnes / 1000) *
        0.69,
    },
    fiscal: {
      revenue,
      baseSpending,
      policySpending: 0,
      debtService,
      balance: revenue - baseSpending - debtService,
      debt,
      debtToGDP: (debt / gdp) * 100,
      cash: BASELINE.fiscal.treasuryCashBillionGhs,
      borrowingLimit: gdp * 0.015,
      annualBudget: (baseSpending + debtService) * 4 * 1.08 + gdp * 0.0075,
      yearSpending: 0,
      revenueRate: BASELINE.fiscal.annualRevenueShare,
      spendingRate: BASELINE.fiscal.annualPrimarySpendingShare,
      effectiveInterestRate: (debtService * 4) / debt,
    },
    institutions: {
      parliamentSupport: 57,
      administrativeCapacity: 55,
      procurementIntegrity: 49,
      judicialCapacity: 55,
      accountability: 52,
      governmentApproval: 56,
      policyRate: BASELINE.policyRatePercent,
    },
    welfare: {
      livingStandards: 50,
      jobs: 87.2,
      health: 55,
      education: 57,
      lifeSatisfaction: 52,
      inequality: 43,
      freedoms: 66,
      environment: 60,
    },
    regions,
    households,
    activePolicies: [],
    history: [],
    reports: [],
    election: null,
    baseline: {
      datasetVersion: DATASET_VERSION,
      nominalGDP: gdp,
      realGrowth: 6,
      population,
      initialCocoaProduction:
        MODEL_BASELINE_ASSUMPTIONS.cocoa.annualProductionTonnes / 1000,
      initialProcessingCapacity:
        MODEL_BASELINE_ASSUMPTIONS.cocoa.processingCapacityTonnes / 1000,
      initialCocoaExportsUSD: BASELINE.exportsMillionUsd.cocoa / 1000,
      initialCocoaIncome: 100,
      initialInflation: BASELINE.inflationPercent,
      initialWorldCocoaPrice: BASELINE.cocoa.internationalPriceUsdPerTonne,
      regions: clone(regions),
      assumptions: [...MODEL_ASSUMPTIONS],
    },
  };
  s.history = [snapshot(s)];
  return s;
}
function policyCost(p: PolicyProposal) {
  const d = POLICY_BY_ID[p.policyId];
  return (
    (d.setupCost / d.implementationQuarters + d.recurringCost) *
    p.scale *
    (p.safeguard === 'standard' ? 1 : 1.1) *
    arrangementCost(p)
  );
}
function approvalChance(s: GameState, p: PolicyProposal) {
  const d = POLICY_BY_ID[p.policyId];
  return clamp(
    s.institutions.parliamentSupport +
      35 -
      d.approvalDifficulty +
      (p.safeguard === 'transparent' ? 5 : 0) -
      (p.funding === 'tax' ? 12 : 0) -
      (p.scale - 1) * 8,
    8,
    95,
  );
}
function proposalErrors(s: GameState, p: PolicyProposal): string[] {
  const errors: string[] = [];
  if (!p || typeof p !== 'object' || !POLICY_BY_ID[p.policyId])
    return ['Choose a recognised policy.'];
  if (s.phase !== 'presidency')
    errors.push(
      'Your presidency has ended. Review the legacy scenarios or start a new campaign.',
    );
  if (!Number.isFinite(p.scale) || p.scale < 0.25 || p.scale > 2)
    errors.push('Scale must be between 0.25 and 2.');
  if (!['reallocation', 'tax', 'borrowing'].includes(p.funding))
    errors.push('Choose a valid funding source.');
  if (!['national', 'rural', 'vulnerable'].includes(p.beneficiaries))
    errors.push('Choose a valid beneficiary group.');
  if (!['standard', 'transparent', 'community'].includes(p.safeguard))
    errors.push('Choose valid implementation safeguards.');
  if (
    p.implementation !== undefined &&
    !['agency', 'district', 'partnership'].includes(p.implementation)
  )
    errors.push('Choose a valid delivery arrangement.');
  if (
    s.activePolicies.some(
      (a) => a.proposal.policyId === p.policyId && a.status !== 'rejected',
    )
  )
    errors.push('This policy is already active in your campaign.');
  if (
    s.activePolicies.filter((a) => a.approvalQuarter === s.quarter).length >= 2
  )
    errors.push('You can submit up to two proposals in one quarter.');
  if (
    s.activePolicies.filter((a) =>
      ['approved', 'implementing'].includes(a.status),
    ).length >= 6
  )
    errors.push('At most six programmes can be under implementation at once.');
  if (
    p.funding === 'reallocation' &&
    policyCost(p) > s.fiscal.baseSpending * 0.12
  )
    errors.push(
      'This scale exceeds the quarterly reallocation ceiling of 12% of baseline services.',
    );
  if (
    p.funding === 'borrowing' &&
    (s.fiscal.debtToGDP >= 85 || policyCost(p) > s.fiscal.borrowingLimit * 0.5)
  )
    errors.push(
      'Debt or programme cost exceeds available borrowing authority.',
    );
  return errors;
}
function deliveryQuality(
  s: GameState,
  p: PolicyProposal,
  workload: number,
): number {
  const d = POLICY_BY_ID[p.policyId];
  const arrangement =
    p.implementation === 'district'
      ? 0.92
      : p.implementation === 'partnership'
        ? 1.15 * (0.8 + s.institutions.procurementIntegrity / 500)
        : 1;
  return (
    clamp(
      (((s.institutions.administrativeCapacity / d.capacityRequired) *
        (0.45 + s.institutions.procurementIntegrity / 180)) /
        workload) *
        arrangement,
      0.18,
      1,
    ) * (p.safeguard === 'standard' ? 0.85 : 1)
  );
}
function reformResistance(s: GameState, p: PolicyProposal): number {
  const d = POLICY_BY_ID[p.policyId];
  return d.family === 'institutions' || d.id === 'competition-enforcement'
    ? 1 -
        (d.approvalDifficulty / 200) * (1 - s.institutions.accountability / 100)
    : 1;
}
export function previewProposal(
  s: GameState,
  p: PolicyProposal,
  externalSchedule: ExternalEventSchedule = {},
): PolicyPreview {
  const d = POLICY_BY_ID[p?.policyId];
  if (!d) throw new Error('Unknown policy.');
  const cost = policyCost({
      ...p,
      scale: Number.isFinite(p.scale) ? p.scale : 1,
    }),
    quality =
      deliveryQuality(
        s,
        p,
        Math.max(
          1,
          (s.activePolicies.filter((a) =>
            ['approved', 'implementing'].includes(a.status),
          ).length +
            1) /
            2.5,
        ),
      ) * reformResistance(s, p);
  const errors = proposalErrors(s, p);
  const zero: ScenarioDelta = { farmerIncome: 0, gdp: 0, approval: 0, debt: 0 };
  let central = { ...zero };
  const low = { ...zero },
    high = { ...zero };
  if (errors.length === 0) {
    const results: ScenarioDelta[] = [];
    for (const multiplier of [0.65, 1, 1.25]) {
      let control = clone(s);
      control.institutions.administrativeCapacity = clamp(
        control.institutions.administrativeCapacity * multiplier,
        15,
        95,
      );
      control.institutions.procurementIntegrity = clamp(
        control.institutions.procurementIntegrity * (0.5 + multiplier * 0.5),
        10,
        98,
      );
      let treatment = clone(control);
      // A conditional forecast assumes passage, then uses exactly the gameplay delivery and fiscal model.
      treatment.activePolicies.push({
        id: p.policyId + '-preview-' + s.quarter,
        proposal: clone(p),
        status: 'approved',
        progress: 0,
        approvalQuarter: s.quarter,
        startQuarter: s.quarter + 1,
        spent: 0,
        implementationQuality: 0,
        delayReason: null,
      });
      const horizon = Math.min(4, (s.quarter < 16 ? 16 : 32) - s.quarter);
      for (
        let q = 0;
        q < horizon &&
        control.phase === 'presidency' &&
        treatment.phase === 'presidency';
        q++
      ) {
        control = advanceQuarter(control, externalSchedule[control.quarter + 1]).state;
        treatment = advanceQuarter(treatment, externalSchedule[treatment.quarter + 1]).state;
      }
      results.push(delta(treatment, control));
    }
    central = results[1];
    for (const key of ['farmerIncome', 'gdp', 'approval', 'debt'] as const) {
      low[key] = Math.min(...results.map((r) => r[key]));
      high[key] = Math.max(...results.map((r) => r[key]));
    }
  }
  const fundingExplanation =
    p.funding === 'reallocation'
      ? 'Shift spending from existing public services. Treasury accounts remain balanced by reducing those services; this has household costs.'
      : p.funding === 'tax'
        ? 'An explicitly funded tax surcharge covers delivered programme costs. Disposable income falls for contributing households; legislative support is lower.'
        : 'Borrow through the public budget. Principal and future interest increase; foreign exchange reserves are not treasury funding.';
  return {
    proposal: clone(p),
    definition: d,
    valid: errors.length === 0,
    errors,
    quarterlyCost: cost,
    annualCost: cost * 4,
    approvalProbability: approvalChance(s, p),
    implementationQuarters: Math.ceil(
      d.implementationQuarters / Math.max(0.01, quality),
    ),
    fiscalHeadroom: Math.max(
      0,
      s.fiscal.borrowingLimit + Math.min(s.fiscal.balance, 0),
    ),
    fundingExplanation,
    mechanisms: [
      d.mechanism,
      p.implementation === 'district'
        ? 'District delivery adds 8% coordination cost and is initially slower, with stronger rural participation.'
        : p.implementation === 'partnership'
          ? 'Contracted delivery adds 15% contract-management cost; specialist capacity helps where procurement integrity supports it.'
          : 'National agency delivery uses existing capacity and standard coordination costs.',
      'The delivery arrangement never transfers legislative or independent judicial authority.',
      'Delivery time estimates assume sustained funding and current workload; procurement holds and future staffing changes can extend them.',
      'Approval, funding and implementation precede effects.',
    ],
    tradeoffs: d.tradeoffs,
    scenarioRange: { low, central, high },
    rangeLabel:
      'First-year gameplay-model envelope across delivery-capacity assumptions, conditional on approval and capped at the next election; not prediction intervals.',
  };
}
export function submitPolicy(
  state: GameState,
  proposal: PolicyProposal,
): GameState {
  const errors = proposalErrors(state, proposal);
  if (errors.length) throw new Error(errors.join(' '));
  const s = clone(state),
    chance = approvalChance(s, proposal);
  const approved =
    seededRandom(s.seed, s.quarter, 'approval-' + proposal.policyId) * 100 <
    chance;
  const judicialHold =
    proposal.safeguard === 'standard' &&
    [
      'land-administration',
      'mining-royalties',
      'local-accountability',
    ].includes(proposal.policyId) &&
    seededRandom(s.seed, s.quarter, 'court-' + proposal.policyId) < 0.2;
  s.activePolicies.push({
    id: proposal.policyId + '-' + s.quarter,
    proposal: clone(proposal),
    status: approved && !judicialHold ? 'approved' : 'rejected',
    progress: 0,
    approvalQuarter: s.quarter,
    startQuarter: s.quarter + 1,
    spent: 0,
    implementationQuality: 0,
    delayReason: judicialHold
      ? 'Court review found inadequate safeguards. Revise the proposal and submit in a later quarter.'
      : approved
        ? null
        : 'Parliament withheld approval. Revise scale, funding or safeguards before another attempt.',
  });
  if (!approved)
    s.institutions.parliamentSupport = clamp(
      s.institutions.parliamentSupport - 0.6,
    );

  return s;
}
function addEffects(
  target: PolicyEffects,
  source: PolicyEffects,
  factor: number,
) {
  for (const key of Object.keys(source) as (keyof PolicyEffects)[])
    target[key] = (target[key] ?? 0) + (source[key] ?? 0) * factor;
}
function effectStrength(s: GameState, a: ActivePolicy) {
  const d = POLICY_BY_ID[a.proposal.policyId],
    maturity = a.progress / 100,
    elapsed = s.quarter - a.startQuarter + 1;
  let strength = maturity * a.implementationQuality * a.proposal.scale;
  if (d.id === 'cocoa-rehabilitation')
    strength = elapsed < 12 ? 0 : strength * Math.min(1, (elapsed - 11) / 8);
  if (d.id === 'processing-investment') {
    if (a.progress < 100) return 0;
    const beans = s.economy.cocoaProduction * 0.35,
      power = s.economy.electricityReliability / 100;
    const initialCapacity = s.baseline.initialProcessingCapacity;
    const additionalCapacity = 120 * a.proposal.scale;
    const additionalThroughput = Math.max(
      0,
      Math.min(beans, (initialCapacity + additionalCapacity) * power) -
        Math.min(beans, initialCapacity * power),
    );
    strength *= additionalThroughput / Math.max(0.01, additionalCapacity);
  }
  if (d.id === 'generation-investment' && a.progress < 100) return 0;
  if (d.id === 'competition-enforcement' || d.id === 'land-administration')
    strength *= s.institutions.judicialCapacity / 100;
  if (d.id === 'school-investment' && elapsed < 12) strength *= 0.65;
  return strength;
}
export function advanceQuarter(state: GameState, external: ExternalQuarterEffects = {}): {
  state: GameState;
  report: TurnReport;
} {
  const bounds: Record<string, number> = { cocoaYieldPct: 15, energyAvailabilityPoints: 10, externalDemandPct: 5 };
  if (!external || typeof external !== 'object' || Array.isArray(external) || Object.entries(external).some(([key, value]) => !Object.hasOwn(bounds, key) || typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > bounds[key]))
    throw new Error('External event effects exceed the reviewed model bounds.');
  if (state.phase !== 'presidency' || state.quarter >= 32)
    throw new Error(
      'The presidency has ended. Run the 20-year legacy scenarios.',
    );
  const s = clone(state),
    previous = state,
    next = state.quarter + 1,
    shocks = getQuarterShocks(s.seed, next);
  s.quarter = next;
  s.year = 2027 + Math.floor(next / 4);
  s.quarterOfYear = (next % 4) + 1;
  if ((next - 1) % 4 === 0 && next > 1) {
    s.fiscal.yearSpending = 0;
  }
  const remainingBudgetQuarters = 4 - ((next - 1) % 4);
  const protectedServices =
    ((s.economy.nominalGDP * s.fiscal.spendingRate) / 4 +
      (s.fiscal.debt * s.fiscal.effectiveInterestRate) / 4) *
    remainingBudgetQuarters;
  const appropriationHeadroom = Math.max(
    0,
    s.fiscal.annualBudget - s.fiscal.yearSpending - protectedServices,
  );
  const report: TurnReport = {
    quarter: next,
    title: 'Quarter ' + next + ' briefing',
    summary: '',
    attempted: [],
    implemented: [],
    mechanisms: [],
    external: [],
    uncertainties: [
      'Household and regional effects use synthetic distributions.',
      'Effect sizes, political responses and policy durability are modelling assumptions.',
    ],
    householdChanges: [],
    fiscalExplanation: '',
    election: null,
  };
  const effects: PolicyEffects = {};
  let reallocation = 0,
    taxFunding = 0,
    borrowingCost = 0,
    rehabLoss = 0,
    farmerSupport = 0,
    cashTransfer = 0;
  const workload = Math.max(
    1,
    s.activePolicies.filter((a) =>
      ['approved', 'implementing'].includes(a.status),
    ).length / 2.5,
  );
  for (const a of s.activePolicies) {
    const d = POLICY_BY_ID[a.proposal.policyId];
    if (a.approvalQuarter === next - 1)
      report.attempted.push(
        d.name +
          ': ' +
          (a.status === 'rejected'
            ? 'rejected — ' + a.delayReason
            : 'approved for funding and implementation'),
      );
    if (a.status === 'rejected') continue;
    const quality = deliveryQuality(s, a.proposal, workload);
    const cost =
      (d.recurringCost +
        (a.progress < 100 ? d.setupCost / d.implementationQuarters : 0)) *
      a.proposal.scale *
      (a.proposal.safeguard === 'standard' ? 1 : 1.1) *
      arrangementCost(a.proposal);
    let finance = 1;
    if (a.proposal.funding === 'borrowing')
      finance =
        clamp(
          (s.fiscal.borrowingLimit -
            Math.max(0, -s.fiscal.balance) -
            borrowingCost) /
            Math.max(0.01, cost),
          0,
          1,
        ) * (s.fiscal.debtToGDP > 90 ? 0.1 : 1);
    if (a.proposal.funding === 'reallocation')
      finance = clamp(
        (s.fiscal.baseSpending * 0.18 - reallocation) / Math.max(0.01, cost),
        0,
        1,
      );
    else
      finance = Math.min(
        finance,
        clamp(
          (appropriationHeadroom - borrowingCost - taxFunding) /
            Math.max(0.01, cost),
          0,
          1,
        ),
      );
    if (finance < 0.15) {
      a.status = 'suspended';
      a.delayReason =
        'Funding exhausted. Programme suspended; no productive benefit this quarter.';
      report.implemented.push(
        d.name + ': suspended because fiscal room is exhausted.',
      );
      continue;
    }
    const resistance = reformResistance(s, a.proposal);
    const procurementDelay =
      seededRandom(s.seed, next, 'delivery-' + d.id) >
        0.9 + s.institutions.procurementIntegrity / 1000 && a.progress < 100;
    a.implementationQuality = quality * finance * resistance;
    if (procurementDelay) {
      a.delayReason =
        'Procurement review delayed delivery this quarter; only recurring maintenance was funded.';
      a.implementationQuality *= 0.65;
    } else {
      a.progress = clamp(
        a.progress +
          (100 / d.implementationQuarters) * quality * finance * resistance,
      );
      a.delayReason =
        finance < 1
          ? 'Funding constraint reduced delivery.'
          : quality < 0.55
            ? 'Staffing and procurement capacity slowed implementation.'
            : null;
    }
    a.status = a.progress >= 100 ? 'completed' : 'implementing';
    const spent =
      (procurementDelay
        ? d.recurringCost *
          a.proposal.scale *
          (a.proposal.safeguard === 'standard' ? 1 : 1.1) *
          arrangementCost(a.proposal)
        : cost) * finance;
    a.spent += spent;
    if (a.proposal.funding === 'reallocation') reallocation += spent;
    else if (a.proposal.funding === 'tax') taxFunding += spent;
    else borrowingCost += spent;
    const strength = effectStrength(s, a);
    addEffects(effects, d.effects, strength);
    if (d.id === 'farmer-pricing') farmerSupport += 12 * strength;
    if (d.id === 'cash-support' || d.id === 'energy-support')
      cashTransfer += (d.id === 'cash-support' ? 6 : 2.5) * strength;
    if (d.id === 'cocoa-rehabilitation' && next - a.startQuarter < 12)
      rehabLoss += 0.014 * a.proposal.scale * a.implementationQuality;
    report.implemented.push(
      d.name +
        ': ' +
        Math.round(a.progress) +
        '% delivered; GH₵' +
        spent.toFixed(2) +
        'bn spent.' +
        (a.delayReason ? ' ' + a.delayReason : ''),
    );
    if ((a.progress < 100 && next - a.startQuarter < 2) || a.progress === 100)
      report.mechanisms.push(d.mechanism);
  }
  const e = s.economy,
    i = s.institutions,
    w = s.welfare,
    f = s.fiscal;
  if (external.energyAvailabilityPoints) e.electricityReliability = clamp(e.electricityReliability + external.energyAvailabilityPoints, 20, 99);
  const investmentAccess =
    (i.judicialCapacity - 55) * 0.008 + (i.procurementIntegrity - 49) * 0.006;
  const investmentTransmission = (e.privateInvestment - 50) * 0.025;
  const powerConstraint = (e.electricityReliability - 69) * 0.013;
  const debtDrag = Math.max(0, f.debtToGDP - 65) * 0.045;
  e.growth = clamp(
    4.3 +
      (effects.growth ?? 0) +
      investmentTransmission +
      powerConstraint -
      debtDrag +
      shocks.global * 0.65 +
      shocks.weather * 0.28 +
      shocks.commodity * 0.25 -
      (i.policyRate - 14) * 0.03 +
      (external.externalDemandPct ?? 0) * 0.12,
    -5,
    12,
  );
  const quarterlyGrowth = Math.pow(1 + e.growth / 100, 0.25) - 1;
  e.realGDP *= 1 + quarterlyGrowth;
  e.inflation = clamp(
    e.inflation * 0.84 +
      6 * 0.16 +
      shocks.commodity * 0.5 +
      shocks.weather * 0.2 +
      borrowingCost * 0.03 -
      (i.policyRate - 14) * 0.025,
    0,
    35,
  );
  e.priceIndex *= Math.pow(1 + e.inflation / 100, 0.25);
  e.nominalGDP = (e.realGDP * e.priceIndex) / 100;
  e.unemployment = clamp(
    e.unemployment -
      (e.growth - 4) * 0.045 -
      (effects.jobs ?? 0) * 0.2 +
      reallocation * 0.014 +
      shocks.global * 0.025,
    3,
    35,
  );
  e.exchangeRate = clamp(
    e.exchangeRate * (1 + (e.inflation - 3) / 400 - shocks.commodity * 0.01),
    2,
    100,
  );
  e.reservesUSD = clamp(
    e.reservesUSD +
      shocks.commodity * 0.15 +
      shocks.global * 0.07 -
      (e.growth - 4) * 0.015,
    0.2,
    70,
  );
  e.worldCocoaPriceUSD = clamp(
    e.worldCocoaPriceUSD * (1 + shocks.commodity * 0.05),
    1000,
    16000,
  );
  e.cocoaProduction = clamp(
    e.cocoaProduction *
      (1 +
        shocks.weather * 0.035 +
        shocks.commodity * 0.004 +
        (effects.cocoa ?? 0) / 400 -
        rehabLoss -
        shocks.disease * (1 - Math.min(0.7, (effects.cocoa ?? 0) * 0.1))) *
      (1 + (external.cocoaYieldPct ?? 0) / 100),
    150,
    1800,
  );
  e.electricityReliability = clamp(
    e.electricityReliability + (effects.electricity ?? 0) * 0.35 - 0.035,
    20,
    99,
  );
  e.privateInvestment = clamp(
    e.privateInvestment +
      (effects.investment ?? 0) * 0.3 +
      investmentAccess * 0.15 +
      powerConstraint * 0.08 -
      debtDrag * 0.06,
    5,
    95,
  );
  e.processingCapacity =
    s.baseline.initialProcessingCapacity +
    s.activePolicies
      .filter(
        (a) =>
          a.proposal.policyId === 'processing-investment' &&
          a.progress === 100 &&
          a.status === 'completed',
      )
      .reduce(
        (sum, a) => sum + 120 * a.proposal.scale * a.implementationQuality,
        0,
      );
  e.cocoaProcessed = Math.min(
    e.cocoaProduction * 0.35,
    (e.processingCapacity * e.electricityReliability) / 100,
  );
  const agricultureShare = clamp(
    0.228 + (e.cocoaProduction / s.baseline.initialCocoaProduction - 1) * 0.018,
    0.17,
    0.3,
  );
  const industryShare = clamp(
    0.313 + (e.electricityReliability - 69) * 0.0007,
    0.28,
    0.37,
  );
  e.sectorOutput = {
    agriculture: e.realGDP * agricultureShare,
    industry: e.realGDP * industryShare,
    services: e.realGDP * (1 - agricultureShare - industryShare),
  };
  e.exportsUSD = {
    gold: previous.economy.exportsUSD.gold * (1 + shocks.commodity * 0.012),
    cocoa:
      s.baseline.initialCocoaExportsUSD *
      (e.cocoaProduction / s.baseline.initialCocoaProduction) *
      (e.worldCocoaPriceUSD / s.baseline.initialWorldCocoaPrice),
    oil: previous.economy.exportsUSD.oil * (1 + shocks.commodity * 0.008),
  };
  f.revenueRate = clamp(
    f.revenueRate + (effects.revenue ?? 0) / 400,
    0.12,
    0.28,
  );
  f.spendingRate = clamp(
    f.spendingRate - (effects.spendingEfficiency ?? 0) / 400,
    0.115,
    0.18,
  );
  f.effectiveInterestRate = clamp(
    previous.fiscal.effectiveInterestRate * 0.96 +
      (0.065 +
        Math.max(0, f.debtToGDP - 50) * 0.0006 +
        (i.policyRate - 14) * 0.0004) *
        0.04 -
      (effects.debtPremium ?? 0) / 400,
    0.035,
    0.13,
  );
  f.revenue = (e.nominalGDP * f.revenueRate) / 4 + taxFunding;
  f.baseSpending = (e.nominalGDP * f.spendingRate) / 4 - reallocation;
  f.policySpending = reallocation + taxFunding + borrowingCost;
  f.debtService = (previous.fiscal.debt * f.effectiveInterestRate) / 4;
  f.balance = f.revenue - f.baseSpending - f.policySpending - f.debtService;
  if (f.balance < 0) {
    const cashUsed = Math.min(f.cash, -f.balance);
    f.cash -= cashUsed;
    f.debt += -f.balance - cashUsed;
  } else {
    const repayment = Math.min(f.debt, f.balance * 0.6);
    f.debt -= repayment;
    f.cash += f.balance - repayment;
  }
  f.debtToGDP = (f.debt / e.nominalGDP) * 100;
  f.borrowingLimit = e.nominalGDP * 0.015;
  f.yearSpending += f.baseSpending + f.policySpending + f.debtService;
  if (next % 4 === 0) {
    const commitments = s.activePolicies
      .filter((a) => a.status !== 'rejected')
      .reduce(
        (sum, a) =>
          sum +
          POLICY_BY_ID[a.proposal.policyId].recurringCost * a.proposal.scale,
        0,
      );
    f.annualBudget =
      ((e.nominalGDP * f.spendingRate) / 4 + f.debtService) * 4 * 1.08 +
      commitments * 4 +
      e.nominalGDP * 0.0075;
    f.yearSpending = 0;
  }
  i.administrativeCapacity = clamp(
    i.administrativeCapacity + (effects.capacity ?? 0) * 0.35 - 0.025,
    15,
    95,
  );
  i.procurementIntegrity = clamp(
    i.procurementIntegrity + (effects.integrity ?? 0) * 0.35 - 0.018,
    10,
    98,
  );
  i.judicialCapacity = clamp(
    i.judicialCapacity + (effects.courts ?? 0) * 0.35 - 0.01,
    15,
    98,
  );
  i.accountability = clamp(
    i.accountability + (effects.accountability ?? 0) * 0.35 - 0.01,
    10,
    98,
  );
  // Bank of Ghana response: the executive cannot directly set this field through a game action.
  i.policyRate = clamp(
    i.policyRate + (e.inflation - 8) * 0.07 - (e.growth < 2 ? 0.2 : 0),
    8,
    35,
  );
  const taxBurden = (taxFunding / Math.max(1, e.nominalGDP / 4)) * 100;
  for (const h of s.households) {
    const old = previous.households.find((x) => x.id === h.id)!;
    const isFarmer = h.livelihood === 'cocoa' || h.livelihood === 'smallholder';
    const region = s.regions.find((r) => r.id === h.regionId)!;
    const cocoaChange =
      (e.cocoaProduction / previous.economy.cocoaProduction - 1) * 45 +
      shocks.commodity * 1.1 -
      rehabLoss * 70;
    const targeted = s.activePolicies
      .filter((a) => a.status === 'implementing' || a.status === 'completed')
      .reduce(
        (sum, a) =>
          sum +
          ((a.proposal.beneficiaries === 'rural' && isFarmer) ||
          (a.proposal.beneficiaries === 'vulnerable' &&
            h.livelihood !== 'salaried')
            ? effectStrength(s, a) *
              (0.13 + (a.proposal.implementation === 'district' ? 0.08 : 0))
            : 0),
        0,
      );
    const support = h.livelihood === 'cocoa' ? farmerSupport * 0.065 : 0;
    const transfer =
      h.livelihood !== 'salaried' ? cashTransfer * 0.075 : cashTransfer * 0.01;
    const institutionalTransition =
      s.activePolicies.some(
        (a) =>
          a.proposal.policyId === 'mining-royalties' &&
          a.progress < 70 &&
          a.status === 'implementing',
      ) &&
      h.livelihood === 'informal' &&
      ['western', 'ashanti', 'eastern'].includes(h.regionId)
        ? -0.2
        : 0;
    const incomeChange =
      quarterlyGrowth * 55 +
      (isFarmer ? shocks.weather * 0.75 : shocks.global * 0.13) +
      (h.livelihood === 'cocoa' ? cocoaChange + support : 0) +
      transfer +
      targeted -
      taxBurden * (h.livelihood === 'salaried' ? 1.4 : 0.65) -
      reallocation * 0.025 +
      institutionalTransition;
    h.incomeIndex = clamp(h.incomeIndex * (1 + incomeChange / 100), 25, 500);
    h.consumptionIndex = clamp(
      h.consumptionIndex *
        (1 + (incomeChange - (e.inflation - 6) * 0.025) / 100),
      20,
      500,
    );
    h.jobSecurity = clamp(
      h.jobSecurity +
        (effects.jobs ?? 0) * 0.2 -
        (e.unemployment - previous.economy.unemployment) * 0.4,
      10,
      98,
    );
    h.foodSecurity = clamp(
      h.foodSecurity +
        incomeChange * 0.15 +
        transfer * 0.2 -
        (isFarmer ? shocks.weather * 0.08 : 0),
      10,
      98,
    );
    report.householdChanges.push({
      id: h.id,
      name: h.name,
      incomeChange: round((h.incomeIndex / old.incomeIndex - 1) * 100),
      explanation:
        h.livelihood === 'cocoa'
          ? 'Cocoa harvests, world prices, funded support and replanting affect this fictional household.'
          : isFarmer
            ? 'Weather, market access, taxes and public services affect farm income.'
            : h.livelihood === 'salaried'
              ? 'Enterprise demand, public services and funding taxes affect disposable income.'
              : 'Local demand, food prices, transfers and formalisation costs affect informal livelihoods.',
    });
    region.incomeIndex = 0;
  }
  const cocoaHouseholds = s.households.filter((h) => h.livelihood === 'cocoa');
  const cocoaWeight = cocoaHouseholds.reduce(
    (sum, h) => sum + h.populationWeight,
    0,
  );
  e.cocoaFarmerIncome =
    cocoaHouseholds.reduce(
      (sum, h) => sum + h.incomeIndex * h.populationWeight,
      0,
    ) / cocoaWeight;
  const consumption = s.households.reduce(
    (sum, h) => sum + h.consumptionIndex * h.populationWeight,
    0,
  );
  w.livingStandards = clamp(50 + (consumption - 100) * 0.45);
  w.jobs = 100 - e.unemployment;
  w.health = clamp(
    w.health + (effects.health ?? 0) * 0.4 - reallocation * 0.008,
  );
  w.education = clamp(
    w.education + (effects.education ?? 0) * 0.4 - reallocation * 0.006,
  );
  w.inequality = clamp(
    w.inequality +
      (effects.inequality ?? 0) * 0.3 +
      (taxBurden > 0 ? -0.008 : 0.005),
    20,
    65,
  );
  w.freedoms = clamp(w.freedoms + (effects.freedoms ?? 0) * 0.35, 15, 98);
  w.environment = clamp(
    w.environment + (effects.environment ?? 0) * 0.35 - 0.035,
    10,
    95,
  );
  w.lifeSatisfaction = clamp(
    w.lifeSatisfaction * 0.92 +
      (w.livingStandards * 0.5 +
        w.health * 0.2 +
        w.freedoms * 0.15 +
        w.environment * 0.15) *
        0.08,
  );
  for (const r of s.regions) {
    const hs = s.households.filter((h) => h.regionId === r.id),
      weight = hs.reduce((sum, h) => sum + h.populationWeight, 0);
    r.incomeIndex =
      hs.reduce((sum, h) => sum + h.incomeIndex * h.populationWeight, 0) /
      weight;
    r.output *=
      1 +
      quarterlyGrowth +
      (r.agricultureShare / 100 - 0.228) * shocks.weather * 0.008;
    r.poverty = clamp(
      r.poverty -
        (r.incomeIndex -
          previous.regions.find((x) => x.id === r.id)!.incomeIndex) *
          0.15,
      2,
      90,
    );
    r.employmentRate = 100 - e.unemployment;
    r.serviceAccess = clamp(
      r.serviceAccess +
        ((effects.health ?? 0) + (effects.education ?? 0)) * 0.12 -
        reallocation * 0.012,
    );
    r.environment = w.environment + (r.agricultureShare - 45) * 0.04;
  }
  const outputSum = s.regions.reduce((sum, r) => sum + r.output, 0);
  for (const r of s.regions) r.output *= e.realGDP / outputSum;
  const incomeShift =
    (w.livingStandards - previous.welfare.livingStandards) * 0.6;
  i.governmentApproval = clamp(
    i.governmentApproval +
      incomeShift -
      (e.inflation > 10 ? (e.inflation - 10) * 0.05 : 0) -
      (f.debtToGDP > 75 ? 0.15 : 0) -
      taxFunding * 0.065 +
      shocks.global * 0.12 -
      0.025,
    10,
    90,
  );
  i.parliamentSupport = clamp(
    i.parliamentSupport +
      (i.governmentApproval - previous.institutions.governmentApproval) * 0.15,
    15,
    85,
  );
  if (next === 16 || next === 32) {
    const voteShare = clamp(
      50 +
        (i.governmentApproval - 50) * 0.7 +
        (seededRandom(s.seed, next, 'election') - 0.5) * 7,
      20,
      80,
    );
    const won = voteShare >= 50;
    s.election = {
      quarter: next,
      voteShare,
      won,
      kind: next === 32 ? 'succession' : 'reelection',
      reason:
        next === 32
          ? 'Your constitutional two-term limit ends the presidency. The simulated governing-party successor ' +
            (won ? 'won' : 'lost') +
            ' this election; you cannot seek a third term.'
          : won
            ? 'Household conditions, public approval and campaign uncertainty returned a majority for a second term.'
            : 'Living standards, public approval and campaign uncertainty left the incumbent short of a majority.',
    };
    report.election = s.election;
    if (!won || next === 32) s.phase = 'legacy';
  }
  if (
    next >= 4 &&
    s.activePolicies.some(
      (a) =>
        [
          'farmer-pricing',
          'cocoa-rehabilitation',
          'processing-investment',
          'open-procurement',
          'land-administration',
        ].includes(a.proposal.policyId) && a.spent > 0,
    )
  )
    s.tutorialCompleted = true;
  report.external = [
    `Cocoa disease pressure removed ${(shocks.disease * 100).toFixed(1)}% of exposed production before rehabilitation protection.`,
    `Weather shock: ${shocks.weather >= 0 ? 'favourable' : 'adverse'} (${shocks.weather.toFixed(2)}).`,
    `World commodity conditions: ${shocks.commodity >= 0 ? 'supportive' : 'weaker'}; cocoa world price US$${e.worldCocoaPriceUSD.toFixed(0)}/tonne.`,
    `Global demand shock ${shocks.global.toFixed(2)}. These streams are identical across campaign branches.`,
  ];
  if (rehabLoss > 0)
    report.mechanisms.push(
      'Replanting temporarily removes yielding cocoa trees. New-tree gains begin after at least 12 quarters, subject to delivery.',
    );
  report.fiscalExplanation = `Revenue GH₵${f.revenue.toFixed(2)}bn − primary services GH₵${f.baseSpending.toFixed(2)}bn − policies GH₵${f.policySpending.toFixed(2)}bn − interest GH₵${f.debtService.toFixed(2)}bn = ${f.balance >= 0 ? 'surplus' : 'deficit'} GH₵${Math.abs(f.balance).toFixed(2)}bn. Deficits use treasury cash then debt; FX reserves are separate.`;
  report.summary = `Real output ${e.growth.toFixed(1)}% annualised growth; cocoa farmer real-income index ${e.cocoaFarmerIncome.toFixed(1)} (starting value 100). ${report.implemented.length} programme${report.implemented.length === 1 ? '' : 's'} funded or reviewed. ${s.phase === 'legacy' ? 'Your presidency is complete; explore twenty-year legacy scenarios.' : ''}`;
  s.history.push(snapshot(s));
  s.reports.push(report);
  return { state: s, report };
}
function delta(
  a: GameState,
  b: GameState,
): ScenarioDelta & { livingStandards: number } {
  return {
    gdp: a.economy.realGDP - b.economy.realGDP,
    farmerIncome: a.economy.cocoaFarmerIncome - b.economy.cocoaFarmerIncome,
    debt: a.fiscal.debt - b.fiscal.debt,
    approval:
      a.institutions.governmentApproval - b.institutions.governmentApproval,
    livingStandards: a.welfare.livingStandards - b.welfare.livingStandards,
  };
}
export function branchCampaign(state: GameState, name?: string): GameState {
  const s = clone(state);
  s.name = (name ?? state.name + ' · branch').slice(0, 80);
  s.id = state.id + '-branch-' + state.quarter;
  return s;
}
export function comparePolicies(
  state: GameState,
  proposals: PolicyProposal[],
  quarters = 8,
  externalSchedule: ExternalEventSchedule = {},
): BranchComparison[] {
  if (!Number.isInteger(quarters) || quarters < 1 || quarters > 32)
    throw new Error('Comparison horizon must be 1–32 quarters.');
  if (!Array.isArray(proposals))
    throw new Error('Comparison proposals must be an array.');
  if (proposals.length > 4)
    throw new Error('Compare at most four proposals at a time.');
  const horizon = Math.min(
    quarters,
    (state.quarter < 16 ? 16 : 32) - state.quarter,
  );
  const horizonNote =
    horizon < quarters
      ? 'All branches stop at the same next-election boundary, before outcomes could create unequal time horizons.'
      : 'All branches use an identical quarterly horizon and external shocks.';
  const simulate = (initial: GameState) => {
    let current = initial;
    const reports: TurnReport[] = [];
    for (let t = 0; t < horizon && current.phase === 'presidency'; t++) {
      const result = advanceQuarter(current, externalSchedule[current.quarter + 1]);
      current = result.state;
      reports.push(result.report);
    }
    return { current, reports };
  };
  const base = simulate(clone(state));
  return [
    {
      label: 'Continue current policies',
      proposal: null,
      state: base.current,
      reports: base.reports,
      delta: delta(base.current, base.current),
      sharedShockSeed: state.seed,
      quartersSimulated: horizon,
      horizonNote,
    },
    ...proposals.map((proposal) => {
      const branch = simulate(
        submitPolicy(
          branchCampaign(state, POLICY_BY_ID[proposal.policyId]?.name),
          proposal,
        ),
      );
      return {
        label: POLICY_BY_ID[proposal.policyId].name,
        proposal: clone(proposal),
        state: branch.current,
        reports: branch.reports,
        delta: delta(branch.current, base.current),
        sharedShockSeed: state.seed,
        quartersSimulated: horizon,
        horizonNote,
      };
    }),
  ];
}
export function runLegacy(state: GameState): LegacyScenario[] {
  const definitions = [
    {
      id: 'maintenance' as const,
      name: 'Sustained maintenance',
      description:
        'Successors maintain most funded programmes and administrative capability.',
      retention: 0.96,
      stress: 0,
    },
    {
      id: 'partial-reversal' as const,
      name: 'Partial policy reversal',
      description:
        'Later governments reduce programme maintenance and partially reverse institutional reforms.',
      retention: 0.84,
      stress: 0.2,
    },
    {
      id: 'external-stress' as const,
      name: 'External stress',
      description:
        'Policies continue but repeated commodity and climate pressures weaken their legacy.',
      retention: 0.92,
      stress: 1.15,
    },
  ];
  return definitions.map((d) => {
    let gdp = state.economy.realGDP,
      living = state.welfare.livingStandards,
      environment = state.welfare.environment,
      inequality = state.welfare.inequality,
      debtRatio = state.fiscal.debtToGDP;
    const years: LegacyScenario['years'] = [];
    const strength = state.activePolicies
      .filter((a) => a.status === 'completed' || a.status === 'implementing')
      .reduce(
        (sum, a) =>
          sum +
          effectStrength(state, a) *
            (POLICY_BY_ID[a.proposal.policyId].effects.growth ?? 0),
        0,
      );
    const durability =
      (state.institutions.accountability +
        state.institutions.procurementIntegrity +
        state.institutions.judicialCapacity) /
      300;
    for (let year = 1; year <= 20; year++) {
      const retained = Math.pow(
        Math.min(0.995, d.retention + durability * 0.02),
        year,
      );
      const shock =
        (seededRandom(state.seed, state.quarter + year * 4, 'legacy') - 0.5) *
        1.4;
      const growth = clamp(3.6 + strength * retained - d.stress + shock, -2, 8);
      gdp *= 1 + growth / 100;
      living = clamp(
        living +
          (growth - 2.5) * 0.3 +
          strength * retained * 0.05 -
          d.stress * 0.15,
        10,
        95,
      );
      environment = clamp(
        environment - 0.15 - d.stress * 0.3 + durability * 0.15,
        5,
        98,
      );
      inequality = clamp(
        inequality + (1 - retained) * 0.08 - durability * 0.03,
        20,
        65,
      );
      debtRatio = clamp(
        debtRatio + (4 - growth) * 0.5 + d.stress * 0.2,
        10,
        180,
      );
      years.push({
        year: state.year + year,
        gdp,
        livingStandards: living,
        environment,
        inequality,
        debtToGDP: debtRatio,
      });
    }
    return {
      id: d.id,
      name: d.name,
      description: d.description,
      years,
      assumptions: [
        'Twenty-year illustrative scenarios; neither a forecast nor a statistical interval.',
        'Successor maintenance and reversal rates are assumptions.',
        'Durability depends on implemented oversight and judicial capacity; seed-identical external variation is shared.',
      ],
    };
  });
}
export const ALL_POLICY_COUNT = POLICIES.length;
