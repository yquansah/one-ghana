import {
  advanceQuarter,
  comparePolicies,
  createCampaign,
  previewProposal,
  runLegacy,
  submitPolicy,
} from './index';
import {
  deserializeCampaign,
  serializeCampaign,
  validateCampaign,
} from './validation';
import type { GameState, PolicyProposal, ExternalEventSchedule } from './types';
export interface EnginePayloads {
  create: { seed?: number; name?: string };
  preview: { state: GameState; proposal: PolicyProposal; externalSchedule?: ExternalEventSchedule };
  submit: { state: GameState; proposal: PolicyProposal };
  advance: { state: GameState };
  compare: { state: GameState; proposals: PolicyProposal[]; quarters?: number; externalSchedule?: ExternalEventSchedule };
  legacy: { state: GameState };
  import: { json: string };
  export: { state: GameState };
}
export interface EngineResults {
  create: GameState;
  preview: ReturnType<typeof previewProposal>;
  submit: GameState;
  advance: ReturnType<typeof advanceQuarter>;
  compare: ReturnType<typeof comparePolicies>;
  legacy: ReturnType<typeof runLegacy>;
  import: GameState;
  export: string;
}
export type EngineAction = keyof EnginePayloads;
export function executeEngineAction<A extends EngineAction>(
  action: A,
  payload: EnginePayloads[A],
): EngineResults[A] {
  if (!payload || typeof payload !== 'object')
    throw new Error('Missing engine action payload.');
  if ('state' in payload) {
    const result = validateCampaign(payload.state);
    if (!result.valid)
      throw new Error('Invalid campaign: ' + result.errors.join(' '));
  }
  let result: unknown;
  switch (action) {
    case 'create':
      result = createCampaign(payload as EnginePayloads['create']);
      break;
    case 'preview': {
      const p = payload as EnginePayloads['preview'];
      result = previewProposal(p.state, p.proposal, p.externalSchedule);
      break;
    }
    case 'submit': {
      const p = payload as EnginePayloads['submit'];
      result = submitPolicy(p.state, p.proposal);
      break;
    }
    case 'advance':
      result = advanceQuarter((payload as EnginePayloads['advance']).state);
      break;
    case 'compare': {
      const p = payload as EnginePayloads['compare'];
      result = comparePolicies(p.state, p.proposals, p.quarters, p.externalSchedule);
      break;
    }
    case 'legacy':
      result = runLegacy((payload as EnginePayloads['legacy']).state);
      break;
    case 'import':
      result = deserializeCampaign((payload as EnginePayloads['import']).json);
      break;
    case 'export':
      result = serializeCampaign((payload as EnginePayloads['export']).state);
      break;
    default:
      throw new Error('Unknown engine action.');
  }
  return result as EngineResults[A];
}
