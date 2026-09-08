# SaaS frontend handoff

Implemented the account layer in `app/src/saas`, conditional SaaS page entry, shared presidency `GameShell`, and optional cloud WebMCP tools. Default builds retain the original browser-local game. No dependencies or deployment configuration changed by frontend agent.

- Google sign-in, session/configuration errors and logout; no mock or local-account fallback.
- Shared six-view gameplay using backend-authoritative actions; serialized initialization/actions, idempotency keys, revision conflicts and explicit latest-version recovery. Browser worker previews/comparisons share accepted-event schedules.
- Cloud campaign selection/create/branch/upgrade, confirmed deletion, complete export/import, explicit main-save and archive migration. Different-origin demo saves use JSON export/import.
- Policy drafts retained in account-scoped sessionStorage across view changes/sign-in navigation. Cloud records remain authoritative.
- Ghana now briefings, source dates/links/uncertainty, corrections, bounded next-quarter event preview and explicit acceptance. Stale previews cannot be accepted. Email deep links survive sign-in and navigate to the briefing.
- Digest choices and separate major-alert opt-in with consent; empty topic filter means all.
- Administrator version-specific review, major designation, publication withdrawal, manually reviewed event mapping publication/withdrawal, job/source/spend inspection, and source-check recovery trigger.
- Optional WebMCP read/preview/accept-current-event actions invoke same authenticated UI functions; existing five local game tools unchanged.

Validation: `npm run typecheck` passes (whole project at handoff); scoped oxlint passes; six focused client/WebMCP tests pass. No broad browser visual QA performed, consistent with Sites workflow instruction. Provider-backed sign-in and authenticated live integration need root's configured staging environment. All source remains within gpt-6-astra.

Final pass added confirmed campaign deletion, generation-guarded serialized initialization, email-link recovery through Google navigation, source-publication versus collection labels, administration outbox diagnostics, and 80%/exhausted discretionary-budget alerts accounting for the platform reserve. Two additional focused tests verify read-only current/archive migration (including same-ID branches and corrupt-current/healthy-archive recovery) and budget thresholds. Eight focused tests now cover frontend contracts; whole-project typecheck and scoped lint pass.
