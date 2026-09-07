import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampaign, runLegacy, deserializeCampaign, serializeCampaign, validateCampaign } from '../src/engine';
import { executeEngineAction } from '../src/engine/protocol';
import { loadCampaign, saveCampaign, SAVE_KEY } from '../src/engine/storage';
import { POLICIES, defaultProposal } from '../src/data/policies';
import type { GameState, FundingSource } from '../src/engine/types';

const close = (actual: number, expected: number, label: string) => assert.ok(Math.abs(actual - expected) < 1e-6 * Math.max(1, Math.abs(expected)), `${label}: ${actual} versus ${expected}`);

void test('all policy families survive full campaigns and legacy with cumulative money and input accounting', () => {
  let quarters = 0;
  for (const [index, policy] of POLICIES.entries()) {
    for (const funding of ['reallocation', 'tax', 'borrowing'] as FundingSource[]) {
      let state = createCampaign({ seed: [0, 1, 77, 20260904, 4294967295][index % 5] });
      const openingNetDebt = state.fiscal.debt - state.fiscal.cash;
      const proposal = { ...defaultProposal(policy.id), funding, scale: index % 2 ? 2 : .25 };
      if (executeEngineAction('preview', { state, proposal }).valid) state = executeEngineAction('submit', { state, proposal });
      let accumulatedBalance = 0;
      while (state.phase === 'presidency') {
        const previous = state;
        state = executeEngineAction('advance', { state }).state;
        accumulatedBalance += state.fiscal.balance;
        close(state.fiscal.debt - state.fiscal.cash, openingNetDebt - accumulatedBalance, `${policy.id}/${funding} cumulative stock-flow`);
        close(state.fiscal.debt - state.fiscal.cash - previous.fiscal.debt + previous.fiscal.cash, -state.fiscal.balance, `${policy.id} quarter financing`);
        assert.ok(state.economy.cocoaProcessed >= 0 && state.economy.cocoaProcessed <= state.economy.cocoaProduction + 1e-8, 'Processing cannot create beans');
        assert.ok(state.economy.cocoaProcessed <= state.economy.processingCapacity + 1e-8, 'Processing cannot exceed installed capacity');
        assert.deepEqual(validateCampaign(state).errors, [], policy.id + ' quarter ' + state.quarter);
        if (state.quarter % 4 === 0) state = executeEngineAction('import', { json: executeEngineAction('export', { state }) });
        assert.ok(state.quarter <= 32);
        quarters++;
      }
      for (const scenario of runLegacy(state)) {
        assert.equal(scenario.years.length, 20);
        for (const [i, year] of scenario.years.entries()) {
          assert.equal(year.year, state.year + i + 1);
          assert.ok(Object.values(year).every(Number.isFinite));
          assert.ok(year.gdp > 0 && year.debtToGDP >= 0);
        }
      }
    }
  }
  assert.ok(quarters >= 72 * 16, 'Every campaign reached an election with all accounting checks intact');
});

void test('zero divisors, absent cocoa groups and impossible physical quantities fail before imported saves run', () => {
  const corrupt: [string, (state: GameState) => void][] = [
    ['zero cocoa baseline', state => { state.baseline.initialCocoaProduction = 0; }],
    ['zero world-price baseline', state => { state.baseline.initialWorldCocoaPrice = 0; }],
    ['no cocoa household weight', state => { for (const h of state.households) if (h.livelihood === 'cocoa') h.livelihood = 'smallholder'; }],
    ['negative processing capacity', state => { state.economy.processingCapacity = -1; }],
    ['processing beyond bean supply', state => { state.economy.cocoaProcessed = state.economy.cocoaProduction + 1; }],
  ];
  for (const [label, mutate] of corrupt) {
    const state = createCampaign(); mutate(state);
    assert.equal(validateCampaign(state).valid, false, label);
    assert.throws(() => deserializeCampaign(JSON.stringify(state)), label);
  }
});

void test('autosave reload preserves the game and quota failure leaves the previous good save recoverable', t => {
  const values = new Map<string, string>(); let quotaExceeded = false;
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { if (quotaExceeded) throw Error('Quota exceeded'); values.set(key, value); }, removeItem: (key: string) => values.delete(key), clear: () => values.clear(), key: (index: number) => [...values.keys()][index] ?? null, get length() { return values.size; } };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  t.after(() => { if (original) Object.defineProperty(globalThis, 'localStorage', original); else Reflect.deleteProperty(globalThis, 'localStorage'); });
  assert.equal(loadCampaign(), null);
  const first = createCampaign({ seed: 77 }); saveCampaign(first); assert.deepEqual(loadCampaign(), first);
  const next = executeEngineAction('advance', { state: first }).state;
  quotaExceeded = true; assert.throws(() => saveCampaign(next), /Export your campaign/);
  assert.deepEqual(loadCampaign(), first); assert.equal(values.get(SAVE_KEY), serializeCampaign(first));
  values.set(SAVE_KEY, '{bad json'); assert.throws(() => loadCampaign(), /not valid JSON/);
});
