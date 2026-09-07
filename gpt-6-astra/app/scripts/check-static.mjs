import { readdir, readFile, lstat, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';
import { createHash } from 'node:crypto';
const root = resolve('dist/client');
async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if ((await lstat(path)).isSymbolicLink()) throw Error('Static release must not contain symbolic links: ' + path);
    if (entry.isDirectory()) files.push(...await collect(path)); else files.push(path);
  }
  return files;
}
const files = await collect(root);
const names = files.map(file => relative(root, file));
if (!names.includes('index.html')) throw Error('Missing static index.html.');
for (const name of names) if (/(^|\/)\.env|\.(pem|key|map)$|(^|\/)node_modules\//.test(name)) throw Error('Non-public file in static release: ' + name);
const workers = names.filter(name => /worker.*\.js$/i.test(name));
if (!workers.length) throw Error('No browser worker asset found. The release must include the simulation worker.');
const html = await readFile(join(root, 'index.html'), 'utf8');
for (const match of html.matchAll(/(?:src|href)="(\/[^"?#]*)/g)) {
  const name = decodeURIComponent(match[1].slice(1));
  if (name && !names.includes(name) && !names.includes(name + '.html') && !names.includes(name + '/index.html')) throw Error('Static HTML references a missing asset: ' + name);
}
const artifacts = [];
for (const name of names.sort()) { const bytes = await readFile(join(root, name)); artifacts.push({ path: name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }); }
await mkdir(resolve('../work'), { recursive: true });
await writeFile(resolve('../work/static-release-manifest.json'), JSON.stringify({ generatedAt: new Date().toISOString(), root, workers, totalBytes: artifacts.reduce((sum, a) => sum + a.bytes, 0), artifacts }, null, 2) + '\n');
console.log(`Static release verified: ${artifacts.length} files, ${workers.length} worker asset(s), no missing HTML references.`);
