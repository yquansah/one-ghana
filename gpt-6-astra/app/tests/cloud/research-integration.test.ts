import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestDB } from './sqlite';
import { handleResearch, reserveSpend, getPublishedEvent } from '../../cloud/research';
import { handleNotifications, scheduleNotifications, consumeNotifications, unsubscribeToken } from '../../cloud/notifications';
import type { SaaSEnv } from '../../cloud/env';
import type { Session, Briefing } from '../../cloud/contracts';
void test('D1 research approval, ownership, budget, notification consent and queue retries', async () => {
    const { db, close } = createTestDB();
    try {
        await db.prepare("INSERT INTO accounts VALUES ('a','wa','a@example.test','Admin','admin','2026-09-08'),('b','wb','b@example.test','Player','player','2026-09-08')").run();
        const env = { DB: db, APP_ORIGIN: 'https://example.test', ENVIRONMENT: 'test', EMAIL_ENABLED: 'true', UNSUBSCRIBE_SECRET: 'test-secret', RESEND_API_KEY: 'test', EMAIL_FROM: 'test@example.test', MONTHLY_BUDGET_USD: '250', FIXED_COST_RESERVE_USD: '249.98' } as unknown as SaaSEnv;
        const admin = { user: { id: 'a', email: 'a@example.test', name: 'Admin', role: 'admin' }, csrfToken: 'csrf' } as Session, player = { ...admin, user: { ...admin.user, id: 'b', role: 'player' } } as Session;
        const req = (path: string, body?: unknown) => new Request(`https://example.test${path}`, { method: body ? 'POST' : 'GET', headers: body ? { 'Content-Type': 'application/json', Origin: env.APP_ORIGIN, 'X-One-Ghana-CSRF': 'csrf' } : {}, body: body ? JSON.stringify(body) : undefined });
        const briefing: Briefing = { id: 'brief1', version: 1, title: 'Cocoa update', summary: 'Sourced change', kind: 'analysis', status: 'pending', sourceUrl: 'https://cocobod.gh/news', sourceName: 'COCOBOD', publishedAt: '2026-09-08T07:00:00Z', eventDate: '2026-09-08', topics: ['cocoa'], implications: 'Compare policies.', uncertainty: 'Not a prediction.', major: false, correctionOf: null };
        await db.prepare('INSERT INTO briefings VALUES (?,?,?,?,?,?)').bind(briefing.id, 1, JSON.stringify(briefing), 'pending', briefing.publishedAt, 'hash1').run();
        assert.equal((await handleResearch(req('/api/admin/research/brief1', { version: 1, decision: 'approve' }), env, player))?.status, 403);
        assert.equal((await getPublishedEvent(env, 'unreviewed', 1)), null);
        assert.equal((await handleResearch(req('/api/admin/research/brief1', { version: 1, decision: 'approve', major: true }), env, admin))?.status, 200);
        const invalid = await handleResearch(req('/api/admin/events', { briefingId: 'brief1', title: 'Event', description: 'Scenario', effects: { cocoaYieldPct: 100 }, assumptions: ['Assumption'] }), env, admin);
        assert.equal(invalid?.status, 400);
        const valid = await handleResearch(req('/api/admin/events', { briefingId: 'brief1', title: 'Event', description: 'Scenario', effects: { cocoaYieldPct: -2 }, assumptions: ['Assumption'] }), env, admin);
        assert.equal(valid?.status, 201);
        const event = (await valid!.json()) as {
            event: {
                id: string;
            };
        };
        assert.ok(await getPublishedEvent(env, event.event.id, 1));
        await reserveSpend(env, 0.01);
        await reserveSpend(env, 0.01);
        await assert.rejects(reserveSpend(env, 0.01), /budget/);
        await scheduleNotifications(env, new Date('2026-09-08T08:00:00Z'));
        assert.equal((await db.prepare('SELECT COUNT(*) n FROM email_outbox').first<{
            n: number;
        }>())?.n, 0);
        await db.prepare("INSERT INTO notification_preferences(account_id,digest,major_alerts,topics) VALUES ('b','daily',1,'[\"cocoa\"]')").run();
        await scheduleNotifications(env, new Date('2026-09-08T08:00:00Z'));
        await scheduleNotifications(env, new Date('2026-09-08T08:00:00Z'));
        assert.equal((await db.prepare('SELECT COUNT(*) n FROM email_outbox').first<{
            n: number;
        }>())?.n, 2);
        const unsub = `/api/email/unsubscribe?account=b&token=${await unsubscribeToken('test-secret', 'b')}`;
        assert.equal((await handleNotifications(req(unsub), env, null))?.status, 200);
        assert.equal((await db.prepare("SELECT digest FROM notification_preferences WHERE account_id='b'").first<{
            digest: string;
        }>())?.digest, 'daily');
        await handleNotifications(new Request(`https://example.test${unsub}`, { method: 'POST' }), env, null);
        let acknowledged = 0;
        const rows = await db.prepare('SELECT id FROM email_outbox').all<{
            id: string;
        }>();
        for (const row of rows.results)
            await consumeNotifications({ messages: [{ body: { outboxId: row.id }, ack() { acknowledged++; }, retry() { assert.fail('Consent cancellation must not retry'); } }] } as unknown as MessageBatch<{
                outboxId: string;
            }>, env);
        assert.equal(acknowledged, 2);
        assert.equal((await db.prepare("SELECT COUNT(*) n FROM email_outbox WHERE status='cancelled'").first<{
            n: number;
        }>())?.n, 2);
        await handleResearch(req('/api/admin/research/brief1', { version: 1, decision: 'withdraw' }), env, admin);
        assert.equal((await getPublishedEvent(env, event.event.id, 1))?.status, 'withdrawn');
    }
    finally {
        close();
    }
});
void test('outbox leases, frozen provider retries, major cap and atomic budget reservation', async () => {
    const { db, close } = createTestDB();
    const originalFetch = globalThis.fetch;
    try {
        await db.prepare("INSERT INTO accounts VALUES ('p','wp','p@example.test','Player','player','2026-09-08')").run();
        await db.prepare("INSERT INTO notification_preferences(account_id,digest,major_alerts,topics) VALUES ('p','off',1,'[]')").run();
        const env = { DB: db, APP_ORIGIN: 'https://example.test', ENVIRONMENT: 'test', EMAIL_ENABLED: 'true', UNSUBSCRIBE_SECRET: 'secret', RESEND_API_KEY: 'test', EMAIL_FROM: 'test@example.test', FIXED_COST_RESERVE_USD: '249.99' } as unknown as SaaSEnv;
        const reservations = await Promise.allSettled([reserveSpend(env, 0.01), reserveSpend(env, 0.01)]);
        assert.equal(reservations.filter(r => r.status === 'fulfilled').length, 1);
        env.FIXED_COST_RESERVE_USD = '75';
        for (let i = 0; i < 4; i++) {
            const b = { id: `b${i}`, version: 1, title: `News ${i}`, summary: 'Source statement', kind: 'announcement', status: 'published', sourceUrl: 'https://cocobod.gh/news', sourceName: 'COCOBOD', publishedAt: '2026-09-08T07:00:00Z', eventDate: null, topics: ['cocoa'], implications: 'Compare options.', uncertainty: 'Provisional', major: true, correctionOf: null };
            await db.prepare('INSERT INTO briefings VALUES (?,?,?,?,?,?)').bind(b.id, 1, JSON.stringify(b), 'published', b.publishedAt, `hash${i}`).run();
        }
        await Promise.all([scheduleNotifications(env, new Date('2026-09-08T08:00:00Z')), scheduleNotifications(env, new Date('2026-09-08T08:00:00Z'))]);
        const outbox = await db.prepare('SELECT id FROM email_outbox').all<{
            id: string;
        }>();
        assert.equal(outbox.results.length, 2);
        const payloads: string[] = [], keys: string[] = [];
        let fail = true, acks = 0, retries = 0;
        globalThis.fetch = async (_input, init) => {
            payloads.push(typeof init?.body === 'string' ? init.body : '');
            keys.push(new Headers(init?.headers).get('Idempotency-Key')!);
            if (fail) {
                fail = false;
                throw new Error('Network result unknown');
            }
            return Response.json({ id: 'provider-id' });
        };
        const batch = { messages: [{ body: { outboxId: outbox.results[0].id }, ack() { acks++; }, retry() { retries++; } }] } as unknown as MessageBatch<{
            outboxId: string;
        }>;
        await consumeNotifications(batch, env);
        assert.equal(retries, 1);
        env.EMAIL_FROM = 'changed@example.test';
        await consumeNotifications(batch, env);
        await consumeNotifications(batch, env);
        assert.equal(payloads.length, 2);
        assert.equal(payloads[0], payloads[1]);
        assert.equal(keys[0], keys[1]);
        assert.equal(acks, 2);
        assert.equal((await db.prepare('SELECT status FROM email_outbox WHERE id=?').bind(outbox.results[0].id).first<{
            status: string;
        }>())?.status, 'sent');
    }
    finally {
        globalThis.fetch = originalFetch;
        close();
    }
});
void test('research stores supported excerpts once and revisions enter review', async () => {
    const { db, close } = createTestDB(), originalFetch = globalThis.fetch;
    const { researchDocument } = await import('../../cloud/research');
    let providerCalls = 0, writes = 0, revision = false;
    const date = new Date().toISOString().slice(0, 10), source = { name: 'Ghana Cocoa Board', url: 'https://cocobod.gh/news', official: true };
    const env = { DB: db, OPENAI_API_KEY: 'test', RESEARCH_BUCKET: { async put() { writes++; } }, FIXED_COST_RESERVE_USD: '75' } as unknown as SaaSEnv;
    globalThis.fetch = async (input) => {
        if ((typeof input === 'string' ? input : input instanceof URL ? input.href : input.url).startsWith('https://api.openai.com/')) {
            providerCalls++;
            return Response.json({ output: [{ content: [{ type: 'output_text', text: JSON.stringify({ title: 'Cocoa release', summary: 'AI summary must not autopublish', kind: 'official-data', eventDate: date, publicationDate: date, topics: ['cocoa'], implications: 'AI advice must not autopublish', uncertainty: 'Provisional', supportQuote: `Cocoa volume increased by ${revision ? 3 : 2}%.`, political: false }) }] }] });
        }
        return new Response(`<meta property="article:published_time" content="${date}"><article>Cocoa volume increased by ${revision ? 3 : 2}%.</article>`, { headers: { 'content-type': 'text/html' } });
    };
    try {
        const first = await researchDocument(env, 'https://cocobod.gh/news/release', source);
        assert.equal(first.status, 'published');
        await researchDocument(env, 'https://cocobod.gh/news/release', source);
        assert.equal(providerCalls, 1);
        assert.equal(writes, 1);
        const published = await db.prepare('SELECT payload FROM briefings').first<{
            payload: string;
        }>();
        assert.equal(JSON.parse(published!.payload).summary, 'Cocoa volume increased by 2%.');
        revision = true;
        const second = await researchDocument(env, 'https://cocobod.gh/news/release', source);
        assert.equal(second.status, 'pending');
        assert.equal((await db.prepare('SELECT COUNT(*) n FROM briefings').first<{
            n: number;
        }>())?.n, 2);
        await assert.rejects(researchDocument(env, 'https://gna.org.gh/news/release', source), /publisher mismatch/);
        const configuredFetch = globalThis.fetch;
        globalThis.fetch = async (input, init) => { if ((typeof input === 'string' ? input : input instanceof URL ? input.href : input.url).startsWith('https://api.openai.com/'))
            return configuredFetch(input, init); return new Response('<article>Cocoa volume increased by 3%.</article>', { headers: { 'content-type': 'text/html' } }); };
        const undated = await researchDocument(env, 'https://cocobod.gh/news/undated', source);
        assert.equal(undated.status, 'pending');
        const undatedRow = await db.prepare('SELECT payload FROM briefings WHERE id=?').bind(undated.id).first<{
            payload: string;
        }>();
        assert.equal(JSON.parse(undatedRow!.payload).sourcePublishedAt, null);
    }
    finally {
        globalThis.fetch = originalFetch;
        close();
    }
});
void test('early signed bounce is reconciled after delivery and older evidence uses release time', async () => {
    const { db, close } = createTestDB();
    const { createHmac } = await import('node:crypto');
    const { reconcileWebhooks, selectBriefings } = await import('../../cloud/notifications');
    const { publishedBriefings } = await import('../../cloud/research');
    try {
        await db.prepare("INSERT INTO accounts VALUES ('p','wp','p@example.test','Player','player','2026-09-08')").run();
        await db.prepare("INSERT INTO notification_preferences(account_id,digest) VALUES ('p','daily')").run();
        await db.prepare("INSERT INTO email_outbox(id,account_id,kind,period,payload,created_at) VALUES ('o','p','digest','today','[]','2026-09-08')").run();
        const secret = Buffer.from('webhook-secret').toString('base64'), body = JSON.stringify({ type: 'email.bounced', data: { email_id: 'provider-early' } }), timestamp = String(Math.floor(Date.now() / 1000));
        const signature = createHmac('sha256', Buffer.from(secret, 'base64')).update(`early.${timestamp}.${body}`).digest('base64');
        const env = { DB: db, RESEND_WEBHOOK_SECRET: `whsec_${secret}` } as SaaSEnv;
        const response = await handleNotifications(new Request('https://example.test/api/email/webhook', { method: 'POST', headers: { 'svix-id': 'early', 'svix-timestamp': timestamp, 'svix-signature': `v1,${signature}` }, body }), env, null);
        assert.equal(response?.status, 200);
        assert.equal((await db.prepare("SELECT status FROM email_webhooks WHERE id='early'").first<{
            status: string;
        }>())?.status, 'pending');
        await db.prepare("UPDATE email_outbox SET provider_id='provider-early' WHERE id='o'").run();
        await reconcileWebhooks(env);
        assert.equal((await db.prepare("SELECT suppressed FROM notification_preferences WHERE account_id='p'").first<{
            suppressed: number;
        }>())?.suppressed, 1);
        const b = { id: 'old', version: 1, status: 'published', publishedAt: '2025-01-01', topics: ['cocoa'] } as Briefing;
        await db.prepare('INSERT INTO briefings VALUES (?,?,?,?,?,?)').bind('old', 1, JSON.stringify(b), 'published', '2026-09-08', 'oldhash').run();
        await db.prepare('INSERT INTO briefing_releases VALUES (?,?,?)').bind('old', 1, '2026-09-08T07:00:00Z').run();
        const published = await publishedBriefings(env);
        assert.equal(published[0].publishedAt, '2025-01-01');
        assert.equal(selectBriefings(published, [], Date.parse('2026-09-07')).length, 1);
    }
    finally {
        close();
    }
});
void test('admin monitoring exposes exhausted budget and failed delivery backlog', async () => {
    const { db, close } = createTestDB();
    const { spendingStatus, researchDocument } = await import('../../cloud/research');
    const previousFetch = globalThis.fetch;
    try {
        await db.prepare("INSERT INTO accounts VALUES ('p','wp','p@example.test','Player','player','2026-09-08')").run();
        await db.prepare("INSERT INTO email_outbox(id,account_id,kind,period,payload,created_at,status,last_error,attempt_count) VALUES ('failed','p','digest','today','[]','2026-09-08','failed','Provider unavailable',8)").run();
        const env = { DB: db, FIXED_COST_RESERVE_USD: '250', MONTHLY_BUDGET_USD: '999' } as SaaSEnv;
        const status = await spendingStatus(env);
        assert.equal(status.limitUsd, 250);
        assert.equal(status.warning, true);
        assert.equal(status.suspended, true);
        globalThis.fetch = async () => { assert.fail('Budget suspension must stop before source fetch'); };
        await assert.rejects(researchDocument(env, 'https://cocobod.gh/news/article', { name: 'Ghana Cocoa Board', url: 'https://cocobod.gh/news', official: true }), /budget/);
        const response = await handleResearch(new Request('https://example.test/api/admin/research'), env, { user: { id: 'p', email: 'p@example.test', name: 'Admin', role: 'admin' }, csrfToken: 'csrf' });
        const result = await response!.json() as {
            notifications: {
                failed: number;
                items: unknown[];
            };
            spending: {
                suspended: boolean;
            };
        };
        assert.equal(result.notifications.failed, 1);
        assert.equal(result.notifications.items.length, 1);
        assert.equal(result.spending.suspended, true);
    }
    finally {
        globalThis.fetch = previousFetch;
        close();
    }
});
