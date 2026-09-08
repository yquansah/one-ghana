# Cloudflare SaaS operations

## Current production status

Production deployed on 8 September 2026 at https://oneafrica.yoofi.io. Worker version: `8b0c30d8-59c2-4f03-be2a-cfe8821a42c8`. Deployment passed all 69 tests, typecheck, lint, frontend build, and Worker checks. See `work/production-deploy.log` and `work/production-live-check.json`.

HTTPS frontend, health/session endpoints and unauthenticated API rejection are verified. Separate production WorkOS credentials validate successfully and the callback is registered. Hosted AuthKit authorization resolves, but Google-specific authorization returns HTTP 404. Configure Google OAuth in the production WorkOS dashboard using your own Google Cloud OAuth client credentials. Use the Google-facing callback URI supplied by WorkOS when configuring Google Cloud; it differs from the application-facing `/auth/callback` registered with WorkOS. Shared staging Google credentials cannot be used in production. Full interactive sign-in remains unverified.

Research and email remain disabled pending R2 activation, a verified sender, and the production Resend webhook signing secret. Staging remains available at https://one-ghana-saas-staging.workeryoofi.workers.dev. The sections below include earlier local/staging preparation checkpoints.


This deployment is separate from the owner-only Sites demo. All commands below run from `gpt-6-astra/app` with Node 22.13+. Never publish `dist/saas` through the private demo’s Sites configuration. `infra/wrangler.jsonc` defines the Worker, Static Assets, D1, private R2, Workflow, Queues, and environment schedules. It lives outside the app root so vinext can export the frontend without attempting a second Worker build.

## Selected production domain

The selected production origin is `https://oneafrica.yoofi.io`, configured in `infra/wrangler.jsonc` with a Worker custom-domain route. The WorkOS callback is `https://oneafrica.yoofi.io/auth/callback`; the Resend webhook is `https://oneafrica.yoofi.io/api/email/webhook`. These are intended deployment endpoints, not live verified endpoints yet.

On 8 September 2026, `yoofi.io` uses Vercel authoritative nameservers and `oneafrica.yoofi.io` resolves to Vercel addresses. The standard Cloudflare Worker custom-domain setup requires an active Cloudflare zone. Before changing nameservers, obtain and preserve the complete existing DNS record inventory, including Vercel application and email records. Domain registration can remain at Name.com. No live DNS records have been changed for this selection. Staging origin and email sender remain to be configured.

## Production preparation

Cloudflare now reports `yoofi.io` active with `remy.ns.cloudflare.com` and `tegan.ns.cloudflare.com`. The production D1 database (`45437707-e7af-4d88-9f43-23c3a64c1807`) and main/dead-letter queues have been provisioned, and both D1 migrations applied remotely. Production Worker dry run and lint pass. The custom-domain Worker has not yet been published.

The supplied WorkOS credentials belong to staging. Fill `WORKOS_API_KEY` (the production secret key) and its matching `WORKOS_CLIENT_ID` in the ignored `app/infra/.dev.vars.production` file. Separate production session and unsubscribe secrets are already generated there. Run `node scripts/install-secrets.mjs production` to install the approved values without exposing them; register the production callback with that application's WorkOS API, then run `npm run deploy:production`.

R2 remains unactivated, so production also temporarily declares an empty R2 binding list. Its research and email flags remain false. After account activation, create `one-ghana-research-production` and restore the `RESEARCH_BUCKET` binding before enabling research. Email additionally requires the production Resend webhook secret and a verified sender. No production identity has been connected to the staging WorkOS environment.

## Current staging deployment

Staging runs at `https://one-ghana-saas-staging.workeryoofi.workers.dev`. Its WorkOS callback is registered. D1 migrations, Queues and the Workflow are deployed. R2 is not enabled for this Cloudflare account, so staging temporarily declares an empty R2 binding list with research disabled. After enabling R2, create `one-ghana-research-staging`, restore its `RESEARCH_BUCKET` binding in staging configuration and redeploy before running research.

