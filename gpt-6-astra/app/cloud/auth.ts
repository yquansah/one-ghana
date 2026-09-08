import type { SaaSEnv } from './env';
import type { Account, Session } from './contracts';
const SESSION_COOKIE = '__Host-one-ghana-session';
const STATE_COOKIE = '__Host-one-ghana-oauth';
const encoder = new TextEncoder();
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}
export function json(value: unknown, status = 200): Response {
  return Response.json(value, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}
export function randomToken(): string {
  return base64(crypto.getRandomValues(new Uint8Array(32)));
}
function base64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}
function unbase64(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(
    atob(value.replaceAll('-', '+').replaceAll('_', '/')),
    (c) => c.charCodeAt(0),
  );
}
export async function hash(value: string): Promise<string> {
  return base64(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', encoder.encode(value)),
    ),
  );
}
async function key(env: SaaSEnv) {
  if (!env.SESSION_ENCRYPTION_KEY || env.SESSION_ENCRYPTION_KEY.length < 32)
    throw new HttpError(503, 'Authentication is not configured.');
  return crypto.subtle.importKey(
    'raw',
    await crypto.subtle.digest(
      'SHA-256',
      encoder.encode(env.SESSION_ENCRYPTION_KEY),
    ),
    'AES-GCM',
    false,
    ['encrypt', 'decrypt'],
  );
}
export async function seal(value: string, env: SaaSEnv): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return `${base64(iv)}.${base64(new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(env), encoder.encode(value))))}`;
}
export async function unseal(value: string, env: SaaSEnv): Promise<string> {
  const [iv, data] = value.split('.');
  return new TextDecoder().decode(
    await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: unbase64(iv) },
      await key(env),
      unbase64(data),
    ),
  );
}
function cookie(request: Request, name: string): string | null {
  return (
    request.headers
      .get('Cookie')
      ?.split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith(name + '='))
      ?.slice(name.length + 1) ?? null
  );
}
function setCookie(name: string, value: string, age: number) {
  return `${name}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${age}`;
}
function configured(env: SaaSEnv) {
  try {
    const origin = new URL(env.APP_ORIGIN);
    return (
      origin.origin === env.APP_ORIGIN &&
      (origin.protocol === 'https:' || env.ENVIRONMENT === 'test') &&
      !!(
        env.WORKOS_API_KEY &&
        env.WORKOS_CLIENT_ID &&
        env.SESSION_ENCRYPTION_KEY &&
        env.SESSION_ENCRYPTION_KEY.length >= 32
      )
    );
  } catch {
    return false;
  }
}
function requireConfig(env: SaaSEnv) {
  if (!configured(env))
    throw new HttpError(503, 'Google sign-in is not configured.');
  if (
    new URL(env.APP_ORIGIN).protocol !== 'https:' &&
    env.ENVIRONMENT !== 'test'
  )
    throw new HttpError(
      503,
      'Authentication requires an HTTPS application origin.',
    );
}
interface ProviderAuth {
  user: {
    id: string;
    email: string;
    email_verified: boolean;
    first_name?: string;
    last_name?: string;
  };
  access_token: string;
  refresh_token: string;
}
async function authenticate(
  env: SaaSEnv,
  body: Record<string, string>,
): Promise<ProviderAuth> {
  const response = await fetch(
    'https://api.workos.com/user_management/authenticate',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: env.WORKOS_CLIENT_ID,
        client_secret: env.WORKOS_API_KEY,
        ...body,
      }),
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!response.ok)
    throw new HttpError(
      response.status >= 500 ? 503 : 401,
      'Google session could not be verified. Please sign in again.',
    );
  const data = (await response.json()) as ProviderAuth;
  if (
    !data.user?.id ||
    !data.user.email ||
    data.user.email_verified !== true ||
    !data.access_token ||
    !data.refresh_token
  )
    throw new HttpError(401, 'A verified Google account is required.');
  return data;
}
// Tokens are received only over the authenticated WorkOS backchannel, never from browser input.
function tokenMetadata(token: string) {
  const claims = JSON.parse(
    new TextDecoder().decode(unbase64(token.split('.')[1])),
  ) as { exp: number; sid: string };
  if (
    !Number.isFinite(claims.exp) ||
    claims.exp * 1000 <= Date.now() ||
    typeof claims.sid !== 'string' ||
    !claims.sid
  )
    throw new HttpError(401, 'Invalid identity session.');
  return {
    refreshAt: Math.min(claims.exp * 1000 - 30000, Date.now() + 240000),
    sessionId: claims.sid,
  };
}
interface SessionRow {
  token_hash: string;
  account_id: string;
  csrf_token: string;
  refresh_cipher: string;
  provider_session_id: string;
  refresh_at: number;
  expires_at: number;
  refresh_lock: number;
  id: string;
  email: string;
  name: string;
  role: Account['role'];
  workos_id: string;
}
export async function getSession(
  request: Request,
  env: SaaSEnv,
): Promise<Session | null> {
  const token = cookie(request, SESSION_COOKIE);
  if (!token || !configured(env)) return null;
  const tokenHash = await hash(token);
  const row = await env.DB.prepare(
    'SELECT s.*,a.id,a.email,a.name,a.role,a.workos_id FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>?',
  )
    .bind(tokenHash, Date.now())
    .first<SessionRow>();
  if (!row) return null;
  if (row.refresh_at <= Date.now()) {
    const lock = await env.DB.prepare(
      'UPDATE sessions SET refresh_lock=? WHERE token_hash=? AND refresh_lock<? AND refresh_cipher=? AND refresh_at<=?',
    )
      .bind(
        Date.now() + 20000,
        tokenHash,
        Date.now(),
        row.refresh_cipher,
        Date.now(),
      )
      .run();
    if (!lock.meta.changes)
      throw new HttpError(
        409,
        'Session refresh in progress. Retry this request.',
        'SESSION_REFRESH',
      );
    try {
      const data = await authenticate(env, {
        grant_type: 'refresh_token',
        refresh_token: await unseal(row.refresh_cipher, env),
      });
      if (data.user.id !== row.workos_id)
        throw new HttpError(401, 'Session identity mismatch.');
      const meta = tokenMetadata(data.access_token);
      await env.DB.prepare(
        'UPDATE sessions SET refresh_cipher=?,refresh_at=?,provider_session_id=?,refresh_lock=0 WHERE token_hash=?',
      )
        .bind(
          await seal(data.refresh_token, env),
          meta.refreshAt,
          meta.sessionId,
          tokenHash,
        )
        .run();
    } catch (error) {
      if (error instanceof HttpError && error.status === 401)
        await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?')
          .bind(tokenHash)
          .run();
      else
        await env.DB.prepare(
          'UPDATE sessions SET refresh_lock=0 WHERE token_hash=?',
        )
          .bind(tokenHash)
          .run();
      throw error;
    }
  }
  return {
    user: { id: row.id, email: row.email, name: row.name, role: row.role },
    csrfToken: row.csrf_token,
  };
}
export function requireMutation(
  request: Request,
  env: SaaSEnv,
  session: Session,
): void {
  if (
    request.headers.get('Origin') !== env.APP_ORIGIN ||
    request.headers.get('X-One-Ghana-CSRF') !== session.csrfToken
  )
    throw new HttpError(
      403,
      'This request failed the session security check.',
      'CSRF',
    );
}
export async function handleAuth(
  request: Request,
  env: SaaSEnv,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname === '/api/session' && request.method === 'GET') {
    const session = await getSession(request, env);
    return json({
      ...session,
      user: session?.user ?? null,
      configured: configured(env),
    });
  }
  if (url.pathname === '/auth/login' && request.method === 'GET') {
    requireConfig(env);
    const state = randomToken(),
      verifier = randomToken();
    await env.DB.prepare(
      'INSERT INTO oauth_states(state_hash,verifier_cipher,expires_at) VALUES(?,?,?)',
    )
      .bind(await hash(state), await seal(verifier, env), Date.now() + 600000)
      .run();
    const target = new URL('https://api.workos.com/user_management/authorize');
    target.search = new URLSearchParams({
      client_id: env.WORKOS_CLIENT_ID!,
      response_type: 'code',
      provider: 'GoogleOAuth',
      redirect_uri: env.APP_ORIGIN + '/auth/callback',
      state,
      code_challenge: await hash(verifier),
      code_challenge_method: 'S256',
    }).toString();
    return new Response(null, {
      status: 302,
      headers: {
        Location: target.href,
        'Set-Cookie': setCookie(STATE_COOKIE, state, 600),
        'Cache-Control': 'no-store',
      },
    });
  }
  if (url.pathname === '/auth/callback' && request.method === 'GET') {
    requireConfig(env);
    const state = url.searchParams.get('state'),
      code = url.searchParams.get('code');
    if (
      !state ||
      !code ||
      code.length > 4096 ||
      state !== cookie(request, STATE_COOKIE)
    )
      throw new HttpError(
        400,
        'The sign-in request expired or failed its security check.',
      );
    const pending = await env.DB.prepare(
      'DELETE FROM oauth_states WHERE state_hash=? AND expires_at>? RETURNING verifier_cipher',
    )
      .bind(await hash(state), Date.now())
      .first<{ verifier_cipher: string }>();
    if (!pending)
      throw new HttpError(
        400,
        'The sign-in request has expired or was already used.',
      );
    const data = await authenticate(env, {
        grant_type: 'authorization_code',
        code,
        code_verifier: await unseal(pending.verifier_cipher, env),
      }),
      meta = tokenMetadata(data.access_token);
    const role = (env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .includes(data.user.email.toLowerCase())
      ? 'admin'
      : 'player';
    const account = await env.DB.prepare(
      'INSERT INTO accounts(id,workos_id,email,name,role,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(workos_id) DO UPDATE SET email=excluded.email,name=excluded.name,role=excluded.role RETURNING id',
    )
      .bind(
        crypto.randomUUID(),
        data.user.id,
        data.user.email,
        [data.user.first_name, data.user.last_name].filter(Boolean).join(' ') ||
          data.user.email,
        role,
        new Date().toISOString(),
      )
      .first<{ id: string }>();
    const token = randomToken();
    await env.DB.prepare(
      'INSERT INTO sessions(token_hash,account_id,csrf_token,refresh_cipher,provider_session_id,refresh_at,expires_at) VALUES(?,?,?,?,?,?,?)',
    )
      .bind(
        await hash(token),
        account!.id,
        randomToken(),
        await seal(data.refresh_token, env),
        meta.sessionId,
        meta.refreshAt,
        Date.now() + 7 * 86400000,
      )
      .run();
    const headers = new Headers({
      Location: env.APP_ORIGIN + '/',
      'Cache-Control': 'no-store',
    });
    headers.append('Set-Cookie', setCookie(SESSION_COOKIE, token, 7 * 86400));
    headers.append('Set-Cookie', setCookie(STATE_COOKIE, '', 0));
    return new Response(null, { status: 302, headers });
  }
  if (url.pathname === '/auth/logout' && request.method === 'POST') {
    const session = await getSession(request, env);
    if (!session) throw new HttpError(401, 'Sign in first.');
    requireMutation(request, env, session);
    const tokenHash = await hash(cookie(request, SESSION_COOKIE)!);
    const revoked = await env.DB.prepare(
      'DELETE FROM sessions WHERE token_hash=? RETURNING provider_session_id',
    )
      .bind(tokenHash)
      .first<{ provider_session_id: string }>();
    let providerRevoked = false;
    if (revoked) {
      try {
        const response = await fetch(
          'https://api.workos.com/user_management/sessions/revoke',
          {
            method: 'POST',
            headers: {
              Authorization: 'Bearer ' + env.WORKOS_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ session_id: revoked.provider_session_id }),
            signal: AbortSignal.timeout(10000),
          },
        );
        providerRevoked = response.ok;
      } catch {
        /* Local logout remains effective even during an identity-provider outage. */
      }
    }
    return new Response(JSON.stringify({ ok: true, providerRevoked }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Set-Cookie': setCookie(SESSION_COOKIE, '', 0),
      },
    });
  }
  return null;
}
