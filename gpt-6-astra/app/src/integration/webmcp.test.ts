import test from 'node:test';
import assert from 'node:assert/strict';
import {
  gameTools,
  registerGameTools,
  type GameToolActions,
  type ModelContext,
} from './webmcp';

function fixture() {
  let quarter = 0;
  const submitted: unknown[] = [];
  const actions: GameToolActions = {
    read: () => ({ quarter, submitted }),
    preview: async (p) => ({ valid: true, proposal: p }),
    submit: async (p) => {
      submitted.push(p);
      return { count: submitted.length };
    },
    advance: async () => ({ quarter: ++quarter }),
    compare: async (proposals) => ({ count: proposals.length }),
  };
  return { actions, tools: gameTools(actions) };
}
const proposal = {
  policyId: 'cocoa-rehabilitation',
  scale: 1,
  funding: 'reallocation',
  beneficiaries: 'rural',
  safeguard: 'transparent',
};

void test('WebMCP contract exposes five explicit shared game actions', async () => {
  const { tools } = fixture();
  assert.deepEqual(
    tools.map((x) => x.name),
    [
      'read_presidency',
      'preview_policy',
      'submit_policy',
      'advance_quarter',
      'compare_policies',
    ],
  );
  assert.equal(tools[0].annotations.readOnlyHint, true);
  assert.equal(tools[2].annotations.readOnlyHint, false);
  await tools[2].execute(proposal);
  await tools[3].execute({});
  assert.deepEqual(await tools[0].execute({}), {
    quarter: 1,
    submitted: [proposal],
  });
  assert.deepEqual(
    await tools[4].execute({ proposals: [proposal, proposal] }),
    { count: 2 },
  );
});
void test('malformed tool inputs cannot mutate campaign', () => {
  const { tools } = fixture();
  for (const input of [
    null,
    [],
    { ...proposal, scale: NaN },
    { ...proposal, scale: 5 },
    { ...proposal, funding: 'reserves' },
    { ...proposal, extra: true },
    { ...proposal, implementation: 'military' },
  ])
    assert.throws(() => tools[2].execute(input));
  assert.throws(() => tools[3].execute({ quarters: 20 }));
  assert.throws(() => tools[4].execute({ proposals: [proposal] }));
  assert.deepEqual(tools[0].execute({}), { quarter: 0, submitted: [] });
});
void test('registration uses lifecycle abort signal and reports synchronous failure', () => {
  const { actions } = fixture();
  const registrations: { name: string; signal: AbortSignal | undefined }[] = [];
  const context: ModelContext = {
    registerTool: (tool, options) => {
      registrations.push({ name: tool.name, signal: options?.signal });
    },
  };
  const cleanup = registerGameTools(actions, () => {}, context);
  assert.equal(registrations.length, 5);
  assert.ok(registrations.every((x) => !x.signal?.aborted));
  cleanup();
  assert.ok(registrations.every((x) => x.signal?.aborted));
  const errors: string[] = [];
  registerGameTools(actions, (message) => errors.push(message), {
    registerTool: () => {
      throw Error('registry unavailable');
    },
  });
  assert.equal(errors.length, 5);
});
