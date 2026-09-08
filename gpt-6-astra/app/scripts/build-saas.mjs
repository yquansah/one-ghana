import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const app = fileURLToPath(new URL('..', import.meta.url));
const built = spawnSync(process.execPath, [new URL('../node_modules/vinext/dist/cli.js', import.meta.url).pathname, 'build'], {cwd:app,stdio:'inherit',env:{...process.env,NEXT_PUBLIC_SAAS_MODE:'true'}});
if (built.status !== 0) process.exit(built.status ?? 1);
rmSync(new URL('../dist/saas',import.meta.url),{recursive:true,force:true});
mkdirSync(new URL('../dist/saas',import.meta.url),{recursive:true});
cpSync(new URL('../dist/client',import.meta.url),new URL('../dist/saas',import.meta.url),{recursive:true});
writeFileSync(new URL('../dist/saas/_headers',import.meta.url), `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=()
`);
console.log('SaaS frontend exported to dist/saas. The hosted private demo is unchanged.');
