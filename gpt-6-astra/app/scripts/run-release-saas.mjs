import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const cwd = fileURLToPath(new URL('..', import.meta.url));
for (const script of ['typecheck', 'lint', 'test', 'build:saas']) {
  const result = spawnSync('npm', ['run', script], { cwd, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const result = spawnSync(process.execPath, ['scripts/cloudflare.mjs', 'deploy', '--env', 'staging', '--dry-run'], { cwd, stdio: 'inherit' });
process.exitCode = result.status ?? 1;