The provided Resend API key is valid but restricted to sending. Register `https://one-ghana-saas-staging.workeryoofi.workers.dev/api/email/webhook` through the Resend dashboard for `email.delivered`, `email.bounced`, and `email.complained`, then store its signing secret. Supply a verified `EMAIL_FROM` before enabling email. No messages have been sent. The app's health endpoint shows which pipelines are enabled.

## Local verification

```sh
npm ci
npm run check:saas
npm run cf -- d1 migrations apply DB --local --env= --persist-to ../work/cloudflare-state
npm run dev:saas
```

Open `http://localhost:8787`. Without credentials the sign-in screen explicitly reports unavailable authentication; there is no mock production login. The wrapper keeps Wrangler configuration, logs, temporary files, and cache under project `work/`. Local secrets go in `app/infra/.dev.vars` beside the Wrangler configuration (copy the keys from `app/.dev.vars.example`); this file is ignored. Do not commit credentials. Use an HTTPS staging callback to test real Google authentication. `npm run build` still builds the browser-only private demo; `npm run build:saas` produces the separate `dist/saas` artifact. Both use the same frozen engine. Restart local Wrangler after rebuilding assets. Browser storage is origin-specific: export saves from the private demo and import those JSON files into the SaaS when the origins differ; a new origin cannot read the old origin’s browser storage.

## Provision staging, then production

