import { advanceQuarter, validateCampaign } from '../engine';
import type { ExternalEventSchedule, ExternalQuarterEffects, GameState } from '../engine';
import type { CampaignEvent, CampaignRecord, EventEffects, PublishedEvent } from './contracts';

export const EVENT_BOUNDS: Readonly<Record<keyof EventEffects, number>> = {
  cocoaYieldPct: 15, energyAvailabilityPoints: 10, externalDemandPct: 5,
};
export const EVENT_MAPPING_ASSUMPTIONS = [
  'These bounded scenario effects are reviewed teaching assumptions, not estimated causal effects of the news.',
  'Cocoa yield changes this quarter’s harvest before processing and income calculations; changed production carries forward.',
  'Energy availability changes the reliability index before this quarter’s production; the level carries forward.',
  'A 1% external-demand scenario changes this quarter’s annualised growth by 0.12 percentage points; GDP then carries forward.',
];
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected an event object.');
  return value as Record<string, unknown>;
}
function string(value: unknown, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error('Invalid event text.');
  return value;
}
export function validateEventEffects(value: unknown): EventEffects {
  const effects = record(value);
  if (!Object.keys(effects).length || Object.entries(effects).some(([k,v]) => !Object.hasOwn(EVENT_BOUNDS,k) || typeof v !== 'number' || !Number.isFinite(v) || Math.abs(v) > EVENT_BOUNDS[k as keyof EventEffects])) throw new Error('Event effects are outside the reviewed bounds.');
  if (!Object.values(effects).some(v => v !== 0)) throw new Error('Choose at least one nonzero scenario effect.');
  return { ...effects } as EventEffects;
}
export function validatePublishedEvent(value: unknown): PublishedEvent {
  const e = record(value);
  const allowed = ['id','version','briefingId','title','description','sourceUrl','eventDate','publishedAt','mappingVersion','effects','assumptions','status'];
  if (Object.keys(e).some(k => !allowed.includes(k))) throw new Error('Unknown event field.');
  if (!Number.isInteger(e.version) || Number(e.version) < 1 || e.mappingVersion !== 1 || !['published','withdrawn'].includes(e.status as string)) throw new Error('Unsupported event version or status.');
  const sourceUrl = string(e.sourceUrl,2048);
  const url = new URL(sourceUrl);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Event source must be HTTPS.');
  if (typeof e.publishedAt !== 'string' || !Number.isFinite(Date.parse(e.publishedAt)) || (e.eventDate !== null && (typeof e.eventDate !== 'string' || !Number.isFinite(Date.parse(e.eventDate))))) throw new Error('Event dates are invalid.');
  if (!Array.isArray(e.assumptions) || !e.assumptions.length || e.assumptions.length > 20) throw new Error('Event assumptions are required.');
  return {
    id:string(e.id,160),version:e.version as number,briefingId:string(e.briefingId,160),title:string(e.title,240),description:string(e.description,4000),sourceUrl,eventDate:e.eventDate as string|null,publishedAt:e.publishedAt,mappingVersion:1,effects:validateEventEffects(e.effects),assumptions:e.assumptions.map(a => string(a,2000)),status:e.status as PublishedEvent['status'],
  };
}
export function validateCampaignEvents(state: GameState, value: unknown, eventMode: 'classic'|'live'): CampaignEvent[] {
  if (!['classic','live'].includes(eventMode) || !Array.isArray(value) || value.length > 128 || (eventMode === 'classic' && value.length)) throw new Error('Invalid campaign event history.');
  const ids = new Set<string>();
  const events = value.map(item => {
    const c = record(item);
    if (Object.keys(c).some(k => !['event','acceptedAt','scheduledQuarter','appliedQuarter'].includes(k))) throw new Error('Unknown campaign event field.');
    const event = validatePublishedEvent(c.event);
    // A corrected version cannot be reapplied under the same event identity.
    if (ids.has(event.id)) throw new Error('Duplicate campaign event.');
    ids.add(event.id);
    if (typeof c.acceptedAt !== 'string' || !Number.isFinite(Date.parse(c.acceptedAt)) || !Number.isInteger(c.scheduledQuarter) || Number(c.scheduledQuarter)<1 || Number(c.scheduledQuarter)>32) throw new Error('Invalid event schedule.');
    if (c.appliedQuarter === null ? c.scheduledQuarter !== state.quarter + 1 || state.phase !== 'presidency' : c.appliedQuarter !== c.scheduledQuarter || Number(c.appliedQuarter)>state.quarter) throw new Error('Event history does not match this campaign quarter.');
    return {event,acceptedAt:c.acceptedAt,scheduledQuarter:c.scheduledQuarter as number,appliedQuarter:c.appliedQuarter as number|null};
  });
  eventSchedule({events});
  return events;
}
export function eventSchedule(record: Pick<CampaignRecord,'events'>): ExternalEventSchedule {
  const schedule: ExternalEventSchedule = {};
  for (const c of record.events) {
    if (c.appliedQuarter !== null) continue;
    const current: ExternalQuarterEffects = schedule[c.scheduledQuarter] ?? {};
    for (const key of Object.keys(c.event.effects) as (keyof EventEffects)[]) {
      current[key] = (current[key] ?? 0) + (c.event.effects[key] ?? 0);
      if (Math.abs(current[key]!) > EVENT_BOUNDS[key]) throw new Error('Combined events exceed this quarter’s scenario limit. Try a separate campaign branch.');
    }
    schedule[c.scheduledQuarter] = current;
  }
  return schedule;
}
export function acceptCampaignEvent(campaign: CampaignRecord, input: PublishedEvent, acceptedAt = new Date().toISOString()): CampaignRecord {
  if (campaign.eventMode !== 'live') throw new Error('Create a live-event branch before accepting a scenario.');
  if (campaign.state.phase !== 'presidency' || campaign.state.quarter>=32) throw new Error('This presidency has ended.');
  const event = validatePublishedEvent(input);
  if (event.status !== 'published') throw new Error('This event has been withdrawn.');
  if (campaign.events.some(c => c.event.id===event.id)) throw new Error('This campaign has already accepted this event.');
  const next = structuredClone(campaign);
  next.events.push({event,acceptedAt,scheduledQuarter:campaign.state.quarter+1,appliedQuarter:null});
  next.events = validateCampaignEvents(next.state,next.events,next.eventMode);
  return next;
}
export function advanceCampaign(campaign: CampaignRecord) {
  const nextQuarter = campaign.state.quarter+1;
  const due = campaign.events.filter(e => e.appliedQuarter===null && e.scheduledQuarter===nextQuarter);
  const result = advanceQuarter(campaign.state,eventSchedule(campaign)[nextQuarter]);
  for (const item of due) result.report.external.push(`Accepted scenario: ${item.event.title}. Real-world date: ${item.event.eventDate ?? 'not specified'}; applied in fictional quarter ${nextQuarter}. ${item.event.sourceUrl}`);
  if (due.length) result.report.uncertainties.push(...EVENT_MAPPING_ASSUMPTIONS);
  const validated=validateCampaign(result.state);
  if (!validated.valid) throw new Error('Event transition violated campaign invariants: '+validated.errors.join(' '));
  return {...result,events:campaign.events.map(e => e.appliedQuarter===null && e.scheduledQuarter===nextQuarter ? {...e,appliedQuarter:nextQuarter} : structuredClone(e))};
}
export function previewCampaignEvent(campaign: CampaignRecord,event: PublishedEvent) {
  const base=advanceCampaign(campaign).state;
  const scenario=advanceCampaign(acceptCampaignEvent(campaign,event)).state;
  return {baseline:base,scenario,delta:{gdp:scenario.economy.realGDP-base.economy.realGDP,farmerIncome:scenario.economy.cocoaFarmerIncome-base.economy.cocoaFarmerIncome,debt:scenario.fiscal.debt-base.fiscal.debt,approval:scenario.institutions.governmentApproval-base.institutions.governmentApproval,livingStandards:scenario.welfare.livingStandards-base.welfare.livingStandards}};
}
