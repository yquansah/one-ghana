import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceQuarter, comparePolicies, createCampaign, validateCampaign } from '../../src/engine';
import type { CampaignRecord, PublishedEvent } from '../../src/saas/contracts';
import { acceptCampaignEvent, advanceCampaign, eventSchedule, previewCampaignEvent, validateCampaignEvents, validatePublishedEvent } from '../../src/saas/events';
const now='2026-09-08T08:00:00.000Z';
function campaign(): CampaignRecord { return {id:'campaign-1',revision:1,state:createCampaign({seed:20260904}),eventMode:'live',events:[],createdAt:now,updatedAt:now}; }
function event(): PublishedEvent { return {id:'cocoa-weather',version:1,briefingId:'briefing-1',title:'Cocoa harvest scenario',description:'A bounded illustrative adverse harvest scenario.',sourceUrl:'https://www.cocobod.gh/',eventDate:'2026-09-08',publishedAt:now,mappingVersion:1,effects:{cocoaYieldPct:-8},assumptions:['Synthetic scenario, not an estimate of observed losses.'],status:'published'}; }
void test('classic campaigns reproduce the old transition and reject event acceptance',()=>{
 const c=campaign();c.eventMode='classic';assert.deepEqual(advanceCampaign(c).state,advanceQuarter(c.state).state);
 assert.throws(()=>acceptCampaignEvent(c,event(),now),/live-event branch/);
});
void test('event acceptance is non-mutating; application is once-only and preserves fiscal/production invariants',()=>{
 const c=campaign(), accepted=acceptCampaignEvent(c,event(),now);
 assert.deepEqual(accepted.state,c.state);assert.equal(c.events.length,0);
 const first=advanceCampaign(accepted),control=advanceQuarter(c.state);
 assert(first.state.economy.cocoaProduction<control.state.economy.cocoaProduction);
 assert(first.state.economy.cocoaFarmerIncome<control.state.economy.cocoaFarmerIncome);
 assert.equal(first.events[0].appliedQuarter,1);assert.equal(validateCampaign(first.state).valid,true);
 const advanced={...accepted,state:first.state,events:first.events};
 assert.deepEqual(eventSchedule(advanced),{});
 assert.deepEqual(advanceCampaign(advanced).state,advanceQuarter(first.state).state);
 assert.throws(()=>acceptCampaignEvent(advanced,event(),now),/already accepted/);
});
void test('preview and same-event comparisons do not mutate live state',()=>{
 const c=campaign(),original=structuredClone(c);
 assert(previewCampaignEvent(c,event()).delta.farmerIncome<0);assert.deepEqual(c,original);
 const accepted=acceptCampaignEvent(c,event(),now);
 const proposals=[{policyId:'cocoa-rehabilitation',scale:1,funding:'reallocation' as const,beneficiaries:'rural' as const,safeguard:'transparent' as const}];
 const comparisons=comparePolicies(c.state,proposals,4,eventSchedule(accepted));
 assert.deepEqual(comparisons,comparePolicies(c.state,proposals,4,eventSchedule(accepted)));
 assert.equal(comparisons[0].quartersSimulated,comparisons[1].quartersSimulated);
 assert.deepEqual(c,original);
});
void test('unreviewed shapes, duplicate versions and excessive combined events are rejected',()=>{
 for(const effects of [{cocoaYieldPct:Infinity},{cocoaYieldPct:-16},{constructor:1},{unapprovedEffect:1},{cocoaYieldPct:0}]) assert.throws(()=>validatePublishedEvent({...event(),effects}));
 assert.throws(()=>validatePublishedEvent({...event(),version:[1]}));
 assert.throws(()=>acceptCampaignEvent(campaign(),{...event(),status:'withdrawn'},now));
 const accepted=acceptCampaignEvent(campaign(),event(),now);
 assert.throws(()=>acceptCampaignEvent(accepted,{...event(),id:'other-event'},now),/Combined events/);
 assert.throws(()=>validateCampaignEvents(accepted.state,[...accepted.events,...accepted.events],'live'),/Duplicate/);
});
void test('live history round-trips and rejected timelines do not masquerade as classic saves',()=>{
 const accepted=acceptCampaignEvent(campaign(),event(),now), advanced=advanceCampaign(accepted);
 assert.deepEqual(validateCampaignEvents(advanced.state,JSON.parse(JSON.stringify(advanced.events)),'live'),advanced.events);
 assert.throws(()=>validateCampaignEvents(advanced.state,advanced.events,'classic'));
 assert.throws(()=>validateCampaignEvents(advanced.state,accepted.events,'live'));
});
