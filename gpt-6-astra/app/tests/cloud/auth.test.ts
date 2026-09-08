import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestDB } from './sqlite';
import {
  getSession,
  handleAuth,
  requireMutation,
  seal,
  unseal,
  hash,
  HttpError,
} from '../../cloud/auth';
import type { SaaSEnv } from '../../cloud/env';
const origin = 'https://ghana.example';
function setup() {
  const database = createTestDB(['0001_accounts_campaigns.sql']);
  const env = {
    DB: database.db,
    APP_ORIGIN: origin,
    ENVIRONMENT: 'test',
    WORKOS_API_KEY: 'test-api',
    WORKOS_CLIENT_ID: 'test-client',
    SESSION_ENCRYPTION_KEY: 'x'.repeat(40),
    ADMIN_EMAILS: 'admin@example.com',
  } as SaaSEnv;
  return { ...database, env };
}
function token(exp = Date.now() / 1000 + 3600) {
  return (
    'header.' +
    btoa(JSON.stringify({ exp, sid: 'session_test' })) +
    '.signature'
  );
}
void test('Google login binds one-time state and PKCE; callback stores encrypted refresh and opaque cookie; logout revokes', async () => {
  const db = setup(),
    original = globalThis.fetch;
  const calls: { url: string; body: Record<string, string> }[] = [];
  globalThis.fetch = async (input, init) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    assert.equal(typeof init?.body, 'string');
    calls.push({ url, body: JSON.parse(init!.body as string) });
    return Response.json(
      url.endsWith('/revoke')
        ? {}
        : {
            user: {
              id: 'workos-a',
              email: 'admin@example.com',
              email_verified: true,
              first_name: 'Admin',
            },
            access_token: token(),
            refresh_token: 'private-refresh',
          },
    );
  };
  try {
    const login = (await handleAuth(
      new Request(origin + '/auth/login'),
      db.env,
    ))!;
    assert.equal(login.status, 302);
    const location = new URL(login.headers.get('Location')!);
    assert.equal(location.searchParams.get('provider'), 'GoogleOAuth');
    assert.equal(location.searchParams.get('code_challenge_method'), 'S256');
    const state = location.searchParams.get('state')!;
    const cookie = '__Host-one-ghana-oauth=' + state;
    await assert.rejects(
      handleAuth(
        new Request(origin + '/auth/callback?code=code&state=wrong', {
          headers: { Cookie: cookie },
        }),
        db.env,
      ),
      /security check/,
    );
    const callback = (await handleAuth(
      new Request(origin + '/auth/callback?code=code&state=' + state, {
        headers: { Cookie: cookie },
      }),
      db.env,
    ))!;
    assert.equal(callback.status, 302);
    assert.equal(
      await hash(calls[0].body.code_verifier),
      location.searchParams.get('code_challenge'),
    );
    const sessionCookie = callback.headers
      .getSetCookie()
      .find((c) => c.startsWith('__Host-one-ghana-session='))!;
    assert.match(sessionCookie, /Secure; HttpOnly; SameSite=Lax/);
    assert.ok(!sessionCookie.includes('private-refresh'));
    const stored = db.sqlite.prepare('SELECT * FROM sessions').get()!;
    assert.notEqual(stored.refresh_cipher, 'private-refresh');
    assert.equal(
      await unseal(String(stored.refresh_cipher), db.env),
      'private-refresh',
    );
    const headers = { Cookie: sessionCookie.split(';')[0] };
    const session = await getSession(
      new Request(origin + '/api/session', { headers }),
      db.env,
    );
    assert.equal(session?.user.role, 'admin');
    assert.notEqual(session?.user.id, 'workos-a');
    await assert.rejects(
      handleAuth(
        new Request(origin + '/auth/callback?code=code&state=' + state, {
          headers: { Cookie: cookie },
        }),
        db.env,
      ),
      /already used/,
    );
    const logout = (await handleAuth(
      new Request(origin + '/auth/logout', {
        method: 'POST',
        headers: {
          ...headers,
          Origin: origin,
          'X-One-Ghana-CSRF': session!.csrfToken,
        },
      }),
      db.env,
    ))!;
    assert.deepEqual(await logout.json(), { ok: true, providerRevoked: true });
    assert.equal(
      await getSession(
        new Request(origin + '/api/session', { headers }),
        db.env,
      ),
      null,
    );
    assert.equal(calls.at(-1)?.body.session_id, 'session_test');
  } finally {
    globalThis.fetch = original;
    db.close();
  }
});
void test('CSRF requires exact origin and session token; malformed configuration never advertises sign-in', async () => {
  const db = setup();
  try {
    const session = {
      user: { id: 'a', email: 'a', name: 'a', role: 'player' as const },
      csrfToken: 'correct',
    };
    for (const headers of [
      { Origin: origin },
      { Origin: 'https://evil.example', 'X-One-Ghana-CSRF': 'correct' },
      { Origin: origin, 'X-One-Ghana-CSRF': 'wrong' },
    ] as Record<string, string>[])
      assert.throws(
        () =>
          requireMutation(
            new Request(origin, { method: 'POST', headers }),
            db.env,
            session,
          ),
        HttpError,
      );
    requireMutation(
      new Request(origin, {
        method: 'POST',
        headers: { Origin: origin, 'X-One-Ghana-CSRF': 'correct' },
      }),
      db.env,
      session,
    );
    db.env.APP_ORIGIN = origin + '/path';
    const response = (await handleAuth(
      new Request(origin + '/api/session'),
      db.env,
    ))!;
    assert.equal(
      ((await response.json()) as { configured: boolean }).configured,
      false,
    );
  } finally {
    db.close();
  }
});
void test('AES session data rejects tampering and rotated encryption key', async () => {
  const db = setup();
  try {
    const sealed = await seal('refresh', db.env);
    assert.equal(await unseal(sealed, db.env), 'refresh');
    await assert.rejects(unseal(sealed.slice(0, -3) + 'AAA', db.env));
    await assert.rejects(
      unseal(sealed, {
        ...db.env,
        SESSION_ENCRYPTION_KEY: 'different'.repeat(8),
      }),
    );
  } finally {
    db.close();
  }
});
void test('expired sessions are rejected and refresh identity cannot switch accounts', async () => {
  const db = setup(),
    original = globalThis.fetch;
  try {
    db.sqlite
      .prepare('INSERT INTO accounts VALUES(?,?,?,?,?,?)')
      .run('a', 'workos-a', 'a@example.com', 'A', 'player', 'now');
    db.sqlite
      .prepare('INSERT INTO sessions VALUES(?,?,?,?,?,?,?,?)')
      .run(
        await hash('opaque'),
        'a',
        'csrf',
        await seal('refresh', db.env),
        'session_test',
        0,
        Date.now() + 100000,
        0,
      );
    globalThis.fetch = async () =>
      Response.json({
        user: { id: 'workos-b', email: 'b@example.com', email_verified: true },
        access_token: token(),
        refresh_token: 'new',
      });
    const request = new Request(origin, {
      headers: { Cookie: '__Host-one-ghana-session=opaque' },
    });
    await assert.rejects(getSession(request, db.env), /identity mismatch/);
    assert.equal(await getSession(request, db.env), null);
  } finally {
    globalThis.fetch = original;
    db.close();
  }
});

