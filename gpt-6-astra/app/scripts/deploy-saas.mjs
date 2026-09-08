import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const app = fileURLToPath(new URL('..', import.meta.url));
const environment = process.argv[2];
if (!['staging', 'production'].includes(environment)) throw new Error('Choose staging or production.');
const config = JSON.parse(readFileSync(new URL('../infra/wrangler.jsonc', import.meta.url), 'utf8'));
const target = config.env[environment];
const origin = target.vars.APP_ORIGIN;
if (!origin || new URL(origin).protocol !== 'https:' || new URL(origin).origin !== origin) throw new Error('Set the canonical HTTPS APP_ORIGIN in infra/wrangler.jsonc before deploying.');
if (!target.d1_databases[0].database_id) throw new Error('Create the environment D1 database and record its database_id in infra/wrangler.jsonc.');
if (Number(target.vars.MONTHLY_BUDGET_USD) > 250 || Number(target.vars.MONTHLY_BUDGET_USD) <= 0) throw new Error('Monthly budget must be positive and at most $250.');
function run(args, capture = false) {
  const result = spawnSync(process.execPath, args, { cwd: app, encoding: 'utf8', stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit' });
  if (result.status !== 0) throw new Error(capture ? 'Unable to inspect Cloudflare secrets. Authenticate with npm run cf -- login.' : 'Release command failed; deployment stopped.');
  return result.stdout;
}
const secretOutput = run(['scripts/cloudflare.mjs', 'secret', 'list', '--env', environment], true);
let secrets;
try { secrets = JSON.parse(secretOutput); } catch { throw new Error('Could not parse the managed secret inventory; deployment stopped.'); }
const names = new Set(secrets.map(secret => secret.name));
const required = ['WORKOS_API_KEY', 'WORKOS_CLIENT_ID', 'SESSION_ENCRYPTION_KEY'];
if (target.vars.RESEARCH_ENABLED === 'true') {
  if (!target.r2_buckets?.some(bucket => bucket.binding === 'RESEARCH_BUCKET')) throw new Error('Enable R2 and configure RESEARCH_BUCKET before enabling research.');
  required.push('OPENAI_API_KEY');
}
if (target.vars.EMAIL_ENABLED === 'true') required.push('RESEND_API_KEY', 'RESEND_WEBHOOK_SECRET', 'EMAIL_FROM', 'UNSUBSCRIBE_SECRET');
const missing = required.filter(name => !names.has(name) && !target.vars[name]);
if (missing.length) throw new Error(`Missing managed configuration: ${missing.join(', ')}`);
run(['scripts/run-release-saas.mjs']);
run(['scripts/cloudflare.mjs', 'd1', 'migrations', 'apply', 'DB', '--remote', '--env', environment]);
run(['scripts/cloudflare.mjs', 'deploy', '--env', environment]);
console.log(`Deployed ${environment}. Complete the live acceptance checks in docs/SAAS-OPERATIONS.md before opening the beta.`);
