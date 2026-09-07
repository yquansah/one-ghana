import type { PolicyProposal } from '../engine';

export type GameToolActions = {
  read: () => unknown;
  preview: (proposal: PolicyProposal) => Promise<unknown>;
  submit: (proposal: PolicyProposal) => Promise<unknown>;
  advance: () => Promise<unknown>;
  compare: (proposals: PolicyProposal[]) => Promise<unknown>;
};

type Tool = {
  name: string;
  title: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown) => unknown;
};
export type ModelContext = {
  registerTool: (
    tool: Tool,
    options?: { signal?: AbortSignal },
  ) => void | Promise<void>;
};
const proposalSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    policyId: { type: 'string' },
    scale: { type: 'number', minimum: 0.25, maximum: 2 },
    funding: { type: 'string', enum: ['reallocation', 'tax', 'borrowing'] },
    beneficiaries: {
      type: 'string',
      enum: ['national', 'rural', 'vulnerable'],
    },
    safeguard: {
      type: 'string',
      enum: ['standard', 'transparent', 'community'],
    },
    implementation: {
      type: 'string',
      enum: ['agency', 'district', 'partnership'],
    },
  },
  required: ['policyId', 'scale', 'funding', 'beneficiaries', 'safeguard'],
};
function object(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Expected an object.');
  return input as Record<string, unknown>;
}
function proposal(input: unknown): PolicyProposal {
  const v = object(input);
  if (
    Object.keys(v).some(
      (k) =>
        ![
          'policyId',
          'scale',
          'funding',
          'beneficiaries',
          'safeguard',
          'implementation',
        ].includes(k),
    )
  )
    throw new Error('Unknown proposal field.');
  if (
    typeof v.policyId !== 'string' ||
    !v.policyId ||
    typeof v.scale !== 'number' ||
    !Number.isFinite(v.scale) ||
    v.scale < 0.25 ||
    v.scale > 2
  )
    throw new Error('Choose a policy and scale between 0.25 and 2.');
  if (
    !['reallocation', 'tax', 'borrowing'].includes(v.funding as string) ||
    !['national', 'rural', 'vulnerable'].includes(v.beneficiaries as string) ||
    !['standard', 'transparent', 'community'].includes(v.safeguard as string)
  )
    throw new Error('Invalid funding, beneficiaries, or safeguard.');
  if (
    v.implementation !== undefined &&
    !['agency', 'district', 'partnership'].includes(v.implementation as string)
  )
    throw new Error('Invalid implementation arrangement.');
  return v as unknown as PolicyProposal;
}
function empty(input: unknown) {
  if (Object.keys(object(input)).length)
    throw new Error('This action takes no parameters.');
}
export function gameTools(actions: GameToolActions): Tool[] {
  const tool = (
    name: string,
    title: string,
    description: string,
    inputSchema: object,
    readOnlyHint: boolean,
    execute: Tool['execute'],
  ): Tool => ({
    name,
    title,
    description,
    inputSchema,
    annotations: { readOnlyHint, untrustedContentHint: false },
    execute,
  });
  const noArgs = {
    type: 'object',
    properties: {},
    additionalProperties: false,
  };
  return [
    tool(
      'read_presidency',
      'Read presidency',
      'Read the current campaign, quarter, public finances, policy status and welfare.',
      noArgs,
      true,
      (input) => {
        empty(input);
        return actions.read();
      },
    ),
    tool(
      'preview_policy',
      'Preview policy',
      'Estimate costs, legal route, constraints and illustrative model scenarios without changing the campaign.',
      proposalSchema,
      true,
      (input) => actions.preview(proposal(input)),
    ),
    tool(
      'submit_policy',
      'Submit policy',
      'Submit a funded policy for institutional approval, update the visible campaign and automatically save it.',
      proposalSchema,
      false,
      (input) => actions.submit(proposal(input)),
    ),
    tool(
      'advance_quarter',
      'Advance quarter',
      'Advance the campaign one quarter, applying implementation, economic shocks and any scheduled election. Updates and saves the visible campaign.',
      noArgs,
      false,
      (input) => {
        empty(input);
        return actions.advance();
      },
    ),
    tool(
      'compare_policies',
      'Compare policies',
      'Compare two to four policies over identical external shocks, without changing the live campaign.',
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          proposals: {
            type: 'array',
            items: proposalSchema,
            minItems: 2,
            maxItems: 4,
          },
        },
        required: ['proposals'],
      },
      true,
      (input) => {
        const v = object(input);
        if (
          Object.keys(v).some((k) => k !== 'proposals') ||
          !Array.isArray(v.proposals) ||
          v.proposals.length < 2 ||
          v.proposals.length > 4
        )
          throw new Error('Provide two to four proposals.');
        return actions.compare(v.proposals.map(proposal));
      },
    ),
  ];
}
export function registerGameTools(
  actions: GameToolActions,
  onError: (message: string) => void = () => {},
  context?: ModelContext,
): () => void {
  const registry =
    context ??
    (typeof document === 'undefined'
      ? undefined
      : (document as Document & { modelContext?: ModelContext }).modelContext);
  if (!registry?.registerTool) return () => {};
  const lifecycle = new AbortController();
  for (const tool of gameTools(actions)) {
    try {
      void Promise.resolve(
        registry.registerTool(tool, { signal: lifecycle.signal }),
      ).catch((error) =>
        onError(error instanceof Error ? error.message : String(error)),
      );
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  }
  return () => lifecycle.abort();
}
