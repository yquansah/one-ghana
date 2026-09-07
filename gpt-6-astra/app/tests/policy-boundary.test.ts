import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createCampaign,
  previewProposal,
  submitPolicy,
  advanceQuarter,
  validateCampaign,
} from '../src/engine';
import { defaultProposal } from '../src/data/policies';
void test('prototype names are not policy IDs', () => {
  const campaign = createCampaign();
  for (const id of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
    assert.throws(
      () => previewProposal(campaign, defaultProposal(id)),
      /Unknown policy/,
    );
    assert.throws(
      () => submitPolicy(campaign, defaultProposal(id)),
      /recognised policy/,
    );
  }
  assert.equal(campaign.activePolicies.length, 0);
});
void test('delivery time preview reflects arrangement and safeguard delivery costs', () => {
  const campaign = createCampaign();
  const proposal = defaultProposal('cocoa-rehabilitation');
  const agency = previewProposal(campaign, proposal);
  const district = previewProposal(campaign, {
    ...proposal,
    implementation: 'district',
  });
  const standard = previewProposal(campaign, {
    ...proposal,
    safeguard: 'standard',
  });
  assert.ok(district.implementationQuarters >= agency.implementationQuarters);
  assert.ok(standard.implementationQuarters >= agency.implementationQuarters);
  let approved = submitPolicy(campaign, proposal);
  assert.equal(approved.activePolicies[0].status, 'approved');
  approved = advanceQuarter(approved).state;
  const fundedPace = approved.activePolicies[0].progress;
  assert.equal(agency.implementationQuarters, Math.ceil(100 / fundedPace));
});

void test('import rejects arrays masquerading as enum strings', () => {
  const state = submitPolicy(
    createCampaign(),
    defaultProposal('cocoa-rehabilitation'),
  );
  Reflect.set(state.activePolicies[0].proposal, 'funding', ['tax']);
  assert.equal(validateCampaign(state).valid, false);
});