1. Authenticate using `npm run cf -- login` or configure `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the shell. The task-local login is independent of a previously saved global Wrangler login.
2. For each environment, create its named D1 database with `npm run cf -- d1 create one-ghana-staging` (production: `one-ghana-production`). Record the returned `database_id` under the corresponding environment in `infra/wrangler.jsonc`.
3. Create the private bucket with `npm run cf -- r2 bucket create one-ghana-research-staging`. Create both queues with `npm run cf -- queues create one-ghana-email-staging` and `npm run cf -- queues create one-ghana-email-dead-staging`. Repeat with `production` suffixes. No R2 public domain is needed. Workflow bindings are deployed with the Worker class.
4. Set the exact HTTPS `APP_ORIGIN` for each environment. Add a Cloudflare Worker custom-domain route to the configuration when using your domain, or use the exact account Workers subdomain. Do not invent a domain or callback URL. Staging and production must use different databases, buckets, queues, WorkOS configuration, and secrets.
5. In WorkOS AuthKit, enable Google OAuth, configure the Google client/consent screen, allow `<APP_ORIGIN>/auth/callback` and the logout redirect origin. Set `WORKOS_CLIENT_ID`, `WORKOS_API_KEY`, and a cryptographically random `SESSION_ENCRYPTION_KEY` of at least 32 characters with `npm run cf -- secret put KEY --env staging`. Repeat for production. No enterprise organization is required. `ADMIN_EMAILS` is an optional comma-separated allowlist of verified Google account emails. It is evaluated at login; remove existing admin sessions when revoking access.
6. Configure OpenAI credentials and the pinned supported extraction model. Store `OPENAI_API_KEY` as a managed secret. Research does not run until `RESEARCH_ENABLED` is explicitly set to `true`.
7. Verify an email sender domain in Resend. Store `RESEND_API_KEY`, `EMAIL_FROM`, a random `UNSUBSCRIBE_SECRET` (at least 32 characters), and `RESEND_WEBHOOK_SECRET`. Register `<APP_ORIGIN>/api/email/webhook` for delivery, bounce and complaint events. Set `EMAIL_ENABLED=true` only after opt-in, unsubscribe, and webhook checks pass in staging. No real email is sent by automated tests.
8. Run `npm run deploy:staging`. The helper rejects a missing canonical origin, D1 ID, invalid budget, or missing required managed secrets; then runs typecheck, lint, tests, frontend build, Worker dry run, remote migrations, and deployment. Production uses `npm run deploy:production` after staging acceptance. Review forward-only migrations before applying them to an existing database.

Secret values are never required in chat. Enable research/email only after their provider configuration is complete. New resources may incur charges; no live resources were provisioned by the credential-free local build.

## Research and editorial controls

Production Cron Triggers use UTC, equivalent to Africa/Accra: hourly collection at minute zero, daily discovery at 06:00, digests at 08:00, and outbox recovery/major-alert evaluation every five minutes. Staging has no scheduled triggers by default; an administrator can run a manual hourly/daily check from the dashboard. Workflows run independently of browser sessions. Each scheduled run has a stable hour/kind identifier, recorded status, bounded steps and retries.

Discovery follows bounded article links on the same allowlisted official issuer. The daily pass inspects more links than the hourly pass; this is curated source monitoring, not unrestricted web search. Pages that block collection or lack supported article links appear as failures for administrator action. Automatic publication requires verified recent source publication metadata and an exact attributed official extract. Missing dates, political interpretation, corrections, and disputed content go to review. Reviewing a briefing does not publish a game effect: an administrator separately supplies bounded, explicit teaching assumptions. Corrections retire prior offers and preserve historical payloads. Older accepted events receive notices; they are not silently rewritten.

All effects are versioned mapping releases. Classic campaigns preserve the 4 September 2026 baseline. Upgrading explicitly creates a branch; source articles cannot change model coefficients or apply turns. The initial optional mappings affect cocoa yield, energy availability and external demand within server-enforced bounds. This is a teaching model, not a causal forecast or automatic baseline recalibration.

## Delivery and spending

Account email preferences default to off. Daily digests run at 08:00 Accra; weekly summaries run Monday at 08:00. Major alerts require separate consent, administrator designation, and an atomic two-per-account/day limit. Empty digests are skipped. Consent is rechecked before each provider attempt. Outbox messages freeze their payload, use leases and provider idempotency keys, and stop automatic retries after 23 hours when a provider deduplication guarantee can no longer safely be assumed. Inspect `needs_review` deliveries before manual recovery; do not blindly send them again. Verified early webhooks are retained for reconciliation. Bounce/complaint suppression overrides preferences. The signed unsubscribe link presents confirmation; the one-click unsubscribe POST also works without a login.

The application enforces a $250 maximum configured ceiling and defaults to $75 reserved for platform/fixed costs, leaving $175 for discretionary operations. Each bounded model attempt reserves $0.10 and each email attempt reserves $0.01 atomically before calling a provider; failed/uncertain attempts keep the conservative reservation. The administrator sees budget warnings and suspension. These are conservative application reservations, not imported provider invoices or a guaranteed Cloudflare account billing cap. Configure provider spending alerts/limits, monitor actual Workers/D1/R2/Queues usage, and increase the fixed reserve if real infrastructure costs rise. Disable discretionary flags before the total forecast exceeds $250. Keep the allowlisted model and input/output limits aligned with its verified pricing before changing it.

## Live acceptance and recovery

Before opening the public beta, verify real Google login, callback replay rejection, session refresh/logout, two-account isolation, cloud turn retry/conflict handling, browser save migration and exports. Trigger research with browsers closed, inspect sources/provenance and review a correction. Preview/accept an event and prove it applies once on a future turn. With consenting test accounts, verify digest timing, major limits, unsubscribe, bounced suppression and signed webhook delivery. Review queue dead letters, `needs_review` outbox rows, research failures/backlog and spending alerts in the administrator view.

Use Cloudflare observability for Worker/Workflow failures and Queues for dead letters. Database rows retain jobs, publication revisions, delivery status, corrections and editorial audit. Permitted document artifacts stay in private R2; copyrighted source material is not republished wholesale. Expired OAuth states/sessions are cleaned by the daily scheduled handler. Campaign idempotency records remain to protect old retries.

Before a migration, export D1 with the environment-specific Wrangler command and keep the backup private in project `work/` or controlled storage. Retain R2 objects needed for provenance. A Worker rollback must remain compatible with the deployed schema; prefer a forward fix after schema changes. Disable `RESEARCH_ENABLED`/`EMAIL_ENABLED` and redeploy to pause discretionary work. Do not roll campaigns back or delete queued work to conceal failures. Rotate compromised secrets and invalidate affected sessions; session-key rotation requires reauthentication. Unsubscribe-key rotation invalidates old signed links, so preserve a recovery path for recipients.
