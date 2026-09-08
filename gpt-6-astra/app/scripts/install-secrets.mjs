import { readFileSync, existsSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const environment = process.argv[2];
if (!['staging', 'production'].includes(environment)) throw new Error('Choose staging or production.');
const cwd = fileURLToPath(new URL('..', import.meta.url));
const path = environment === 'production' ? '../infra/.dev.vars.production' : '../infra/.dev.vars';
const values = parseEnv(readFileSync(new URL(path, import.meta.url), 'utf8'));
for (const key of ['WORKOS_API_KEY', 'WORKOS_CLIENT_ID', 'SESSION_ENCRYPTION_KEY', 'UNSUBSCRIBE_SECRET']) {
  if (!values[key]) throw new Error(`Missing ${key} in the ${environment} credentials file.`);
}
if (!values.WORKOS_API_KEY.startsWith('sk_')) throw new Error('A WorkOS secret API key is required.');
if (environment === 'production') {
  if (values.WORKOS_API_KEY.startsWith('sk_test_')) throw new Error('Production cannot use a staging WorkOS key.');
  const stagingPath = new URL('../infra/.dev.vars', import.meta.url);
  if (existsSync(stagingPath)) {
    const staging = parseEnv(readFileSync(stagingPath, 'utf8'));
    if (values.WORKOS_API_KEY === staging.WORKOS_API_KEY || values.WORKOS_CLIENT_ID === staging.WORKOS_CLIENT_ID) throw new Error('Production WorkOS credentials must be separate from staging.');
  }
}
const verification = await fetch('https://api.workos.com/user_management/redirect_uris?limit=1', { headers: { Authorization: `Bearer ${values.WORKOS_API_KEY}` }, signal: AbortSignal.timeout(20000) });
if (!verification.ok) throw new Error(`WorkOS credential verification failed: HTTP ${verification.status}.`);
for (const key of ['SESSION_ENCRYPTION_KEY', 'UNSUBSCRIBE_SECRET']) {
  if (values[key].length < 32) throw new Error(`${key} must contain at least 32 characters.`);
}
const keys = ['WORKOS_API_KEY', 'WORKOS_CLIENT_ID', 'SESSION_ENCRYPTION_KEY', 'ADMIN_EMAILS', 'OPENAI_API_KEY', 'RESEND_API_KEY', 'UNSUBSCRIBE_SECRET', 'RESEND_WEBHOOK_SECRET', 'EMAIL_FROM'];
const secrets = Object.fromEntries(keys.filter(key => values[key]).map(key => [key, values[key]]));
const result = spawnSync(process.execPath, ['scripts/cloudflare.mjs', 'secret', 'bulk', '--env', environment], {
  cwd, input: JSON.stringify(secrets), encoding: 'utf8', maxBuffer: 2_000_000,
});
if (result.status !== 0) {
  let message = (result.stderr ?? '') + (result.stdout ?? '');
  for (const value of Object.values(secrets)) message = message.replaceAll(value, '[REDACTED]');
  console.error(message);
  process.exit(result.status ?? 1);
}
console.log(`Installed ${Object.keys(secrets).length} managed secrets for ${environment}; no values displayed.`);
