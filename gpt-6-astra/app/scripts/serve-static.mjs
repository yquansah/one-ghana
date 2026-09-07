import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };
/** Local static preview only. Deployment access control is owned by Sites. */
export function staticServer(directory) {
  const root = resolve(directory);
  return createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'same-origin');
    const finish = (status, message) => { response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }); response.end(message); };
    if (!['GET', 'HEAD'].includes(request.method ?? '')) { response.setHeader('Allow', 'GET, HEAD'); finish(405, 'Method not allowed'); return; }
    try {
      const rawPath = (request.url ?? '/').split('?')[0];
      const decoded = decodeURIComponent(rawPath);
      if (!decoded.startsWith('/') || decoded.includes('\0') || decoded.includes('\\') || decoded.split('/').some(segment => segment === '..' || segment.startsWith('.'))) { finish(403, 'Forbidden'); return; }
      let file = resolve(root, '.' + decoded);
      if (file !== root && !file.startsWith(root + sep)) { finish(403, 'Forbidden'); return; }
      let info;
      try { info = await stat(file); } catch { if (!extname(file)) { file += '.html'; info = await stat(file); } else throw Error('missing'); }
      if (info.isDirectory()) { file = resolve(file, 'index.html'); info = await stat(file); }
      if (!info.isFile()) { finish(404, 'Not found'); return; }
      const canonical = await realpath(file);
      const canonicalRoot = await realpath(root);
      if (!canonical.startsWith(canonicalRoot + sep)) { finish(403, 'Forbidden'); return; }
      const extension = extname(file).toLowerCase();
      if (extension === '.map') { finish(404, 'Not found'); return; }
      const immutable = file.includes('/_next/static/') || /\/assets\/[^/]+-[\w-]{8,}\./.test(file);
      response.writeHead(200, { 'Content-Type': types[extension] ?? 'application/octet-stream', 'Content-Length': info.size, 'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache' });
      if (request.method === 'HEAD') { response.end(); return; }
      const stream = createReadStream(file);
      stream.on('error', () => response.destroy());
      stream.pipe(response);
    } catch (error) { finish(error instanceof URIError ? 400 : 404, error instanceof URIError ? 'Malformed path' : 'Not found'); }
  });
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const portIndex = process.argv.indexOf('--port');
  const port = portIndex >= 0 ? Number(process.argv[portIndex + 1]) : 4173;
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Port must be an integer from 1 to 65535.');
  const root = resolve('dist/client');
  await stat(resolve(root, 'index.html'));
  const server = staticServer(root);
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`Static preview: http://127.0.0.1:${port}`));
}
