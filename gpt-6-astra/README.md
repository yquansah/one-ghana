# One Ghana — The Presidency

A private, single-player Ghana presidency and institutions learning game. The implementation follows `PLAN.md`; the application lives in `app/` and all project material stays in this directory.

Play privately: https://one-ghana-astra.ybquansah.chatgpt.site

## Run locally

Use Node.js 22.13 or later:

```sh
cd app
npm ci
npm run dev
```

Use the localhost URL printed by the development server. For the production build:

```sh
npm run check:release
npm start
```

`npm start` serves the static production output locally. No database, paid AI API, or external application server is required for gameplay. Private access is provided by Sites at deployment.

## Project structure

- `app/src/data`: frozen evidence, regional baseline, and 24 policy templates.
- `app/src/engine`: deterministic quarterly simulation, worker interface, save validation, campaign archives and legacy scenarios.
- `app/src/ui`: presidential briefing, Ghana regions and households, policy workspace, institutions, results and evidence.
- `app/src/design`: shared visual system; `app/public/design` contains the labelled region schematic.
- `app/src/integration`: WebMCP actions using the same game handlers as the interface.
- `docs`: API, design, architecture, research, operations and agent handoffs.
- `work`: dependency cache, intermediate reports, sensitivity results and release packaging.

## Evidence and limits

The initial research cutoff is 4 September 2026. Q1 2027 inauguration and the election timetable are fictional. Source observations, projections, modelling assumptions and unavailable values remain distinct. Policy coefficients, households, regional economic allocations and political responses are teaching assumptions, not validated forecasts. GDP, treasury funds, central-bank reserves and export receipts are separate quantities.

Campaigns save in this browser on this device; export a backup for portability. Branches archive the source campaign before switching the active save. Existing campaigns retain their dataset/model versions and frozen baseline. Browser storage is not cloud synchronisation.

See `docs/STATUS.md` for verified progress and release state; `docs/research/README.md` for source reconciliation and unavailable data. Agent roles are rotated within the platform's concurrency limit, with durable handoffs in `docs/agents`.
