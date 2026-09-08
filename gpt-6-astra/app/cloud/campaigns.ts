import type { SaaSEnv } from './env';
import type { CampaignRecord, CampaignExport, Session } from './contracts';
import { HttpError, json, hash, requireMutation } from './auth';
import { createCampaign, branchCampaign, submitPolicy } from '../src/engine';
import {
  deserializeCampaign,
  serializeCampaign,
} from '../src/engine/validation';
import type { PolicyProposal, TurnReport } from '../src/engine';
import {
  acceptCampaignEvent,
  advanceCampaign,
  validateCampaignEvents,
} from '../src/saas/events';
import { getPublishedEvent } from './research';
const MAX_BODY = 3_000_000;
export async function readBody(
  request: Request,
): Promise<Record<string, unknown>> {
  if (!request.headers.get('Content-Type')?.startsWith('application/json'))
    throw new HttpError(415, 'Use application/json.');
  if (Number(request.headers.get('Content-Length')) > MAX_BODY)
    throw new HttpError(413, 'Campaign request is too large.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'Missing request body.');
  let size = 0;
  const parts: Uint8Array[] = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY) {
        await reader.cancel();
        throw new HttpError(413, 'Campaign request is too large.');
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new HttpError(400, 'Invalid JSON.');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new HttpError(400, 'Expected a JSON object.');
  return value as Record<string, unknown>;
}
function fields(body: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(body).some((k) => !allowed.includes(k)))
    throw new HttpError(400, 'Unknown request field.');
}
function name(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !value.trim() || value.length > 80)
    throw new HttpError(400, 'Campaign name must contain 1–80 characters.');
  return value.trim();
}
function operationKey(value: unknown): string {
  if (typeof value !== 'string' || !/^[-a-zA-Z0-9_]{8,100}$/.test(value))
    throw new HttpError(
      400,
      'Provide a unique idempotency key (8–100 letters, digits, hyphens or underscores).',
    );
  return value;
}
function revision(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1)
    throw new HttpError(400, 'Provide the expected campaign revision.');
  return value;
}
interface OperationRow {
  request_hash: string;
  response_json: string;
}
async function replay(
  env: SaaSEnv,
  accountId: string,
  key: string,
  requestHash: string,
): Promise<Response | null> {
  const row = await env.DB.prepare(
    'SELECT request_hash,response_json FROM campaign_operations WHERE account_id=? AND operation_key=?',
  )
    .bind(accountId, key)
    .first<OperationRow>();
  if (!row) return null;
  if (row.request_hash !== requestHash)
    throw new HttpError(
      409,
      'This idempotency key was already used for a different request.',
      'IDEMPOTENCY_CONFLICT',
    );
  return new Response(row.response_json, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
async function owned(
  env: SaaSEnv,
  accountId: string,
  id: string,
): Promise<CampaignRecord> {
  const row = await env.DB.prepare(
    'SELECT record_json FROM campaigns WHERE id=? AND account_id=?',
  )
    .bind(id, accountId)
    .first<{ record_json: string }>();
  if (!row) throw new HttpError(404, 'Campaign not found.');
  return JSON.parse(row.record_json) as CampaignRecord;
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object')
    return (
      '{' +
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => JSON.stringify(k) + ':' + canonical(v))
        .join(',') +
      '}'
    );
  return JSON.stringify(value);
}
export async function importCampaign(
  input: string,
  env: SaaSEnv,
): Promise<Pick<CampaignRecord, 'state' | 'eventMode' | 'events'>> {
  if (input.length > 2_500_000)
    throw new HttpError(413, 'Save file is too large.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    throw new HttpError(400, 'Invalid save JSON.');
  }
  if (
    parsed &&
    typeof parsed === 'object' &&
    !Array.isArray(parsed) &&
    'format' in parsed
  ) {
    const e = parsed as Record<string, unknown>;
    fields(e, ['format', 'version', 'state', 'eventMode', 'events']);
    if (
      e.format !== 'one-ghana-cloud' ||
      e.version !== 1 ||
      !['classic', 'live'].includes(e.eventMode as string)
    )
      throw new HttpError(400, 'Unsupported cloud save format.');
    const state = deserializeCampaign(JSON.stringify(e.state)),
      eventMode = e.eventMode as 'classic' | 'live',
      events = validateCampaignEvents(state, e.events, eventMode);
    for (const item of events) {
      const approved = await getPublishedEvent(
        env,
        item.event.id,
        item.event.version,
      );
      if (
        !approved ||
        canonical({ ...approved, status: 'published' }) !==
          canonical({ ...item.event, status: 'published' })
      )
        throw new HttpError(
          400,
          'This save contains an unknown or modified event version. Preserve the original export and contact the administrator.',
        );
    }
    return { state, eventMode, events };
  }
  return {
    state: deserializeCampaign(input),
    eventMode: 'classic',
    events: [],
  };
}
async function campaignRoute(
  request: Request,
  env: SaaSEnv,
  session: Session,
): Promise<Response | null> {
  const url = new URL(request.url),
    match =
      /^\/api\/campaigns(?:\/([a-zA-Z0-9-]+)(?:\/(actions|export))?)?$/.exec(
        url.pathname,
      );
  if (!match) return null;
  const [, id, suffix] = match,
    owner = session.user.id;
  if (request.method === 'GET') {
    if (!id) {
      const rows = await env.DB.prepare(
        'SELECT record_json FROM campaigns WHERE account_id=? ORDER BY updated_at DESC LIMIT 100',
      )
        .bind(owner)
        .all<{ record_json: string }>();
      return json({
        campaigns: rows.results.map((r) => JSON.parse(r.record_json)),
      });
    }
    const campaign = await owned(env, owner, id);
    if (suffix === 'export') {
      const value: CampaignExport = {
        format: 'one-ghana-cloud',
        version: 1,
        state: campaign.state,
        eventMode: campaign.eventMode,
        events: campaign.events,
      };
      return new Response(JSON.stringify(value, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="one-ghana-${id}.json"`,
          'Cache-Control': 'no-store',
        },
      });
    }
    if (!suffix) return json({ campaign });
    return null;
  }
  if (!['POST', 'DELETE'].includes(request.method))
    throw new HttpError(405, 'Method not allowed.');
  requireMutation(request, env, session);
  const body = await readBody(request),
    key = operationKey(body.idempotencyKey),
    requestHash = await hash(request.method + url.pathname + canonical(body));
  const previous = await replay(env, owner, key, requestHash);
  if (previous) return previous;
  const now = new Date().toISOString();
  let campaign: CampaignRecord;
  let mutation: D1PreparedStatement;
  let report: TurnReport | undefined;
  let response: unknown;
  if (!id && request.method === 'POST') {
    fields(body, ['name', 'seed', 'importJson', 'idempotencyKey']);
    if (
      body.importJson !== undefined &&
      (typeof body.importJson !== 'string' ||
        body.seed !== undefined ||
        body.name !== undefined)
    )
      throw new HttpError(
        400,
        'Import a save separately from new campaign options.',
      );
    if (
      body.seed !== undefined &&
      (typeof body.seed !== 'number' ||
        !Number.isInteger(body.seed) ||
        body.seed < 0 ||
        body.seed > 4294967295)
    )
      throw new HttpError(400, 'Invalid seed.');
    const data =
      typeof body.importJson === 'string'
        ? await importCampaign(body.importJson, env)
        : {
            state: createCampaign({
              name: name(body.name),
              seed: body.seed as number | undefined,
            }),
            eventMode: 'classic' as const,
            events: [],
          };
    campaign = {
      ...data,
      id: crypto.randomUUID(),
      revision: 1,
      createdAt: now,
      updatedAt: now,
    };
    mutation = env.DB.prepare(
      'INSERT INTO campaigns(id,account_id,revision,record_json,updated_at) SELECT ?,?,?,?,? WHERE (SELECT count(*) FROM campaigns WHERE account_id=?)<100',
    ).bind(campaign.id, owner, 1, JSON.stringify(campaign), now, owner);
    response = { campaign };
  } else if (id) {
    campaign = await owned(env, owner, id);
    const expected = revision(body.expectedRevision);
    if (campaign.revision !== expected)
      throw new HttpError(
        409,
        'This campaign changed on another device. Reload before retrying.',
        'REVISION_CONFLICT',
      );
    if (request.method === 'DELETE' && !suffix) {
      fields(body, ['expectedRevision', 'idempotencyKey']);
      mutation = env.DB.prepare(
        'DELETE FROM campaigns WHERE id=? AND account_id=? AND revision=?',
      ).bind(id, owner, expected);
      response = { ok: true };
    } else if (request.method === 'POST' && suffix === 'actions') {
      const action = body.action;
      const actionFields: Record<string, string[]> = {
        submit: ['proposal'],
        advance: [],
        branch: ['name'],
        upgrade: ['name'],
        'accept-event': ['eventId', 'eventVersion'],
      };
      if (typeof action !== 'string' || !Object.hasOwn(actionFields, action))
        throw new HttpError(400, 'Unknown campaign action.');
      fields(body, [
        'expectedRevision',
        'idempotencyKey',
        'action',
        ...actionFields[action],
      ]);
      if (action === 'submit') {
        if (
          !body.proposal ||
          typeof body.proposal !== 'object' ||
          Array.isArray(body.proposal)
        )
          throw new HttpError(400, 'A policy proposal is required.');
        fields(body.proposal as Record<string, unknown>, [
          'policyId',
          'scale',
          'funding',
          'beneficiaries',
          'safeguard',
          'implementation',
        ]);
        campaign.state = submitPolicy(
          campaign.state,
          body.proposal as PolicyProposal,
        );
      }
      if (action === 'advance') {
        const result = advanceCampaign(campaign);
        campaign.state = result.state;
        campaign.events = result.events;
        report = result.report;
      }
      if (action === 'accept-event') {
        if (
          typeof body.eventId !== 'string' ||
          !Number.isSafeInteger(body.eventVersion) ||
          Number(body.eventVersion) < 1
        )
          throw new HttpError(400, 'An event ID and version are required.');
        const event = await getPublishedEvent(
          env,
          body.eventId,
          body.eventVersion as number,
        );
        if (!event) throw new HttpError(404, 'Event not found.');
        campaign = acceptCampaignEvent(campaign, event, now);
      }
      campaign.updatedAt = now;
      if (action === 'branch' || action === 'upgrade') {
        if (action === 'upgrade' && campaign.eventMode === 'live')
          throw new HttpError(
            400,
            'This campaign already supports live events.',
          );
        campaign = {
          ...campaign,
          id: crypto.randomUUID(),
          revision: 1,
          state: branchCampaign(campaign.state, name(body.name)),
          eventMode: action === 'upgrade' ? 'live' : campaign.eventMode,
          createdAt: now,
        };
        mutation = env.DB.prepare(
          'INSERT INTO campaigns(id,account_id,revision,record_json,updated_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM campaigns WHERE id=? AND account_id=? AND revision=?) AND (SELECT count(*) FROM campaigns WHERE account_id=?)<100',
        ).bind(
          campaign.id,
          owner,
          1,
          JSON.stringify(campaign),
          now,
          id,
          owner,
          expected,
          owner,
        );
      } else {
        campaign.revision = expected + 1;
        mutation = env.DB.prepare(
          'UPDATE campaigns SET revision=?,record_json=?,updated_at=? WHERE id=? AND account_id=? AND revision=?',
        ).bind(
          campaign.revision,
          JSON.stringify(campaign),
          now,
          id,
          owner,
          expected,
        );
      }
      serializeCampaign(campaign.state);
      validateCampaignEvents(
        campaign.state,
        campaign.events,
        campaign.eventMode,
      );
      response = { campaign, ...(report ? { report } : {}) };
    } else throw new HttpError(405, 'Method not allowed.');
  } else throw new HttpError(405, 'Method not allowed.');
  // D1 batch is transactional. A duplicate operation rolls back its preceding mutation.
  const operation = env.DB.prepare(
    'INSERT INTO campaign_operations(account_id,operation_key,request_hash,response_json,created_at) SELECT ?,?,?,?,? WHERE changes()=1',
  ).bind(owner, key, requestHash, JSON.stringify(response), now);
  try {
    const result = await env.DB.batch([mutation, operation]);
    if (!result[0].meta.changes)
      throw new HttpError(
        409,
        'Campaign changed or the account reached its 100-campaign limit. Reload and retry.',
        'REVISION_CONFLICT',
      );
  } catch (error) {
    const completed = await replay(env, owner, key, requestHash);
    if (completed) return completed;
    throw error;
  }
  return json(response);
}

export async function handleCampaigns(
  request: Request,
  env: SaaSEnv,
  session: Session,
): Promise<Response | null> {
  try {
    return await campaignRoute(request, env, session);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (
      error instanceof Error &&
      !/D1_|SQLITE|database|fetch failed/i.test(error.message)
    )
      throw new HttpError(400, error.message, 'INVALID_CAMPAIGN');
    throw error;
  }
}
