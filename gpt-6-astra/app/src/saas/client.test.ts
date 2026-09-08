import test from 'node:test';
import assert from 'node:assert/strict';
import { api, ApiError } from './client';
import { gameTools } from '../integration/webmcp';
void test('cloud client sends same-origin credentials and session CSRF with exact request body', async (t) => {
  let seen: RequestInit | undefined;
  t.mock.method(
    globalThis,
    'fetch',
    async (_path: unknown, init: RequestInit) => {
      seen = init;
      return Response.json({ ok: true });
    },
  );
  const session = {
    user: {
      id: 'owner',
      email: 'owner@example.test',
      name: 'Owner',
      role: 'player' as const,
    },
    csrfToken: 'token',
  };
  await api('/api/campaigns/a/actions', session, {
    expectedRevision: 3,
    idempotencyKey: 'repeat',
    action: 'advance',
  });
  assert.equal(seen?.credentials, 'same-origin');
  assert.equal(seen?.method, 'POST');
  assert.equal(
    (seen!.headers as Record<string, string>)['X-One-Ghana-CSRF'],
    'token',
  );
  assert.deepEqual(JSON.parse(seen?.body as string), {
    expectedRevision: 3,
    idempotencyKey: 'repeat',
    action: 'advance',
  });
});
void test('cloud client distinguishes conflict, session expiration and offline failures', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async () =>
    Response.json(
      { error: 'Changed elsewhere', code: 'REVISION_CONFLICT' },
      { status: 409 },
    ),
  );
  await assert.rejects(
    api('/api/campaigns'),
    (e) =>
      e instanceof ApiError &&
      e.status === 409 &&
      e.code === 'REVISION_CONFLICT',
  );
  mock.mock.mockImplementation(async () =>
    Response.json({ error: 'Sign in' }, { status: 401 }),
  );
  await assert.rejects(
    api('/api/session'),
    (e) => e instanceof ApiError && e.status === 401,
  );
  mock.mock.mockImplementation(async () => {
    throw new TypeError('Failed to fetch');
  });
  await assert.rejects(
    api('/api/session'),
    (e) =>
      e instanceof ApiError &&
      e.status === 0 &&
      e.message.includes('draft is preserved'),
  );
});
void test('cloud WebMCP event actions validate versions and dispatch shared handlers once', async () => {
  let accepted = 0;
  const tools = gameTools({
    read: () => ({}),
    preview: async () => ({}),
    submit: async () => ({}),
    advance: async () => ({}),
    compare: async () => ({}),
    briefings: async () => [],
    previewEvent: async (id, version) => ({ id, version }),
    acceptEvent: async () => ++accepted,
  });
  const preview = tools.find((t) => t.name === 'preview_current_event')!,
    accept = tools.find((t) => t.name === 'accept_current_event')!;
  assert.equal(preview.annotations.readOnlyHint, true);
  assert.equal(accept.annotations.readOnlyHint, false);
  assert.throws(() => accept.execute({ eventId: 'news', eventVersion: '1' }));
  assert.throws(() =>
    accept.execute({ eventId: 'news', eventVersion: 1, applyNow: true }),
  );
  assert.equal(accepted, 0);
  assert.deepEqual(
    await preview.execute({ eventId: 'news', eventVersion: 1 }),
    { id: 'news', version: 1 },
  );
  await accept.execute({ eventId: 'news', eventVersion: 1 });
  assert.equal(accepted, 1);
});
