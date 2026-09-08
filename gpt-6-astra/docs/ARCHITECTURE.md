# Architecture decisions

The SaaS follows PLAN.md: Cloudflare Workers + Static Assets, D1, private R2, Cron, Workflows and Queues. WorkOS is the sole identity provider; Resend and OpenAI are specialized external services. There is no Supabase dependency.

The existing React interface and deterministic simulation remain shared. Default static builds retain the historical local demo. NEXT_PUBLIC_SAAS_MODE=true produces a separate SaaS frontend for the same-origin Cloudflare API. Worker sessions authorize account-owned cloud records; no D1 client access is exposed. Immutable event payloads live in a versioned campaign envelope, separate from the original frozen game state.

Research jobs collect and reconcile evidence, request editorial review, and publish versioned briefings. Only humans approve numerical event mappings. Cron schedules jobs; Workflows persist dependent stages; an outbox and Queues manage delivery. Source and provider failures are recoverable and never cause fabricated research or fake successful sends.

The existing .openai/hosting.json and private Sites publication remain intact. Cloudflare is deployed independently through Wrangler. All resource names, migrations and deploy helpers live in this directory; credentials, caches and generated output are excluded from Git. See SAAS-OPERATIONS.md for activation requirements and operational commands.
