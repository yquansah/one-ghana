import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const groups = await Promise.all(entries.map(entry => entry.isDirectory()
    ? collect(join(directory, entry.name))
    : /\.test\.(ts|tsx|mjs)$/.test(entry.name) ? [join(directory, entry.name)] : []));
  return groups.flat();
}
const files = (await Promise.all(['src', 'tests'].map(collect))).flat().sort();
if (!files.length) throw Error('No acceptance or unit tests discovered.');
const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...files], { stdio: 'inherit' });
process.exit(result.status ?? 1);
