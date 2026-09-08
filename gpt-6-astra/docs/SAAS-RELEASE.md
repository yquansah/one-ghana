# Cloudflare SaaS verification — 8 September 2026

Production deployed on 8 September 2026 at https://oneafrica.yoofi.io. Worker version: `8b0c30d8-59c2-4f03-be2a-cfe8821a42c8`. Deployment passed all 69 tests, typecheck, lint, frontend build, and Worker checks. See `work/production-deploy.log` and `work/production-live-check.json`.

HTTPS frontend, health/session endpoints and unauthenticated API rejection are verified. Separate production WorkOS credentials validate successfully and the callback is registered. Hosted AuthKit authorization resolves, but Google-specific authorization returns HTTP 404. Configure Google OAuth in the production WorkOS dashboard using your own Google Cloud OAuth client credentials. Use the Google-facing callback URI supplied by WorkOS when configuring Google Cloud; it differs from the application-facing `/auth/callback` registered with WorkOS. Shared staging Google credentials cannot be used in production. Full interactive sign-in remains unverified.

Research and email remain disabled pending R2 activation, a verified sender, and the production Resend webhook signing secret. Staging remains available at https://one-ghana-saas-staging.workeryoofi.workers.dev. The sections below include earlier local/staging preparation checkpoints.


Current status: staging is deployed at https://one-ghana-saas-staging.workeryoofi.workers.dev (8 September 2026), Worker version `36e6398a-03c1-4d60-ba54-9df0a9b92558`. The release below remains the original local verification record.

Staging deployment ran all 69 tests, typecheck, lint, frontend build and Worker dry run, then applied both migrations remotely. D1, the main/dead-letter Queues and Workflow are provisioned. Managed secrets are installed. WorkOS accepted registration of the staging callback. Live checks confirm frontend/health/session responses, unauthenticated API rejection, and the Google authorization redirect. Full interactive Google callback and authenticated gameplay remain to be tested. Evidence: `work/staging-deploy.log` and `work/staging-live-check.json`.

Research/email remain disabled. R2 creation was rejected because the account has not enabled R2; staging intentionally has no R2 binding until activation. The Resend key is send-only and cannot create a webhook; no webhook or email was sent. Production/custom-domain deployment is pending. The domain was subsequently activated on Cloudflare. Production D1 and both queues are provisioned and migrations applied; production Worker publication awaits the live WorkOS key and matching client ID. R2 remains unactivated. See `SAAS-OPERATIONS.md` for current preparation details.

Original local verification status: implemented and verified locally; not yet deployed at that checkpoint. The existing private Sites demo and hosting configuration remain unchanged. All source, configuration, tests, documents, and local artifacts remain within `gpt-6-astra`.

## Delivered

- WorkOS Google OAuth with PKCE, one-time callback state, secure opaque sessions, encrypted refresh tokens, refresh concurrency protection, CSRF and logout revocation.
- D1 account ownership and authoritative deterministic campaign mutations, atomic revisions/idempotency, explicit browser-save migration, branches and validated cloud exports/imports.
- Versioned optional scenarios with bounded teaching effects, explicit acceptance for a future turn, comparable previews, immutable applied payloads and correction notices.
- Cron-triggered research Workflows with curated source discovery, provenance in D1/private R2, bounded model requests, exact source support, hybrid publication/review and administrator recovery.
- Durable queued email with opt-in preferences, daily/weekly schedules, separate major consent/limits, frozen retries, provider idempotency, delivery diagnostics, verified webhook reconciliation and unsubscribe independent of account sessions.
- Administrator budget warnings and suspension, conservative atomic spending reservations capped at $250 configured total, environment-specific Wrangler resources, managed-secret templates and guarded deployment scripts.
- Shared UI/WebMCP actions and preserved six-view game interface. PLAN.md, architecture and operations documentation updated.

## Verification evidence

`npm run check:saas` passes TypeScript, authored-source lint, **69 tests**, SaaS static export and a Cloudflare Worker dry run. Evidence: `work/saas-final-check.log`.

The original private-demo release command also passes its regression suite, static build and artifact checks. Evidence: `work/saas-regression.log`. All 20 original engine tests remain passing. Live-event tests preserve classic behavior and verify one-time application, bounded inputs, timeline validation and equivalent comparison inputs.

Real SQLite-backed tests cover separate-account access, revision conflicts, duplicate operations, transaction rollback, classic imports, canonical event imports, OAuth replay, expired/malformed tokens, concurrent session refresh, editorial authorization, corrections, budget concurrency, queue replay, consent, early bounce webhooks and delayed approval notification windows. Provider calls are mocked; these tests do not certify live Google, Resend or OpenAI configuration.

Both final migrations apply successfully to a fresh local D1 instance: `work/saas-final-migrations.log`. Local Wrangler HTTP smoke checks cover frontend assets, health/session, unauthenticated campaign/admin rejection, missing-auth error presentation, and unsubscribe routing: `work/saas-http-smoke.json`. Restart local Wrangler after rebuilding static assets so its asset manifest matches the new bundle.

Dependency audit reports **zero vulnerabilities**: `work/saas-audit.json`. `git diff --check` passes. Broad visual browser testing and live authenticated WebMCP verification were not performed for this SaaS release. The earlier private-demo live verification remains documented separately.

## Launch blockers and remaining acceptance

Cloudflare login is expired, and no Cloudflare API token or WorkOS, Resend, or OpenAI credentials were available. Canonical staging/production domains and an email sender have not been supplied. Staging/production `APP_ORIGIN` remain empty, resource IDs are unprovisioned, and research/email flags remain disabled. Deployment preflight was verified to reject this incomplete configuration before remote writes (`work/saas-deploy-preflight.log`).

Follow `SAAS-OPERATIONS.md` to provision isolated environments, install managed secrets, configure Google callbacks and the verified sender/webhook, and run staging then production deployment. Before enabling the public beta, verify actual provider sessions, scheduled research with browsers closed, signed email delivery/webhooks, unsubscribe and provider billing alerts. No production resources were created and no emails were sent during implementation.

Spending reservations bound this application's discretionary calls; they are not a hard cap on an entire Cloudflare or provider account invoice. Monitor actual fixed/infrastructure costs and provider limits as documented. Source monitoring is a bounded curated crawl; undated or disputed evidence requires review, and unavailable data is not invented. Billing, multiplayer, enterprise organizations and automatic campaign event application remain excluded.
