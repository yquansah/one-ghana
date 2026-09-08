import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestDB } from './sqlite';
import { handleCampaigns, readBody } from '../../cloud/campaigns';
import type { SaaSEnv } from '../../cloud/env';
import type { Session, CampaignRecord } from '../../cloud/contracts';
import { createCampaign } from '../../src/engine';
const origin = 'https://ghana.example';
function setup() {
  const database = createTestDB();
  for (const id of ['a', 'b'])
    database.sqlite
      .prepare('INSERT INTO accounts VALUES(?,?,?,?,?,?)')
      .run(id, 'workos-' + id, id + '@example.com', id, 'player', 'now');
  const env = { DB: database.db, APP_ORIGIN: origin } as SaaSEnv;
  const session: Session = {
    user: { id: 'a', email: 'a@example.com', name: 'A', role: 'player' },
    csrfToken: 'csrf',
  };
  async function call(
    path: string,
    body?: unknown,
    who = session,
    method = body ? 'POST' : 'GET',
  ) {
    return handleCampaigns(
      new Request(origin + '/api/campaigns' + path, {
        method,
        headers: {
          Origin: origin,
          'X-One-Ghana-CSRF': who.csrfToken,
          'Content-Type': 'application/json',
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
      env,
      who,
    );
  }
  return { ...database, env, session, call };
}
async function campaign(response: Response | null) {
  return ((await response!.json()) as { campaign: CampaignRecord }).campaign;
}
void test('cloud actions are owned, deterministic, revision-checked and idempotent', async () => {
  const db = setup();
  try {
    const initial = await campaign(
      await db.call('', {
        name: 'Cloud',
        seed: 42,
        idempotencyKey: 'create-0001',
      }),
    );
    assert.equal(initial.state.seed, 42);
    const body = {
      expectedRevision: 1,
      idempotencyKey: 'advance-0001',
      action: 'advance',
    };
    const next = await campaign(
      await db.call('/' + initial.id + '/actions', body),
    );
    assert.equal(next.state.quarter, 1);
    assert.equal(next.revision, 2);
    assert.deepEqual(
      await campaign(await db.call('/' + initial.id + '/actions', body)),
      next,
    );
    await assert.rejects(
      db.call('/' + initial.id + '/actions', {
        ...body,
        idempotencyKey: 'advance-0002',
      }),
      /another device/,
    );
    await assert.rejects(
      db.call('/' + initial.id + '/actions', { ...body, action: 'branch' }),
      /different request/,
    );
    const other = { ...db.session, user: { ...db.session.user, id: 'b' } };
    await assert.rejects(
      db.call('/' + initial.id, undefined, other),
      /not found/,
    );
    assert.deepEqual(await (await db.call('', undefined, other))!.json(), {
      campaigns: [],
    });
    await assert.rejects(
      db.call('/' + initial.id + '/actions', {
        expectedRevision: 2,
        idempotencyKey: 'invalid-0001',
        action: 'submit',
        proposal: { policyId: 'constructor' },
      }),
      /proposal|policy/i,
    );
  } finally {
    db.close();
  }
});
void test('classic import preserves model and results; upgrade and branch retain original; cloud envelope exports', async () => {
  const db = setup();
  try {
    const state = createCampaign({ seed: 9, name: 'Imported' });
    const original = await campaign(
      await db.call('', {
        importJson: JSON.stringify(state),
        idempotencyKey: 'import-0001',
      }),
    );
    assert.deepEqual(original.state, state);
    assert.equal(original.eventMode, 'classic');
    const upgraded = await campaign(
      await db.call('/' + original.id + '/actions', {
        expectedRevision: 1,
        idempotencyKey: 'upgrade-0001',
        action: 'upgrade',
      }),
    );
    assert.equal(upgraded.eventMode, 'live');
    assert.equal(upgraded.state.modelVersion, original.state.modelVersion);
    assert.notEqual(upgraded.id, original.id);
    assert.deepEqual(
      await campaign(await db.call('/' + original.id)),
      original,
    );
    const exported = await (await db.call(
      '/' + upgraded.id + '/export',
    ))!.text();
    const restored = await campaign(
      await db.call('', {
        importJson: exported,
        idempotencyKey: 'import-0002',
      }),
    );
    assert.deepEqual(restored.state, upgraded.state);
    assert.deepEqual(restored.events, []);
    assert.equal(restored.eventMode, 'live');
  } finally {
    db.close();
  }
});
void test('delete retries are safe and do not expose other owners', async () => {
  const db = setup();
  try {
    const saved = await campaign(
      await db.call('', { idempotencyKey: 'create-0001' }),
    );
    const body = { expectedRevision: 1, idempotencyKey: 'delete-0001' };
    assert.deepEqual(
      await (await db.call('/' + saved.id, body, db.session, 'DELETE'))!.json(),
      { ok: true },
    );
    assert.deepEqual(
      await (await db.call('/' + saved.id, body, db.session, 'DELETE'))!.json(),
      { ok: true },
    );
    await assert.rejects(db.call('/' + saved.id), /not found/);
  } finally {
    db.close();
  }
});
void test('D1 batch rolls back all statements on duplicate idempotency key', async () => {
  const db = setup();
  try {
    await db.call('', { idempotencyKey: 'create-0001' });
    const before = db.sqlite
      .prepare('SELECT count(*) AS n FROM campaigns')
      .get()!.n;
    await assert.rejects(
      db.env.DB.batch([
        db.env.DB.prepare("DELETE FROM campaigns WHERE account_id='a'"),
        db.env.DB.prepare(
          "INSERT INTO campaign_operations VALUES('a','create-0001','bad','{}','now')",
        ),
      ]),
    );
    assert.equal(
      db.sqlite.prepare('SELECT count(*) AS n FROM campaigns').get()!.n,
      before,
    );
  } finally {
    db.close();
  }
});
void test('bounded JSON reader rejects arrays and oversized streaming bodies', async () => {
  await assert.rejects(
    readBody(
      new Request(origin, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '[]',
      }),
    ),
    /object/,
  );
  await assert.rejects(
    readBody(
      new Request(origin, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'x'.repeat(3_000_001),
      }),
    ),
    /large/,
  );
});

void test('reviewed live events apply once; withdrawn history imports but forged effects fail', async () => {
  const db = setup();
  try {
    const event = {
      id: 'event-1',
      version: 1,
      briefingId: 'brief-1',
      title: 'Cocoa harvest',
      description: 'Reviewed scenario',
      sourceUrl: 'https://www.bog.gov.gh/news',
      eventDate: '2026-09-08',
      publishedAt: '2026-09-08T10:00:00Z',
      mappingVersion: 1,
      effects: { cocoaYieldPct: 2 },
      assumptions: ['Teaching assumption'],
      status: 'published',
    };
    db.sqlite
      .prepare('INSERT INTO published_events VALUES(?,?,?,?,?)')
      .run(event.id, 1, event.briefingId, JSON.stringify(event), 'published');
    const base = await campaign(
      await db.call('', { idempotencyKey: 'create-event-1' }),
    );
    await assert.rejects(
      db.call('/' + base.id + '/actions', {
        action: 'accept-event',
        expectedRevision: 1,
        idempotencyKey: 'accept-classic',
        eventId: event.id,
        eventVersion: 1,
      }),
      /live-event branch/,
    );
    const live = await campaign(
      await db.call('/' + base.id + '/actions', {
        action: 'upgrade',
        expectedRevision: 1,
        idempotencyKey: 'upgrade-event-1',
      }),
    );
    const accepted = await campaign(
      await db.call('/' + live.id + '/actions', {
        action: 'accept-event',
        expectedRevision: 1,
        idempotencyKey: 'accept-event-1',
        eventId: event.id,
        eventVersion: 1,
      }),
    );
    assert.equal(accepted.state.quarter, 0);
    assert.equal(accepted.events[0].appliedQuarter, null);
    const advanced = await campaign(
      await db.call('/' + live.id + '/actions', {
        action: 'advance',
        expectedRevision: 2,
        idempotencyKey: 'advance-event-1',
      }),
    );
    assert.equal(advanced.events[0].appliedQuarter, 1);
    await assert.rejects(
      db.call('/' + live.id + '/actions', {
        action: 'accept-event',
        expectedRevision: 3,
        idempotencyKey: 'accept-event-again',
        eventId: event.id,
        eventVersion: 1,
      }),
      /already accepted/,
    );
    const exported = await (await db.call('/' + live.id + '/export'))!.text();
    db.sqlite
      .prepare("UPDATE published_events SET status='withdrawn' WHERE id=?")
      .run(event.id);
    const restored = await campaign(
      await db.call('', {
        importJson: exported,
        idempotencyKey: 'restore-history',
      }),
    );
    assert.deepEqual(restored.events, advanced.events);
    const forged = JSON.parse(exported);
    forged.events[0].event.effects.cocoaYieldPct = 10;
    await assert.rejects(
      db.call('', {
        importJson: JSON.stringify(forged),
        idempotencyKey: 'forged-history',
      }),
      /unknown or modified/,
    );
  } finally {
    db.close();
  }
});
