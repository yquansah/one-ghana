import test from 'node:test';
import assert from 'node:assert/strict';
import { BASELINE, REGIONS, HOUSEHOLD_GROUPS } from '../src/data/baseline';
import { EVIDENCE, SOURCES, DATASET_VERSION, RESEARCH_CUTOFF } from '../src/data/evidence';
import { POLICIES, POLICY_FAMILIES } from '../src/data/policies';

void test('published evidence has complete provenance, explicit nulls and a stable historical cutoff', () => {
  const ids = new Set(EVIDENCE.map(record => record.id)); const sources = new Set(SOURCES.map(source => source.id));
  assert.equal(ids.size, EVIDENCE.length); assert.equal(sources.size, SOURCES.length);
  assert.equal(BASELINE.datasetVersion, DATASET_VERSION); assert.equal(BASELINE.researchCutoff, RESEARCH_CUTOFF);
  for (const record of EVIDENCE) {
    assert.ok(sources.has(record.sourceId), record.id + ' has an unknown source');
    assert.ok(record.indicator && record.referencePeriod && record.unit && record.definition && record.revisionStatus && record.locator, record.id);
    assert.equal(record.status === 'unavailable', record.value === null, record.id);
    if (record.value !== null) assert.ok(Number.isFinite(record.value), record.id);
    if (record.publicationDate && record.sourceId !== 'model-v1') assert.ok(record.publicationDate <= RESEARCH_CUTOFF, record.id + ' is after historical cutoff');
  }
  for (const source of SOURCES) { assert.ok(source.publicationDateNote, source.id); if (source.id !== 'model-v1') assert.match(source.url, /^https:\/\//); }
});

void test('all sixteen official projected populations reconcile and synthetic weights remain labelled', () => {
  assert.equal(REGIONS.length, 16); assert.equal(new Set(REGIONS.map(r => r.id)).size, 16);
  assert.equal(REGIONS.reduce((sum, r) => sum + r.projectedPopulation2026, 0), BASELINE.population);
  assert.equal(REGIONS.reduce((sum, r) => sum + r.censusPopulation2021, 0), 30832019);
  assert.ok(Math.abs(REGIONS.reduce((sum, r) => sum + r.populationWeight, 0) - 1) < 1e-12);
  assert.ok(REGIONS.every(r => r.status === 'projection'));
  assert.ok(HOUSEHOLD_GROUPS.every(h => h.status === 'assumption'));
  assert.ok(Math.abs(HOUSEHOLD_GROUPS.reduce((sum, h) => sum + h.weight, 0) - 1) < 1e-12);
  assert.ok(Math.abs(Object.values(BASELINE.sectorShares).reduce<number>((a, b) => a + b, 0) - 1) < 1e-12);
  assert.ok(Math.abs(BASELINE.debt.externalBillionGhs + BASELINE.debt.domesticBillionGhs - BASELINE.debt.totalBillionGhs) < 1e-9);
});

void test('all 24 policies have a legal route, causal explanation, risks, assumptions and resolvable evidence', () => {
  assert.equal(POLICIES.length, 24); assert.equal(new Set(POLICIES.map(p => p.id)).size, 24);
  const known = new Set([...EVIDENCE.map(e => e.id), ...SOURCES.map(s => s.id)]);
  for (const family of POLICY_FAMILIES) assert.equal(POLICIES.filter(p => p.family === family.id).length, 4, family.id);
  for (const policy of POLICIES) {
    assert.ok(policy.legalRoute && policy.mechanism && policy.assumptions.length && policy.tradeoffs.length, policy.id);
    assert.ok(policy.evidenceIds.length, policy.id + ' has no evidence route');
    for (const id of policy.evidenceIds) assert.ok(known.has(id), policy.id + ': unresolved evidence ' + id);
  }
});
