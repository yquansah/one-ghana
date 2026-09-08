import test from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest } from '../../cloud/router';
import type { SaaSEnv } from '../../cloud/env';
const env = {
  ENVIRONMENT: 'test', APP_ORIGIN: 'https://game.example',
  WORKOS_API_KEY: 'test-only', WORKOS_CLIENT_ID: 'test-only',
  SESSION_ENCRYPTION_KEY: 'test-only-session-key-at-least-32-characters',
  UNSUBSCRIBE_SECRET: 'test-only-unsubscribe-key', RESEND_WEBHOOK_SECRET: 'whsec_dGVzdA==',
  DB: { prepare() { throw new Error('The account database is unavailable'); } },
} as unknown as SaaSEnv;

void test('public email routes do not depend on account session lookup', async () => {
  const headers = { Cookie: '__Host-one-ghana-session=stale-session' };
  const unsubscribe = await handleRequest(new Request('https://game.example/api/email/unsubscribe?account=x&token=invalid', { headers }), env);
  assert.equal(unsubscribe.status, 400);
  assert.deepEqual(await unsubscribe.json(), { error: 'Invalid link' });
  const webhook = await handleRequest(new Request('https://game.example/api/email/webhook', { method: 'POST', headers, body: '{}' }), env);
  assert.equal(webhook.status, 401);
  assert.deepEqual(await webhook.json(), { error: 'Invalid signature' });
});

void test('router protects campaigns, caps bodies and renders safe authentication errors', async () => {
  const privateResponse = await handleRequest(new Request('https://game.example/api/campaigns'), env);
  assert.equal(privateResponse.status, 401);
  assert.equal(privateResponse.headers.get('Cache-Control'), 'no-store');
  const oversized = await handleRequest(new Request('https://game.example/api/campaigns', { method: 'POST', body: 'x'.repeat(3_000_001) }), env);
  assert.equal(oversized.status, 413);
  const login = await handleRequest(new Request('https://game.example/auth/login'), { ...env, WORKOS_API_KEY: undefined });
  assert.equal(login.status, 503);
  assert.match(login.headers.get('Content-Type') ?? '', /text\/html/);
  assert.match(await login.text(), /Google sign-in is not configured/);
});
