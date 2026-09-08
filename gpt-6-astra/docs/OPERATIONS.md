# Private demo operations

This document describes the preserved browser-only Sites release. For the Cloudflare/WorkOS SaaS, use [SAAS-OPERATIONS.md](SAAS-OPERATIONS.md).

The application is a static export. The browser owns the simulation worker, campaign storage and JSON import/export. There is no application database, paid AI API, Node production server or server-function endpoint in the release. Sites controls owner-only access; the coordinator owns hosting configuration, deployment and access verification.

## Local commands

Run from `gpt-6-astra/app` with Node **22.13 or newer**:

```sh
npm_config_cache=../work/npm-cache npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run check:static
npm run preview
```

`preview`/`start` serve **app/dist/client** at `http://127.0.0.1:4173`; `npm run preview -- --port 4174` chooses another local port. No wildcard/network binding is provided. Build first. `dev` runs vinext on loopback for implementation. Do not use a development server as the release.

`npm run check:release` executes typechecking, unit/integration/acceptance tests, production build and static-artifact verification. `npm run analyze:model` writes reproducible scenario evidence to `work/model-sensitivity.json`. Npm caches/reports remain inside the requested project directory. Do not apply `npm audit fix --force` indiscriminately.

`npm run lint` checks authored source, app routes, scripts, tests and application configuration; unchanged generated component-library files are excluded. Typechecking still covers all included TypeScript. The complete authored-source lint gate passed at final sign-off.

The static preview serves only files inside the exported directory; rejects traversal, hidden paths, symlink escapes and non-read methods; returns correct JavaScript MIME for module workers; omits source maps; and returns 404 for a missing asset instead of substituting HTML. HTML and unfingerprinted assets revalidate; generated static chunks use immutable caching. These preview safeguards do not replace Sites access control.

## Release procedure

The GitHub repository tracks `gpt-6-astra/app` as ordinary source files. The original Sites publishing repository metadata is preserved locally at `work/sites-source.git`; it is excluded from GitHub with the other local work files. Future Sites publication should use an isolated checkout rooted at the application, prepared inside `work/`, and preserve the existing project ID. Do not commit the parent repository as the Sites source or add the application as an embedded Git repository.

1. Complete the shared source changes, then run `npm run check:release`. All tests must pass. Do not reuse a build produced before a subsequent source edit.
2. Inspect `work/static-release-manifest.json`: it hashes the exported files and requires a simulation-worker asset. Only `app/dist/client` is publishable; `dist/server`, `work`, `docs`, package caches and source files are not the public artifact.
3. The coordinator publishes using the existing Sites configuration and confirms the owner-only access setting. Do not create a second site or change the user's access policy.
4. Verify focused live WebMCP actions through the same handlers as the interface, including worker operation, preview/submission, quarter advancement and autosave/reload. Cover exports/imports, archive identity, branching/comparison, election/legacy and evidence references in the automated suite. Record the actual verification scope; do not imply broad visual browser testing was performed.
5. Record release version, build/verification results and hosted access status in `docs/RELEASE.md`. Preserve the package lock and dataset/model versions.

## Campaign preservation

Campaigns live in this browser profile and site origin. They do not automatically sync across devices or browsers. Clearing site data, using a private window, or changing the hosting origin may remove or hide access to the current browser save. Export JSON when preserving an important campaign or before changing origins.

Save files contain schema/model/dataset version, seed, frozen baseline and campaign history. Import validates these fields, nested quantities and identities before running the engine. A bad or incompatible file should produce an actionable message and leave the current state intact. No automatic migration is promised. A storage-quota failure must tell the player to export; tests confirm the previous successful save remains recoverable.

Archives and current-campaign saves are local storage too. Exporting is the portable backup. Do not collect or upload a player's save for diagnostics without authorization; model telemetry is not required for operation.

## Failure handling and rollback

- Build or static check failure: keep the previous release; repair the concrete failure and rebuild.
- Missing worker or wrong MIME: verify the worker file exists in `dist/client`, is referenced by the current bundle and is served as JavaScript. A fallback on the main thread is a compatibility path, not proof of worker deployment.
- Simulation/import failure: preserve the original JSON; show the validation message. Avoid deleting the saved campaign to suppress an error.
- Bad deployment: the coordinator republishes the last verified source/build through Sites. Keep the same origin so browser saves remain available. Do not silently downgrade a save format or rewrite its frozen baseline.
- Dependency advisory: inspect the exact package, vulnerable execution path and compatible patched versions; update the lock, run the release checks, and record the result. A clean audit is a point-in-time scan, not a guarantee against future advisories.

## Dependencies

On 7 September 2026 the installed tree audit reports **zero vulnerabilities** in `work/npm-audit-after.json`. Targeted changes were React/react-dom/react-server-dom-webpack **19.2.8**, Vite **8.0.16**, vinext **1.0.0-beta.9**, plugin-rsc **0.5.34**, and permitted transitive esbuild/undici updates. At that private-demo release, the unused Cloudflare Vite plugin and Wrangler were removed; Wrangler has since been restored for the separate SaaS Worker; worker types remain for the starter TypeScript configuration. The generated component libraries remain.

The RSC patch addresses [GHSA-wx67-qw84-cm4g](https://github.com/advisories/GHSA-wx67-qw84-cm4g); Vite addresses [GHSA-fx2h-pf6j-xcff](https://github.com/advisories/GHSA-fx2h-pf6j-xcff). The vulnerable [image-size parser](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) had no patched package version; the compatible vinext update removed the dependency. No version-forcing override or blanket major update was used. The static export and typecheck passed on the updated stack; the final integrated production build also passed the release gate.

## Model support boundaries

The model is calibrated for an ordinary learning scenario, not a severe-crisis reconstruction. Inflation is capped at 35%, below Ghana's observed 54.1% end-year inflation in 2022. An opening cocoa world-price-level change revalues exports but does not alter the farmer-income index under identical percentage shocks; do not represent this as estimated farmgate pass-through or coverage of arbitrary terms-of-trade changes. Preserve these caveats in the in-game guide. `docs/RELEASE.md` records the historical comparison and sensitivity results; regenerate `work/model-sensitivity.json` when model formulas change.
