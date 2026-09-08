import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampaign, branchCampaign } from '../engine';
import { serializeCampaign, deserializeCampaign } from '../engine/validation';
import { SAVE_KEY, ARCHIVE_KEY } from '../engine/storage';
import { localMigrationFiles, discretionaryBudget } from './local-migration';
void test('explicit local migration preserves current and same-id branch archive snapshots without deleting originals', () => {
  const a = createCampaign({ name: 'Source', seed: 9 }),
    b = branchCampaign(a, 'Alternative');
  const values = new Map([
    [SAVE_KEY, serializeCampaign(a)],
    [ARCHIVE_KEY, JSON.stringify([a, b])],
  ]);
  Object.defineProperty(globalThis, 'localStorage', {
    value: { getItem: (key: string) => values.get(key) ?? null },
    configurable: true,
  });
  try {
    const before = JSON.stringify([...values]);
    assert.deepEqual(deserializeCampaign(localMigrationFiles('current')[0]), a);
    const archives = localMigrationFiles('archives').map(deserializeCampaign);
    assert.equal(archives.length, 2);
    assert.deepEqual(archives, [a, b]);
    assert.equal(JSON.stringify([...values]), before);
    values.set(SAVE_KEY, 'bad');
    assert.throws(() => localMigrationFiles('current'));
    assert.equal(localMigrationFiles('archives').length, 2);
  } finally {
    Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
void test('budget warnings account for reserved platform costs and stop at discretionary ceiling', () => {
  assert.deepEqual(
    discretionaryBudget({
      spentUsd: 119,
      limitUsd: 250,
      reservedPlatformUsd: 100,
    }),
    { available: 150, warning: false, exhausted: false },
  );
  assert.equal(
    discretionaryBudget({
      spentUsd: 120,
      limitUsd: 250,
      reservedPlatformUsd: 100,
    }).warning,
    true,
  );
  assert.equal(
    discretionaryBudget({
      spentUsd: 150,
      limitUsd: 250,
      reservedPlatformUsd: 100,
    }).exhausted,
    true,
  );
});
