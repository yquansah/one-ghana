import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile, rm, symlink } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { request } from 'node:http';
import { staticServer } from '../scripts/serve-static.mjs';

test('static preview serves real assets with safe paths, worker MIME, cache rules and no false HTML fallback', async t => {
  const scratch = resolve('../work/static-tests'); await mkdir(scratch, { recursive: true });
  const dir = await mkdtemp(join(scratch, 'release-')); await mkdir(join(dir, 'assets'));
  await writeFile(join(dir, 'index.html'), '<h1>One Ghana</h1>');
  await writeFile(join(dir, 'assets/worker-12345678.js'), 'self.onmessage=()=>{}');
  await writeFile(join(scratch, 'private.txt'), 'private');
  await symlink(join(scratch, 'private.txt'), join(dir, 'linked.txt'));
  const server = staticServer(dir); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await rm(dir, { recursive: true, force: true }); await rm(join(scratch, 'private.txt'), { force: true }); });
  const port = server.address().port;
  const get = (path, method = 'GET') => new Promise((resolve, reject) => { const req = request({ hostname: '127.0.0.1', port, path, method }, res => { let body = ''; res.on('data', chunk => body += chunk); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body })); }); req.on('error', reject); req.end(); });
  const home = await get('/'); assert.equal(home.status, 200); assert.match(home.body, /One Ghana/); assert.equal(home.headers['cache-control'], 'no-cache');
  const worker = await get('/assets/worker-12345678.js'); assert.equal(worker.status, 200); assert.match(worker.headers['content-type'], /javascript/); assert.match(worker.headers['cache-control'], /immutable/); assert.equal(worker.headers['x-content-type-options'], 'nosniff');
  assert.equal((await get('/missing.js')).status, 404);
  assert.equal((await get('/assets/worker-12345678.js', 'HEAD')).body, '');
  assert.equal((await get('/%2e%2e/private.txt')).status, 403);
  assert.equal((await get('/linked.txt')).status, 403);
  assert.equal((await get('/%ZZ')).status, 400);
  assert.equal((await get('/', 'POST')).status, 405);
});