void test('refresh rotates once under concurrent requests and rejects expired cookie sessions', async () => {
  const db = setup(),
    original = globalThis.fetch;
  let release!: () => void;
  let started!: () => void;
  const began = new Promise<void>((resolve) => {
      started = resolve;
    }),
    wait = new Promise<void>((resolve) => {
      release = resolve;
    });
  let count = 0;
  try {
    db.sqlite
      .prepare('INSERT INTO accounts VALUES(?,?,?,?,?,?)')
      .run('a', 'workos-a', 'a@example.com', 'A', 'player', 'now');
    db.sqlite
      .prepare('INSERT INTO sessions VALUES(?,?,?,?,?,?,?,?)')
      .run(
        await hash('opaque'),
        'a',
        'csrf',
        await seal('old-refresh', db.env),
        'session_test',
        0,
        Date.now() + 100000,
        0,
      );
    globalThis.fetch = async () => {
      count++;
      started();
      await wait;
      return Response.json({
        user: { id: 'workos-a', email: 'a@example.com', email_verified: true },
        access_token: token(),
        refresh_token: 'rotated-refresh',
      });
    };
    const request = new Request(origin, {
      headers: { Cookie: '__Host-one-ghana-session=opaque' },
    });
    const first = getSession(request, db.env);
    await began;
    await assert.rejects(getSession(request, db.env), /refresh in progress/);
    release();
    assert.equal((await first)?.user.id, 'a');
    assert.equal((await getSession(request, db.env))?.user.id, 'a');
    assert.equal(count, 1);
    assert.equal(
      await unseal(
        String(
          db.sqlite.prepare('SELECT refresh_cipher FROM sessions').get()!
            .refresh_cipher,
        ),
        db.env,
      ),
      'rotated-refresh',
    );
    db.sqlite.prepare('UPDATE sessions SET expires_at=0').run();
    assert.equal(await getSession(request, db.env), null);
  } finally {
    release?.();
    globalThis.fetch = original;
    db.close();
  }
});
void test('malformed or expired provider access tokens cannot establish a local session', async () => {
  for (const accessToken of ['not-a-jwt', token(1)]) {
    const db = setup(),
      original = globalThis.fetch;
    try {
      globalThis.fetch = async () =>
        Response.json({
          user: {
            id: 'workos-a',
            email: 'a@example.com',
            email_verified: true,
          },
          access_token: accessToken,
          refresh_token: 'refresh',
        });
      const login = (await handleAuth(
        new Request(origin + '/auth/login'),
        db.env,
      ))!;
      const state = new URL(login.headers.get('Location')!).searchParams.get(
        'state',
      )!;
      await assert.rejects(
        handleAuth(
          new Request(origin + '/auth/callback?code=test&state=' + state, {
            headers: { Cookie: '__Host-one-ghana-oauth=' + state },
          }),
          db.env,
        ),
      );
      assert.equal(
        db.sqlite.prepare('SELECT count(*) AS n FROM sessions').get()!.n,
        0,
      );
    } finally {
      globalThis.fetch = original;
      db.close();
    }
  }
});
