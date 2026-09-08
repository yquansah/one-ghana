import type { SaaSEnv } from './env';
import type { Briefing, NotificationPreferences, Session } from './contracts';
import { requireMutation } from './auth';
import { json, publishedBriefings, reserveSpend, TOPICS } from './research';
export function validatePreferences(x: unknown): NotificationPreferences {
    const p = x as NotificationPreferences;
    if (!p || !['off', 'daily', 'weekly'].includes(p.digest) || typeof p.majorAlerts !== 'boolean' || !Array.isArray(p.topics) || p.topics.length > TOPICS.length || p.topics.some(t => !TOPICS.includes(t)))
        throw new Error('Invalid preferences');
    return { digest: p.digest, majorAlerts: p.majorAlerts, topics: [...new Set(p.topics)] };
}
async function hmac(secret: string, message: string, encoded = false) { const raw = encoded ? Uint8Array.from(atob(secret), c => c.charCodeAt(0)) : new TextEncoder().encode(secret); const key = await crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))))); }
function equal(a: string, b: string) {
    let mismatch = a.length ^ b.length;
    for (let i = 0; i < Math.max(a.length, b.length); i++)
        mismatch |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
    return mismatch === 0;
}
export async function unsubscribeToken(secret: string, id: string) { return encodeURIComponent(await hmac(secret, `unsubscribe:${id}`)); }
export async function verifyWebhook(request: Request, body: string, secret: string, now = Date.now()) {
    const id = request.headers.get('svix-id'), timestamp = request.headers.get('svix-timestamp'), signatures = request.headers.get('svix-signature');
    if (!id || !timestamp || !signatures || !/^\d+$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300)
        return false;
    try {
        const signature = await hmac(secret.replace(/^whsec_/, ''), `${id}.${timestamp}.${body}`, true);
        return signatures.split(' ').some(s => s.startsWith('v1,') && equal(s.slice(3), signature));
    }
    catch {
        return false;
    }
}
export async function handleNotifications(request: Request, env: SaaSEnv, session: Session | null): Promise<Response | null> {
    const url = new URL(request.url), path = url.pathname;
    if (path === '/api/email/unsubscribe' && ['GET', 'POST'].includes(request.method)) {
        if (!env.UNSUBSCRIBE_SECRET)
            return json({ error: 'Unsubscribe not configured' }, 503);
        const id = url.searchParams.get('account') ?? '', token = url.searchParams.get('token') ?? '';
        if (!equal(token, decodeURIComponent(await unsubscribeToken(env.UNSUBSCRIBE_SECRET, id))))
            return json({ error: 'Invalid link' }, 400);
        if (request.method === 'GET')
            return new Response('<!doctype html><title>Unsubscribe</title><form method="post"><p>Stop all One Ghana briefing emails?</p><button>Unsubscribe</button></form>', { headers: { 'Content-Type': 'text/html;charset=utf-8', 'Cache-Control': 'no-store' } });
        await env.DB.prepare("UPDATE notification_preferences SET digest='off',major_alerts=0 WHERE account_id=?").bind(id).run();
        return new Response('You are unsubscribed from One Ghana briefings.');
    }
    if (path === '/api/email/webhook' && request.method === 'POST') {
        if (!env.RESEND_WEBHOOK_SECRET)
            return json({ error: 'Webhook not configured' }, 503);
        const body = await request.text();
        if (body.length > 100000 || !await verifyWebhook(request, body, env.RESEND_WEBHOOK_SECRET))
            return json({ error: 'Invalid signature' }, 401);
        JSON.parse(body);
        await env.DB.prepare('INSERT OR IGNORE INTO email_webhooks(id,received_at,payload) VALUES (?,?,?)').bind(request.headers.get('svix-id'), new Date().toISOString(), body).run();
        await reconcileWebhooks(env);
        return json({ ok: true });
    }
    if (path !== '/api/preferences')
        return null;
    if (!session)
        return json({ error: 'Sign in required' }, 401);
    if (request.method === 'PATCH') {
        requireMutation(request, env, session);
        let p: NotificationPreferences;
        try {
            p = validatePreferences(await request.json());
        }
        catch {
            return json({ error: 'Invalid preferences' }, 400);
        }
        await env.DB.prepare('INSERT INTO notification_preferences(account_id,digest,major_alerts,topics) VALUES (?,?,?,?) ON CONFLICT(account_id) DO UPDATE SET digest=excluded.digest,major_alerts=excluded.major_alerts,topics=excluded.topics').bind(session.user.id, p.digest, Number(p.majorAlerts), JSON.stringify(p.topics)).run();
        return json({ preferences: p });
    }
    if (request.method === 'GET') {
        const p = await env.DB.prepare('SELECT * FROM notification_preferences WHERE account_id=?').bind(session.user.id).first<{
            digest: NotificationPreferences['digest'];
            major_alerts: number;
            topics: string;
        }>();
        return json({ preferences: p ? { digest: p.digest, majorAlerts: !!p.major_alerts, topics: JSON.parse(p.topics) } : { digest: 'off', majorAlerts: false, topics: [] } });
    }
    return null;
}
export function selectBriefings(items: Briefing[], topics: string[], since: number, major = false) {
    return items.filter(b => b.status === 'published' && Date.parse((b as Briefing & {
        releasedAt?: string;
    }).releasedAt ?? b.publishedAt) >= since && (!major || b.major) && (!topics.length || b.topics.some(t => topics.includes(t))));
}
export async function scheduleNotifications(env: SaaSEnv, date = new Date()) {
    if (env.EMAIL_ENABLED !== 'true')
        return;
    const briefings = await publishedBriefings(env), accounts = await env.DB.prepare("SELECT account_id,digest,major_alerts,topics FROM notification_preferences WHERE suppressed=0 AND (digest<>'off' OR major_alerts=1)").all<{
        account_id: string;
        digest: string;
        major_alerts: number;
        topics: string;
    }>();
    for (const p of accounts.results) {
        const topics = JSON.parse(p.topics) as string[];
        const add = async (kind: string, period: string, items: Briefing[]) => {
            if (items.length)
                await env.DB.prepare("INSERT OR IGNORE INTO email_outbox(id,account_id,kind,period,payload,created_at) SELECT ?,?,?,?,?,? WHERE ?<>'major' OR (SELECT COUNT(*) FROM email_outbox WHERE account_id=? AND kind='major' AND created_at>=?)<2").bind(crypto.randomUUID(), p.account_id, kind, period, JSON.stringify(items.map(b => ({ id: b.id, version: b.version }))), date.toISOString(), kind, p.account_id, date.toISOString().slice(0, 10)).run();
        };
        if (date.getUTCHours() === 8 && date.getUTCMinutes() === 0 && (p.digest === 'daily' || p.digest === 'weekly' && date.getUTCDay() === 1))
            await add('digest', date.toISOString().slice(0, 10), selectBriefings(briefings, topics, date.getTime() - (p.digest === 'weekly' ? 7 : 1) * 86400000));
        if (p.major_alerts) {
            const day = date.toISOString().slice(0, 10);
            const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM email_outbox WHERE account_id=? AND kind='major' AND created_at>=?").bind(p.account_id, day).first<{
                n: number;
            }>();
            let slots = 2 - (count?.n ?? 0);
            for (const b of selectBriefings(briefings, topics, date.getTime() - 86400000, true)) {
                if (slots <= 0)
                    break;
                const exists = await env.DB.prepare("SELECT id FROM email_outbox WHERE account_id=? AND kind='major' AND period=?").bind(p.account_id, `${b.id}:${b.version}`).first();
                if (!exists) {
                    await add('major', `${b.id}:${b.version}`, [b]);
                    slots--;
                }
            }
        }
    }
}
export async function dispatchOutbox(env: SaaSEnv) {
    await reconcileWebhooks(env);
    if (env.EMAIL_ENABLED !== 'true')
        return;
    const rows = await env.DB.prepare("SELECT id FROM email_outbox WHERE status='pending' ORDER BY created_at LIMIT 100").all<{
        id: string;
    }>();
    for (const row of rows.results)
        await env.NOTIFICATION_QUEUE.send({ outboxId: row.id });
}
export async function consumeNotifications(batch: MessageBatch<{
    outboxId: string;
}>, env: SaaSEnv) {
    for (const m of batch.messages) {
        try {
            await deliver(env, m.body.outboxId);
            m.ack();
        }
        catch (error) {
            if (!(error instanceof Error && error.message === 'Delivery already in progress'))
            await env.DB.prepare("UPDATE email_outbox SET last_error=?,attempt_count=attempt_count+1,status=CASE WHEN attempt_count>=7 THEN 'failed' ELSE status END WHERE id=? AND status='pending'").bind(error instanceof Error ? error.message : 'Notification delivery failed', m.body.outboxId).run();
            m.retry({ delaySeconds: 60 });
        }
    }
}
async function deliver(env: SaaSEnv, id: string) {
    if (env.EMAIL_ENABLED !== 'true')
        return;
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM || !env.UNSUBSCRIBE_SECRET)
        throw new Error('Email provider configuration incomplete');
    const row = await env.DB.prepare('SELECT o.*,a.email,p.digest,p.major_alerts,p.topics,p.suppressed FROM email_outbox o JOIN accounts a ON a.id=o.account_id JOIN notification_preferences p ON p.account_id=o.account_id WHERE o.id=?').bind(id).first<{
        account_id: string;
        kind: string;
        payload: string;
        status: string;
        email: string;
        digest: string;
        major_alerts: number;
        topics: string;
        suppressed: number;
        attempted_at: string | null;
        send_payload: string | null;
    }>();
    if (!row || row.status !== 'pending')
        return;
    if (row.suppressed || row.kind === 'digest' && row.digest === 'off' || row.kind === 'major' && !row.major_alerts) {
        await env.DB.prepare("UPDATE email_outbox SET status='cancelled' WHERE id=?").bind(id).run();
        return;
    }
    const lease = await env.DB.prepare("UPDATE email_outbox SET lease_until=? WHERE id=? AND status='pending' AND lease_until<?").bind(Date.now() + 60000, id, Date.now()).run();
    if (lease.meta.changes !== 1)
        throw new Error('Delivery already in progress');
    try {
        if (row.attempted_at && Date.now() - Date.parse(row.attempted_at) > 23 * 3600000) {
            await env.DB.prepare("UPDATE email_outbox SET status='needs-review' WHERE id=?").bind(id).run();
            return;
        }
        const refs = JSON.parse(row.payload) as {
            id: string;
            version: number;
        }[], items: Briefing[] = [];
        for (const ref of refs) {
            const b = await env.DB.prepare("SELECT payload FROM briefings WHERE id=? AND version=? AND status='published'").bind(ref.id, ref.version).first<{
                payload: string;
            }>();
            if (b)
                items.push(JSON.parse(b.payload));
        }
        const selected = selectBriefings(items, JSON.parse(row.topics), 0, row.kind === 'major');
        if (!selected.length || (row.send_payload && selected.length !== refs.length)) {
            await env.DB.prepare("UPDATE email_outbox SET status='cancelled' WHERE id=?").bind(id).run();
            return;
        }
        if (!row.attempted_at)
            await reserveSpend(env, 0.01);
        await env.DB.prepare('UPDATE email_outbox SET attempted_at=COALESCE(attempted_at,?) WHERE id=?').bind(new Date().toISOString(), id).run();
        const unsubscribe = `${env.APP_ORIGIN}/api/email/unsubscribe?account=${encodeURIComponent(row.account_id)}&token=${await unsubscribeToken(env.UNSUBSCRIBE_SECRET, row.account_id)}`;
        const text = selected.map(b => `${b.title}\n${b.summary}\nWhy it matters: ${b.implications}\nUncertainty: ${b.uncertainty}\nSource: ${b.sourceUrl}\nBriefing: ${env.APP_ORIGIN}/?briefing=${b.id}`).join('\n\n') + `\n\nUnsubscribe: ${unsubscribe}`;
        const sendPayload = row.send_payload ?? JSON.stringify({ from: env.EMAIL_FROM, to: [row.email], subject: row.kind === 'major' ? 'One Ghana: major development' : 'Your Ghana briefing', text, headers: { 'List-Unsubscribe': `<${unsubscribe}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } });
        await env.DB.prepare('UPDATE email_outbox SET send_payload=COALESCE(send_payload,?) WHERE id=?').bind(sendPayload, id).run();
        const consent = await env.DB.prepare('SELECT digest,major_alerts,suppressed,topics FROM notification_preferences WHERE account_id=?').bind(row.account_id).first<{
            digest: string;
            major_alerts: number;
            suppressed: number;
            topics: string;
        }>();
        if (!consent || consent.suppressed || (row.kind === 'digest' && consent.digest === 'off') || (row.kind === 'major' && !consent.major_alerts) || consent.topics !== row.topics) {
            await env.DB.prepare("UPDATE email_outbox SET status='cancelled' WHERE id=?").bind(id).run();
            return;
        }
        const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `one-ghana/${id}` }, body: sendPayload, signal: AbortSignal.timeout(20000) });
        if (!response.ok)
            throw new Error(`Email provider returned ${response.status}`);
        const result = await response.json() as {
            id: string;
        };
        await env.DB.prepare("UPDATE email_outbox SET status='sent',sent_at=?,provider_id=? WHERE id=?").bind(new Date().toISOString(), result.id, id).run();
        await reconcileWebhooks(env);
    }
    finally {
        await env.DB.prepare('UPDATE email_outbox SET lease_until=0 WHERE id=?').bind(id).run();
    }
}
export async function reconcileWebhooks(env: SaaSEnv) {
    const rows = await env.DB.prepare("SELECT id,payload FROM email_webhooks WHERE status='pending' LIMIT 100").all<{
        id: string;
        payload: string;
    }>();
    for (const row of rows.results) {
        const event = JSON.parse(row.payload) as {
            type: string;
            data?: {
                email_id?: string;
            };
        };
        if (!['email.bounced', 'email.complained'].includes(event.type)) {
            await env.DB.prepare("UPDATE email_webhooks SET status='processed' WHERE id=?").bind(row.id).run();
            continue;
        }
        if (!event.data?.email_id)
            continue;
        const sent = await env.DB.prepare('SELECT account_id FROM email_outbox WHERE provider_id=?').bind(event.data.email_id).first<{
            account_id: string;
        }>();
        if (!sent)
            continue;
        await env.DB.batch([env.DB.prepare('UPDATE notification_preferences SET suppressed=1 WHERE account_id=?').bind(sent.account_id), env.DB.prepare("UPDATE email_webhooks SET status='processed' WHERE id=?").bind(row.id)]);
    }
}
