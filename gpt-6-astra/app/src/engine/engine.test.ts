import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceQuarter,
  branchCampaign,
  comparePolicies,
  createCampaign,
  deserializeCampaign,
  getQuarterShocks,
  previewProposal,
  runLegacy,
  serializeCampaign,
  submitPolicy,
  validateCampaign,
} from './index';
import { POLICIES, POLICY_FAMILIES, defaultProposal } from '../data/policies';
import { BASELINE, REGIONS } from '../data/baseline';
import { executeEngineAction } from './protocol';
import type { GameState, PolicyProposal } from './types';
function turns(state: GameState, count: number) {
  for (let i = 0; i < count && state.phase === 'presidency'; i++)
    state = advanceQuarter(state).state;
  return state;
}
function approved(
  policyId: string,
  funding: PolicyProposal['funding'] = 'reallocation',
): GameState {
  for (let seed = 1; seed < 100; seed++) {
    const s = createCampaign({ seed });
    const next = submitPolicy(s, { ...defaultProposal(policyId), funding });
    if (next.activePolicies[0].status === 'approved') return next;
  }
  throw Error('No approved scenario.');
}
function reconcile(s: GameState) {
  const result = validateCampaign(s);
  assert.deepEqual(result.errors, []);
  assert.ok(
    Math.abs(
      s.regions.reduce((sum, r) => sum + r.output, 0) - s.economy.realGDP,
    ) < 1e-6,
  );
  assert.ok(
    Math.abs(
      s.regions.reduce((sum, r) => sum + r.population, 0) -
        s.baseline.population,
    ) < 1,
  );
  assert.ok(
    Math.abs(
      Object.values(s.economy.sectorOutput).reduce((sum, v) => sum + v, 0) -
        s.economy.realGDP,
    ) < 1e-6,
  );
  assert.ok(
    Math.abs(
      s.fiscal.revenue -
        s.fiscal.baseSpending -
        s.fiscal.policySpending -
        s.fiscal.debtService -
        s.fiscal.balance,
    ) < 1e-7,
  );
}
void test('initial evidence is reconciled, separate from synthetic calibration', () => {
  const s = createCampaign();
  reconcile(s);
  assert.equal(s.economy.nominalGDP, BASELINE.nominalGdpBillionGhs);
  assert.equal(s.economy.inflation, BASELINE.inflationPercent);
  assert.equal(s.economy.exchangeRate, BASELINE.exchangeRateGhsPerUsd);
  assert.equal(s.institutions.policyRate, BASELINE.policyRatePercent);
  assert.equal(s.fiscal.cash, BASELINE.fiscal.treasuryCashBillionGhs);
  assert.equal(s.economy.reservesUSD, BASELINE.reserves.grossMillionUsd / 1000);
  assert.deepEqual(
    s.regions.map((r) => r.population),
    REGIONS.map((r) => r.projectedPopulation2026),
  );
  assert.ok(
    Math.abs(s.fiscal.balance + (BASELINE.nominalGdpBillionGhs * 0.01) / 4) <
      1e-7,
  );
});
void test('24 policies span all six families, with legal route, source links and explicit assumptions', () => {
  assert.equal(POLICIES.length, 24);
  for (const f of POLICY_FAMILIES)
    assert.equal(POLICIES.filter((p) => p.family === f.id).length, 4);
  for (const p of POLICIES) {
    assert.ok(p.evidenceIds.length);
    assert.ok(p.legalRoute && p.mechanism && p.assumptions.length);
  }
});
void test('announcements have no productive effect and quarterly transitions are immutable', () => {
  const s = createCampaign({ seed: 1 }),
    original = structuredClone(s);
  const proposed = submitPolicy(s, defaultProposal('farmer-pricing'));
  assert.deepEqual(s, original);
  assert.deepEqual(proposed.economy, s.economy);
  assert.deepEqual(proposed.fiscal, s.fiscal);
  const old = structuredClone(proposed);
  advanceQuarter(proposed);
  assert.deepEqual(proposed, old);
});
void test('identical seed and actions reproduce every state and explanation', () => {
  const run = () =>
    turns(
      submitPolicy(
        createCampaign({ seed: 44 }),
        defaultProposal('farmer-pricing'),
      ),
      16,
    );
  assert.deepEqual(run(), run());
  assert.notDeepEqual(getQuarterShocks(1, 1), getQuarterShocks(2, 1));
});
void test('borrowing enters debt or reduces treasury cash without becoming revenue or reserves', () => {
  const funded = approved('farmer-pricing', 'borrowing'),
    control = createCampaign({ seed: funded.seed });
  const a = advanceQuarter(funded).state,
    b = advanceQuarter(control).state;
  reconcile(a);
  assert.ok(a.fiscal.policySpending > 0);
  assert.ok(a.fiscal.debt - a.fiscal.cash > b.fiscal.debt - b.fiscal.cash);
  assert.equal(a.economy.reservesUSD, b.economy.reservesUSD);
  assert.ok(
    Math.abs(
      a.fiscal.revenue - (a.economy.nominalGDP * a.fiscal.revenueRate) / 4,
    ) < 1e-9,
  );
});
void test('tax and reallocation funding have distinct household and accounting costs', () => {
  const r = approved('farmer-pricing'),
    base = createCampaign({ seed: r.seed });
  const tax = {
    ...r,
    activePolicies: r.activePolicies.map((a) => ({
      ...a,
      proposal: { ...a.proposal, funding: 'tax' as const },
    })),
  };
  const a = advanceQuarter(r).state,
    b = advanceQuarter(tax).state,
    c = advanceQuarter(base).state;
  reconcile(a);
  reconcile(b);
  assert.ok(a.fiscal.baseSpending < c.fiscal.baseSpending);
  assert.ok(b.fiscal.revenue > c.fiscal.revenue);
  assert.ok(
    b.households.find((h) => h.livelihood === 'salaried')!.incomeIndex <
      c.households.find((h) => h.livelihood === 'salaried')!.incomeIndex,
  );
});
void test('replanting reduces production before first harvest and needs implementation', () => {
  const s = approved('cocoa-rehabilitation');
  const a = turns(s, 8),
    b = turns(createCampaign({ seed: s.seed }), 8);
  assert.ok(a.economy.cocoaProduction < b.economy.cocoaProduction);
  assert.ok(
    a.reports.some((r) =>
      r.mechanisms.some((m) => m.includes('temporarily removes')),
    ),
  );
  assert.ok(a.activePolicies[0].progress < 100);
});
void test('processing generates no productivity gain while plant is being built', () => {
  const s = approved('processing-investment', 'tax');
  const a = advanceQuarter(s).state,
    b = advanceQuarter(createCampaign({ seed: s.seed })).state;
  assert.equal(a.economy.growth, b.economy.growth);
  assert.equal(a.economy.processingCapacity, b.economy.processingCapacity);
  assert.ok(
    a.economy.cocoaProcessed <= a.economy.cocoaProduction * 0.35 + 1e-9,
  );
  assert.ok(
    a.economy.cocoaProcessed <=
      (a.economy.processingCapacity * a.economy.electricityReliability) / 100 +
        1e-9,
  );
});
void test('fiscal exhaustion suspends programme delivery and removes benefits', () => {
  const s = approved('roads-ports', 'borrowing');
  s.fiscal.annualBudget = 1;
  const a = advanceQuarter(s).state;
  assert.equal(a.activePolicies[0].status, 'suspended');
  assert.equal(a.activePolicies[0].spent, 0);
  assert.equal(a.activePolicies[0].progress, 0);
});
void test('legislative rejection is deterministic, gives reasons, and never implements', () => {
  let found: GameState | undefined;
  for (let seed = 1; seed < 100 && !found; seed++) {
    const s = submitPolicy(createCampaign({ seed }), {
      ...defaultProposal('competition-enforcement'),
      funding: 'tax',
    });
    if (s.activePolicies[0].status === 'rejected') found = s;
  }
  assert.ok(found);
  const after = turns(found, 4);
  assert.equal(after.activePolicies[0].spent, 0);
  assert.ok(after.activePolicies[0].delayReason);
});
void test('preview validates proposals and reports ordered model scenarios', () => {
  const s = createCampaign(),
    p = previewProposal(s, defaultProposal('farmer-pricing'));
  assert.ok(p.valid);
  assert.ok(
    p.scenarioRange.low.farmerIncome <= p.scenarioRange.central.farmerIncome,
  );
  assert.ok(
    p.scenarioRange.central.farmerIncome <= p.scenarioRange.high.farmerIncome,
  );
  assert.match(p.rangeLabel, /not prediction/);
  assert.throws(() =>
    submitPolicy(s, { ...defaultProposal('farmer-pricing'), scale: NaN }),
  );
  assert.throws(() =>
    submitPolicy(s, { ...defaultProposal('farmer-pricing'), scale: 10 }),
  );
});
void test('branch comparisons preserve shocks and cap all branches at same election horizon', () => {
  const s = turns(createCampaign({ seed: 3 }), 14),
    copy = structuredClone(s);
  const branches = comparePolicies(
    s,
    [
      defaultProposal('farmer-pricing'),
      defaultProposal('cocoa-rehabilitation'),
    ],
    12,
  );
  assert.deepEqual(s, copy);
  assert.equal(branches.length, 3);
  for (const b of branches) {
    assert.equal(b.quartersSimulated, 2);
    assert.equal(b.state.quarter, 16);
    assert.equal(b.sharedShockSeed, s.seed);
    assert.deepEqual(
      b.reports.map((r) => r.external),
      branches[0].reports.map((r) => r.external),
    );
  }
  assert.equal(branches[0].delta.gdp, 0);
});
void test('election defeat ends control at 16 quarters; two terms end at 32', () => {
  let losing = createCampaign();
  losing.institutions.governmentApproval = 10;
  losing = turns(losing, 32);
  assert.equal(losing.quarter, 16);
  assert.equal(losing.phase, 'legacy');
  assert.equal(losing.election?.won, false);
  assert.throws(() => advanceQuarter(losing));
  let winning = createCampaign();
  winning.institutions.governmentApproval = 90;
  winning = turns(winning, 32);
  assert.equal(winning.quarter, 32);
  assert.equal(winning.phase, 'legacy');
  reconcile(winning);
});
void test('presidency and all 20-year legacy scenarios remain numerically stable over many seeds', () => {
  for (let seed = 1; seed <= 24; seed++) {
    let s = createCampaign({ seed });
    if (seed % 2 === 0)
      s = submitPolicy(s, defaultProposal(POLICIES[seed % 24].id));
    for (let q = 0; q < 32 && s.phase === 'presidency'; q++) {
      s = advanceQuarter(s).state;
      reconcile(s);
    }
    const legacy = runLegacy(s);
    assert.equal(legacy.length, 3);
    for (const scenario of legacy) {
      assert.equal(scenario.years.length, 20);
      assert.ok(
        scenario.years.every((y) => Object.values(y).every(Number.isFinite)),
      );
    }
    assert.deepEqual(runLegacy(s), legacy);
  }
});
void test('versioned export/import and branching preserve frozen state, seed and replay', () => {
  const s = turns(approved('farmer-pricing'), 5);
  const restored = deserializeCampaign(serializeCampaign(s));
  assert.deepEqual(restored, s);
  assert.deepEqual(advanceQuarter(restored), advanceQuarter(s));
  const branch = branchCampaign(s, 'Alternative path');
  assert.equal(branch.seed, s.seed);
  assert.deepEqual(branch.baseline, s.baseline);
  branch.welfare.health = 0;
  assert.notEqual(branch.welfare.health, s.welfare.health);
});
void test('corrupt and incompatible imports fail before simulation, including nested baseline and exports', () => {
  const corrupt: ((s: GameState) => void)[] = [
    (s) => (s.schemaVersion = 99),
    (s) => Reflect.set(s, 'seed', 'bad'),
    (s) => Reflect.set(s.economy, 'exportsUSD', {}),
    (s) => (s.economy.nominalGDP += 100),
    (s) => (s.fiscal.debtToGDP = 1),
    (s) => (s.households[0].populationWeight = 9),
    (s) => Reflect.set(s.baseline.regions, 0, null),
    (s) => (s.phase = 'legacy'),
    (s) => (s.history = []),
  ];
  for (const mutate of corrupt) {
    const s = createCampaign();
    mutate(s);
    assert.equal(validateCampaign(s).valid, false);
    assert.throws(() => deserializeCampaign(JSON.stringify(s)));
  }
  assert.throws(() => deserializeCampaign('broken'));
  assert.throws(() =>
    executeEngineAction('advance', { state: {} as GameState }),
  );
});
void test('worker protocol shares validation with direct actions', () => {
  const s = executeEngineAction('create', { seed: 7 });
  assert.deepEqual(
    executeEngineAction('advance', { state: s }),
    advanceQuarter(s),
  );
  assert.deepEqual(
    executeEngineAction('import', {
      json: executeEngineAction('export', { state: s }),
    }),
    s,
  );
});
void test('preview uses actual processing construction lag and does not promise first-year plant output', () => {
  const s = createCampaign({ seed: 1 });
  const p = previewProposal(s, {
    ...defaultProposal('processing-investment'),
    funding: 'tax',
  });
  assert.ok(p.valid);
  assert.ok(p.scenarioRange.central.gdp <= 0.00001);
});
void test('delivery arrangements change actual cost and delivery without changing legal authority', () => {
  const s = approved('cocoa-rehabilitation');
  const district = structuredClone(s);
  district.activePolicies[0].proposal.implementation = 'district';
  const a = advanceQuarter(s).state,
    b = advanceQuarter(district).state;
  assert.ok(b.activePolicies[0].spent > a.activePolicies[0].spent);
  assert.ok(b.activePolicies[0].progress < a.activePolicies[0].progress);
  reconcile(a);
  reconcile(b);
});
void test('public finance savings and debt planning change their own accounts rather than tax rate', () => {
  const p = POLICIES.find((x) => x.id === 'spending-reallocation')!,
    d = POLICIES.find((x) => x.id === 'debt-management')!;
  assert.equal(p.effects.revenue, undefined);
  assert.ok(p.effects.spendingEfficiency);
  assert.equal(d.effects.revenue, undefined);
  assert.ok(d.effects.debtPremium);
});
