import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const app = fileURLToPath(new URL('..', import.meta.url));
const work = resolve(app, '../work');
for (const name of ['cloudflare-config', 'cloudflare-cache', 'cloudflare-logs', 'tmp']) mkdirSync(resolve(work, name), { recursive: true });
const child = spawn(process.execPath, [resolve(app, 'node_modules/wrangler/bin/wrangler.js'), ...process.argv.slice(2), '--config', resolve(app, 'infra/wrangler.jsonc')], {
  cwd: app, stdio: 'inherit', env: { ...process.env, XDG_CONFIG_HOME: resolve(work, 'cloudflare-config'), XDG_CACHE_HOME: resolve(work, 'cloudflare-cache'), WRANGLER_LOG_PATH: resolve(work, 'cloudflare-logs'), WRANGLER_SEND_METRICS: 'false', TMPDIR: resolve(work, 'tmp') },
});
child.on('exit', code => { process.exitCode = code ?? 1; });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
