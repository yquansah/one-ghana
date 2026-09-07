import type { GameState } from './types';
import {
  SUPPORTED_DATASET_VERSIONS,
  MODEL_VERSION,
  SCHEMA_VERSION,
  REGION_DEFAULTS,
} from './calibration';
import { POLICY_BY_ID } from '../data/policies';
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const number = (v: unknown, min = -Infinity, max = Infinity): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const text = (v: unknown, max = 10000): v is string =>
  typeof v === 'string' && v.length <= max;
const enumValue = (value: unknown): string =>
  typeof value === 'string' ? value : '';
export function validateCampaign(value: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!record(value))
    return { valid: false, errors: ['Campaign must be a JSON object.'] };
  const s = value;
  const check = (ok: unknown, message: string) => {
    if (!ok) errors.push(message);
  };
  check(s.schemaVersion === SCHEMA_VERSION, 'Unsupported save schema version.');
  check(
    s.modelVersion === MODEL_VERSION,
    'Unsupported model version; preserve the original file for a future migration.',
  );
  check(
    (SUPPORTED_DATASET_VERSIONS as readonly string[]).includes(
      enumValue(s.datasetVersion),
    ),
    'Unsupported dataset version; this release preserves the original baseline and needs a compatible dataset reader.',
  );
  check(text(s.id, 200) && text(s.name, 80), 'Invalid campaign identity.');
  check(
    number(s.seed, 0, 4294967295) && Number.isInteger(s.seed),
    'Invalid random seed.',
  );
  check(
    number(s.quarter, 0, 32) && Number.isInteger(s.quarter),
    'Invalid campaign quarter.',
  );
  const q = typeof s.quarter === 'number' ? s.quarter : 0;
  check(
    s.year === 2027 + Math.floor(q / 4) && s.quarterOfYear === (q % 4) + 1,
    'Campaign calendar does not match the quarter.',
  );
  check(
    ['presidency', 'legacy'].includes(enumValue(s.phase)),
    'Invalid campaign phase.',
  );
  check(!(q >= 32 && s.phase === 'presidency'), 'Term limit exceeded.');
  check(typeof s.tutorialCompleted === 'boolean', 'Invalid tutorial state.');
  const required: { [key: string]: string[] } = {
    economy: [
      'realGDP',
      'nominalGDP',
      'priceIndex',
      'growth',
      'inflation',
      'unemployment',
      'exchangeRate',
      'reservesUSD',
      'cocoaProduction',
      'cocoaFarmerIncome',
      'electricityReliability',
      'privateInvestment',
      'worldCocoaPriceUSD',
      'processingCapacity',
      'cocoaProcessed',
    ],
    fiscal: [
      'revenue',
      'baseSpending',
      'policySpending',
      'debtService',
      'balance',
      'debt',
      'debtToGDP',
      'cash',
      'borrowingLimit',
      'annualBudget',
      'yearSpending',
      'revenueRate',
      'spendingRate',
      'effectiveInterestRate',
    ],
    institutions: [
      'parliamentSupport',
      'administrativeCapacity',
      'procurementIntegrity',
      'judicialCapacity',
      'accountability',
      'governmentApproval',
      'policyRate',
    ],
    welfare: [
      'livingStandards',
      'jobs',
      'health',
      'education',
      'lifeSatisfaction',
      'inequality',
      'freedoms',
      'environment',
    ],
  };
  for (const [section, fields] of Object.entries(required)) {
    const r = s[section];
    if (!record(r)) {
      errors.push('Missing ' + section + ' data.');
      continue;
    }
    for (const key of fields)
      check(number(r[key]), 'Invalid number: ' + section + '.' + key);
    if (section === 'institutions' || section === 'welfare')
      for (const key of fields)
        check(number(r[key], 0, 100), 'Out of range: ' + section + '.' + key);
  }
  if (record(s.economy)) {
    const e = s.economy;
    for (const k of [
      'realGDP',
      'nominalGDP',
      'priceIndex',
      'exchangeRate',
      'cocoaProduction',
      'cocoaFarmerIncome',
    ])
      check(number(e[k], 0.001, 1e9), 'Invalid economic scale: ' + k);
    for (const key of ['sectorOutput', 'exportsUSD'])
      check(
        record(e[key]) &&
          Object.values(e[key] as object).every((v) => number(v, 0, 1e9)),
        'Invalid ' + key,
      );
    for (const k of [
      'processingCapacity',
      'cocoaProcessed',
      'reservesUSD',
      'worldCocoaPriceUSD',
    ])
      check(number(e[k], 0, 1e9), 'Invalid nonnegative economic value: ' + k);
    check(
      number(e.growth, -20, 30) &&
        number(e.inflation, 0, 100) &&
        number(e.unemployment, 0, 100) &&
        number(e.electricityReliability, 0, 100) &&
        number(e.privateInvestment, 0, 100),
      'Economic rate out of range.',
    );
    check(
      Number(e.cocoaProcessed) <=
        Math.min(
          Number(e.cocoaProduction) * 0.35,
          (Number(e.processingCapacity) * Number(e.electricityReliability)) /
            100,
        ) +
          1e-6,
      'Processing exceeds available bean inputs or powered capacity.',
    );
    if (record(e.exportsUSD))
      check(
        ['gold', 'cocoa', 'oil'].every((k) =>
          number((e.exportsUSD as Record<string, unknown>)[k], 0, 1e9),
        ),
        'Missing export accounting values.',
      );
    if (record(e.sectorOutput)) {
      const total = ['agriculture', 'industry', 'services'].reduce(
        (sum, k) =>
          sum + Number((e.sectorOutput as Record<string, unknown>)[k]),
        0,
      );
      check(
        number(total) && Math.abs(total - Number(e.realGDP)) < 0.01,
        'Sector output must sum to real GDP.',
      );
    }
    check(
      Math.abs(
        Number(e.nominalGDP) - (Number(e.realGDP) * Number(e.priceIndex)) / 100,
      ) < 0.01,
      'Nominal and real GDP price accounting does not reconcile.',
    );
  }
  if (record(s.fiscal) && record(s.economy)) {
    const f = s.fiscal;
    for (const k of [
      'revenue',
      'baseSpending',
      'policySpending',
      'debtService',
      'debt',
      'cash',
      'borrowingLimit',
      'annualBudget',
      'yearSpending',
    ])
      check(number(f[k], 0, 1e10), 'Fiscal value cannot be negative: ' + k);
    check(
      Math.abs(
        Number(f.revenue) -
          Number(f.baseSpending) -
          Number(f.policySpending) -
          Number(f.debtService) -
          Number(f.balance),
      ) < 0.001,
      'Fiscal ledger does not reconcile.',
    );
    check(
      Math.abs(
        (Number(f.debt) / Number(s.economy.nominalGDP)) * 100 -
          Number(f.debtToGDP),
      ) < 0.001,
      'Debt-to-GDP ratio does not reconcile.',
    );
    check(
      number(f.revenueRate, 0.01, 0.5) &&
        number(f.spendingRate, 0.01, 0.5) &&
        number(f.effectiveInterestRate, 0, 1),
      'Invalid fiscal parameter.',
    );
  }
  check(
    Array.isArray(s.regions) && s.regions.length === 16,
    'Campaign must contain all sixteen regions.',
  );
  if (Array.isArray(s.regions)) {
    const seen = new Set();
    for (const r of s.regions) {
      if (!record(r)) {
        errors.push('Invalid region.');
        continue;
      }
      check(
        REGION_DEFAULTS.some((x) => x[0] === r.id) && !seen.has(r.id),
        'Invalid or duplicate region.',
      );
      seen.add(r.id);
      check(text(r.name, 80), 'Invalid region name.');
      for (const k of [
        'population',
        'poverty',
        'output',
        'agricultureShare',
        'servicesShare',
        'incomeIndex',
        'employmentRate',
        'serviceAccess',
        'environment',
      ])
        check(number(r[k], 0, 1e9), 'Invalid regional ' + k);
    }
  }
  check(
    Array.isArray(s.households) &&
      s.households.length > 0 &&
      s.households.length <= 200,
    'Invalid household groups.',
  );
  if (Array.isArray(s.households)) {
    const seen = new Set();
    let weights = 0;
    for (const h of s.households) {
      if (!record(h)) {
        errors.push('Invalid household.');
        continue;
      }
      check(
        text(h.id, 100) && !seen.has(h.id),
        'Invalid or duplicate household.',
      );
      seen.add(h.id);
      check(
        text(h.name, 150) && text(h.description, 2000),
        'Invalid household text.',
      );
      check(
        ['cocoa', 'smallholder', 'informal', 'salaried'].includes(
          enumValue(h.livelihood),
        ),
        'Invalid livelihood.',
      );
      check(
        REGION_DEFAULTS.some((r) => r[0] === h.regionId),
        'Unknown household region.',
      );
      for (const k of [
        'populationWeight',
        'incomeIndex',
        'consumptionIndex',
        'jobSecurity',
        'foodSecurity',
      ])
        check(number(h[k], 0, 500), 'Invalid household ' + k);
      weights += Number(h.populationWeight);
    }
    check(Math.abs(weights - 1) < 1e-6, 'Household weights must sum to one.');
    check(
      s.households.some(
        (h) =>
          record(h) &&
          h.livelihood === 'cocoa' &&
          number(h.populationWeight, 0.000001, 1),
      ),
      'Campaign requires positive cocoa household representation.',
    );
  }
  check(record(s.baseline), 'Missing frozen campaign baseline.');
  if (record(s.baseline)) {
    const b = s.baseline;
    check(
      b.datasetVersion === s.datasetVersion,
      'Frozen baseline version mismatch.',
    );
    for (const k of [
      'nominalGDP',
      'realGrowth',
      'population',
      'initialCocoaProduction',
      'initialProcessingCapacity',
      'initialCocoaExportsUSD',
      'initialCocoaIncome',
      'initialInflation',
      'initialWorldCocoaPrice',
    ])
      check(
        number(b[k], k === 'initialInflation' ? 0 : 0.001, 1e9),
        'Invalid frozen baseline ' + k,
      );
    check(
      Array.isArray(b.assumptions) && b.assumptions.every((v) => text(v, 2000)),
      'Invalid model assumptions.',
    );
    check(
      Array.isArray(b.regions) && b.regions.length === 16,
      'Missing frozen regional baseline.',
    );
    if (Array.isArray(b.regions)) {
      const ids = new Set();
      for (const r of b.regions) {
        if (!record(r)) {
          errors.push('Invalid frozen regional baseline.');
          continue;
        }
        check(
          REGION_DEFAULTS.some((x) => x[0] === r.id) && !ids.has(r.id),
          'Invalid frozen region identity.',
        );
        ids.add(r.id);
        check(
          text(r.name, 80) &&
            [
              'population',
              'poverty',
              'output',
              'agricultureShare',
              'servicesShare',
              'incomeIndex',
              'employmentRate',
              'serviceAccess',
              'environment',
            ].every((k) => number(r[k], 0, 1e9)),
          'Invalid frozen region values.',
        );
      }
      check(
        Math.abs(
          b.regions.reduce(
            (sum, r) => sum + Number(record(r) ? r.population : NaN),
            0,
          ) - Number(b.population),
        ) < 1,
        'Frozen regional populations do not reconcile.',
      );
    }
    if (Array.isArray(s.regions)) {
      check(
        Math.abs(
          s.regions.reduce(
            (sum, r) => sum + Number(record(r) ? r.population : NaN),
            0,
          ) - Number(b.population),
        ) < 1,
        'Regional population must sum to national population.',
      );
      check(
        record(s.economy) &&
          Math.abs(
            s.regions.reduce(
              (sum, r) => sum + Number(record(r) ? r.output : NaN),
              0,
            ) - Number(s.economy.realGDP),
          ) < 0.01,
        'Regional output must sum to real GDP.',
      );
    }
  }
  check(
    Array.isArray(s.activePolicies) && s.activePolicies.length <= 64,
    'Invalid policy history.',
  );
  if (Array.isArray(s.activePolicies))
    for (const a of s.activePolicies) {
      if (!record(a) || !record(a.proposal)) {
        errors.push('Invalid policy proposal.');
        continue;
      }
      const p = a.proposal;
      check(
        text(a.id, 100) &&
          typeof p.policyId === 'string' &&
          Boolean(POLICY_BY_ID[p.policyId]),
        'Unknown policy identifier.',
      );
      check(
        p.implementation === undefined ||
          ['agency', 'district', 'partnership'].includes(
            enumValue(p.implementation),
          ),
        'Invalid delivery arrangement.',
      );
      check(
        number(p.scale, 0.25, 2) &&
          ['reallocation', 'tax', 'borrowing'].includes(enumValue(p.funding)) &&
          ['national', 'rural', 'vulnerable'].includes(
            enumValue(p.beneficiaries),
          ) &&
          ['standard', 'transparent', 'community'].includes(
            enumValue(p.safeguard),
          ),
        'Invalid policy configuration.',
      );
      check(
        [
          'approved',
          'implementing',
          'completed',
          'rejected',
          'suspended',
        ].includes(enumValue(a.status)),
        'Invalid policy status.',
      );
      check(
        number(a.progress, 0, 100) &&
          number(a.spent, 0, 1e8) &&
          number(a.implementationQuality, 0, 1),
        'Invalid implementation state.',
      );
      check(
        number(a.approvalQuarter, 0, q) && number(a.startQuarter, 1, 33),
        'Invalid policy timing.',
      );
      check(
        a.delayReason === null || text(a.delayReason, 2000),
        'Invalid policy explanation.',
      );
    }
  check(
    Array.isArray(s.history) && s.history.length === q + 1,
    'Metric history length does not match the campaign.',
  );
  if (Array.isArray(s.history))
    s.history.forEach((h, index) => {
      check(
        record(h) &&
          h.quarter === index &&
          [
            'year',
            'gdp',
            'farmerIncome',
            'approval',
            'debtToGDP',
            'livingStandards',
            'unemployment',
            'inflation',
            'environment',
          ].every((k) => number(h[k])),
        'Invalid metric history.',
      );
    });
  check(
    Array.isArray(s.reports) && s.reports.length === q,
    'Report history length does not match the campaign.',
  );
  if (Array.isArray(s.reports))
    s.reports.forEach((r, index) => {
      if (!record(r)) {
        errors.push('Invalid turn report.');
        return;
      }
      check(
        r.quarter === index + 1 &&
          text(r.title) &&
          text(r.summary) &&
          text(r.fiscalExplanation),
        'Invalid report text or turn.',
      );
      for (const k of [
        'attempted',
        'implemented',
        'mechanisms',
        'external',
        'uncertainties',
      ])
        check(
          Array.isArray(r[k]) && (r[k] as unknown[]).every((x) => text(x)),
          'Invalid report ' + k,
        );
      check(
        Array.isArray(r.householdChanges) &&
          r.householdChanges.every(
            (h) =>
              record(h) &&
              text(h.id, 100) &&
              text(h.name, 150) &&
              number(h.incomeChange) &&
              text(h.explanation),
          ),
        'Invalid household report.',
      );
    });
  if (s.phase === 'legacy')
    check(
      q === 16 || q === 32,
      'Legacy begins only at an election or term limit.',
    );
  if (s.phase === 'legacy' && q === 16)
    check(
      record(s.election) && s.election.won === false,
      'First-term legacy requires an election loss.',
    );
  if (q >= 16)
    check(
      record(s.election),
      'Campaign has passed an election without a result.',
    );
  if (s.phase === 'presidency' && q >= 16)
    check(
      record(s.election) && s.election.won === true,
      'A lost election ends the presidency.',
    );
  if (q < 16)
    check(
      s.election === null,
      'Election recorded before the first term ended.',
    );
  if (s.election !== null)
    check(
      record(s.election) &&
        s.election.kind ===
          (Number(s.election.quarter) === 32 ? 'succession' : 'reelection') &&
        [16, 32].includes(Number(s.election.quarter)) &&
        number(s.election.voteShare, 0, 100) &&
        typeof s.election.won === 'boolean' &&
        text(s.election.reason),
      'Invalid election result.',
    );
  // Fail before a malicious or corrupt nested value can be used by the worker.
  const inspect = (v: unknown, depth = 0): void => {
    if (depth > 15) {
      errors.push('Campaign nesting exceeds supported depth.');
      return;
    }
    if (typeof v === 'number' && !Number.isFinite(v))
      errors.push('Campaign contains non-finite numeric data.');
    if (Array.isArray(v)) {
      if (v.length > 1000)
        errors.push('Campaign array exceeds supported size.');
      else v.forEach((x) => inspect(x, depth + 1));
    } else if (record(v))
      for (const [k, x] of Object.entries(v)) {
        if (['__proto__', 'constructor', 'prototype'].includes(k))
          errors.push('Unsafe campaign property.');
        inspect(x, depth + 1);
      }
  };
  inspect(s);
  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}
export function serializeCampaign(state: GameState): string {
  const result = validateCampaign(state);
  if (!result.valid) throw new Error(result.errors.join(' '));
  return JSON.stringify(state, null, 2);
}
export function deserializeCampaign(json: string): GameState {
  if (typeof json !== 'string' || json.length > 8_000_000)
    throw new Error('Campaign file must be smaller than 8 MB.');
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new Error(
      'This file is not valid JSON. Choose a One Ghana campaign export.',
    );
  }
  const result = validateCampaign(value);
  if (!result.valid)
    throw new Error('Cannot load campaign: ' + result.errors.join(' '));
  return value as GameState;
}
