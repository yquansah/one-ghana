# Architecture decisions

- Sites React + TypeScript starter in `app/`, with generated shadcn components preserved.
- Static export from vinext. No app server, database, paid AI dependency or user accounts are needed for the requested browser-local campaign storage. Sites supplies owner-only access to the private release.
- Simulation and forecasts run in a browser module worker; deterministic pure functions own all game transitions. React renders the same state returned by the worker.
- Evidence lives separately from policy definitions and model parameters. Every save freezes baseline data, seed, dataset version and model version.
- Root owns Sites lifecycle and project configuration. User-requested agents implement distinct paths and communicate through `docs/API.md`, `docs/DESIGN.md`, their handoffs and direct messages.
- WebMCP lives in `src/integration/webmcp.ts`; frontend binds its actions to the same worker/state/autosave path as the UI. Tools perform runtime validation, support feature detection and unregister via AbortSignal.
- npm cache, reports and temporary data stay under this project’s `work/`. Browser storage is necessarily owned by the browser profile, consistent with PLAN.md.

Static serving avoids deploying server components or image processors at runtime. Dependency audit findings still need infrastructure review; no blanket force update has been run.

Static export capability verified on the opening slice: vinext generates public output in `app/dist/client/`, which is the hosting manifest's configured static directory. The complete release must be rebuilt after engine/UI integration.
