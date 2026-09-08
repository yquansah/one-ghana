import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { allowedSource, budgetLimits } from '../../cloud/research';
import { validatePreferences, verifyWebhook, unsubscribeToken, selectBriefings } from '../../cloud/notifications';
import type { Briefing } from '../../cloud/contracts';
void test('research allowlist rejects credentials, redirects to attacker and alternate schemes', () => {
    assert.equal(allowedSource('https://www.bog.gov.gh/news/'), true);
    for (const u of ['http://www.bog.gov.gh/news/', 'https://www.bog.gov.gh.evil.test/', 'https://user@www.bog.gov.gh/', 'https://127.0.0.1/'])
        assert.equal(allowedSource(u), false);
});
void test('budget caps configured ceiling at250 and reserves platform costs', () => {
    assert.deepEqual(budgetLimits({}), { limit: 250, reserve: 75, discretionary: 175 });
    assert.equal(budgetLimits({ MONTHLY_BUDGET_USD: '999' }).limit, 250);
    assert.throws(() => budgetLimits({ FIXED_COST_RESERVE_USD: '251' }));
    assert.throws(() => budgetLimits({ MONTHLY_BUDGET_USD: 'NaN' }));
});
void test('preferences are opt in and reject unsupported consent values', () => {
    assert.deepEqual(validatePreferences({ digest: 'off', majorAlerts: false, topics: [] }), { digest: 'off', majorAlerts: false, topics: [] });
    assert.throws(() => validatePreferences({ digest: 'daily', majorAlerts: 'yes', topics: [] }));
    assert.throws(() => validatePreferences({ digest: 'daily', majorAlerts: true, topics: ['unknown'] }));
});
void test('Svix webhook verifies body and timestamp and rejects forged signature', async () => {
    const secret = Buffer.from('test-webhook-secret').toString('base64'), body = '{"type":"email.bounced"}', timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac('sha256', Buffer.from(secret, 'base64')).update(`id1.${timestamp}.${body}`).digest('base64');
    const request = new Request('https://example.test', { headers: { 'svix-id': 'id1', 'svix-timestamp': timestamp, 'svix-signature': `v1,${signature}` } });
    assert.equal(await verifyWebhook(request, body, `whsec_${secret}`), true);
    assert.equal(await verifyWebhook(request, body + ' ', `whsec_${secret}`), false);
    assert.equal(await verifyWebhook(request, body, `whsec_${secret}`, Date.now() + 600000), false);
    assert.notEqual(await unsubscribeToken('secret', 'account1'), await unsubscribeToken('secret', 'account2'));
});
void test('digest selection excludes withdrawn, irrelevant and stale briefings', () => {
    const b = { status: 'published', publishedAt: '2026-09-08', topics: ['cocoa'], major: true } as Briefing;
    assert.equal(selectBriefings([b, { ...b, status: 'withdrawn' }, { ...b, topics: ['health'] }], ['cocoa'], Date.parse('2026-09-07'), true).length, 1);
    assert.equal(selectBriefings([b], [], Date.parse('2026-09-09')).length, 0);
});
void test('automatic publication requires recent publisher date, exact supported claims and no politics', async () => {
    const { canAutoPublish, validateExtraction, sourcePublicationDate, discoveryLinks } = await import('../../cloud/research');
    const text = 'Cocoa production increased by 2% in August.';
    const extraction = { title: 'Cocoa', summary: text, kind: 'official-data', eventDate: '2026-09-07', publicationDate: '2026-09-08', topics: ['cocoa'], implications: 'Compare policy options.', uncertainty: 'Provisional', supportQuote: text, political: false };
    const verified = validateExtraction(extraction, text), source = { name: 'Ghana Cocoa Board', url: 'https://cocobod.gh/news', official: true };
    assert.equal(canAutoPublish(source, verified, '2026-09-08', Date.parse('2026-09-08T08:00Z')), true);
    assert.equal(canAutoPublish(source, verified, null), false);
    assert.equal(canAutoPublish(source, { ...verified, political: true }, '2026-09-08'), false);
    assert.equal(canAutoPublish(source, { ...verified, publicationDate: '2026-01-01' }, '2026-01-01'), false);
    assert.throws(() => validateExtraction({ ...extraction, supportQuote: 'Invented production claim' }, text));
    assert.equal(sourcePublicationDate('<meta property="article:published_time" content="2026-09-08T00:00:00Z">'), '2026-09-08');
    assert.deepEqual(discoveryLinks('<a href="/about">About</a><a href="/news/cocoa-update">Story</a><a href="https://evil.test/news/attack">Bad</a>', 'https://cocobod.gh/news'), ['https://cocobod.gh/news/cocoa-update']);
});
