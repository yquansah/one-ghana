import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampaign } from '../src/engine';
import {
  archiveCampaign,
  loadArchivedCampaigns,
  removeArchivedCampaign,
} from '../src/engine/storage';

void test('removing one same-seed, same-quarter archive preserves its differently named sibling', (t) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  });
  const first = createCampaign({ seed: 7, name: 'Cocoa strategy' });
  const second = createCampaign({ seed: 7, name: 'Health strategy' });
  archiveCampaign(first);
  archiveCampaign(second);
  assert.equal(loadArchivedCampaigns().length, 2);
  removeArchivedCampaign(first.id, first.quarter, first.name);
  const remaining = loadArchivedCampaigns();
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].name, second.name);
});
