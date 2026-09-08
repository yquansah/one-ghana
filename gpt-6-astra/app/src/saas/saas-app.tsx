'use client';
/* oxlint-disable next/no-html-link-for-pages -- OAuth endpoints require full browser navigation to the Worker. */
import { useEffect, useState } from 'react';
import { GameShell } from '../ui/game-app';
import { safely, message } from '../ui/use-game';
import { localMigrationFiles, discretionaryBudget } from './local-migration';
import { api } from './client';
import { useCloudGame } from './use-cloud-game';
import type {
  Session,
  Briefing,
  PublishedEvent,
  NotificationPreferences,
} from './contracts';
import type { previewCampaignEvent } from './events';
const button = 'gh-btn gh-btn-secondary';
export default function SaaSApp() {
  const [session, setSession] = useState<Session | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [configured, setConfigured] = useState(false);
  async function refresh() {
    const linked = new URLSearchParams(window.location.search).get('briefing');
    if (linked) {
      try {
        sessionStorage.setItem('one-ghana-linked-briefing', linked);
      } catch {
        /* URL still carries the link when storage is unavailable. */
      }
    }
    setLoading(true);
    try {
      const r = await api<{
        user: Session['user'] | null;
        csrfToken?: string;
        configured: boolean;
      }>('/api/session');
      setConfigured(r.configured);
      setSession(
        r.user && r.csrfToken ? { user: r.user, csrfToken: r.csrfToken } : null,
      );
      setError('');
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
  }, []);
  if (session)
    return (
      <SignedIn
        session={session}
        onExpired={() => {
          setSession(null);
          setError(
            'Your session expired. Sign in again to continue. Your cloud campaign remains saved.',
          );
        }}
        onLogout={async () => {
          await api('/auth/logout', session, {});
          setSession(null);
        }}
      />
    );
  return (
    <div className="gh-app saas-login">
      <main className="gh-panel gh-stack">
        <div className="gh-kicker">ONE GHANA · PUBLIC BETA</div>
        <h1>
          A presidency.
          <br />A country in motion.
        </h1>
        <p>
          Lead a fictional Ghana, explore today’s economic and political
          developments, and carry your campaign across devices.
        </p>
        <p>
          Real-world briefings inform your choices. You choose which approved
          events enter your game.
        </p>
        {error ? (
          <p role="alert" className="gh-alert gh-alert-error">
            {error}
          </p>
        ) : null}
        {loading ? (
          <output>Checking your session…</output>
        ) : configured ? (
          <a className="gh-btn gh-btn-primary" href="/auth/login">
            Sign in with Google
          </a>
        ) : (
          <p role="alert">
            Google sign-in is not configured yet. The operator must connect
            WorkOS before cloud campaigns are available.
          </p>
        )}
        <button
          className={button}
          disabled={loading}
          onClick={() => void refresh()}
        >
          Check connection again
        </button>
        <small>Email briefings are optional and start switched off.</small>
      </main>
    </div>
  );
}
function SignedIn({
  session,
  onExpired,
  onLogout,
}: {
  session: Session;
  onExpired: () => void;
  onLogout: () => Promise<void>;
}) {
  const cloud = useCloudGame(session, onExpired),
    { game, record } = cloud;
  const [tab, setTab] = useState<'game' | 'news' | 'preferences' | 'admin'>(
      'game',
    ),
    [briefings, setBriefings] = useState<Briefing[]>([]),
    [events, setEvents] = useState<PublishedEvent[]>([]),
    [freshness, setFreshness] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
      digest: 'off',
      majorAlerts: false,
      topics: [],
    }),
    [name, setName] = useState('My Ghana presidency');
  const [eventPreview, setEventPreview] = useState<{
    event: PublishedEvent;
    campaignId: string;
    revision: number;
    result: ReturnType<typeof previewCampaignEvent>;
  } | null>(null);
  const [admin, setAdmin] = useState<{
    pending: Briefing[];
    jobs: unknown[];
    spending: {
      month: string;
      spentUsd: number;
      limitUsd: number;
      reservedPlatformUsd?: number;
    };
    notifications?: {
      pending: number;
      needsReview: number;
      failed: number;
      unmatchedWebhooks: number;
      items: unknown[];
    };
    sources: unknown[];
  } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [topicsInput, setTopicsInput] = useState('');
  const [mapping, setMapping] = useState({
    briefingId: '',
    title: '',
    description: '',
    cocoa: '0',
    energy: '0',
    demand: '0',
    assumptions: '',
  });
  const [consented, setConsented] = useState(false);
  const [savedEmail, setSavedEmail] = useState(false);
  async function loadNews() {
    const [news, scenario] = await Promise.all([
      api<{ briefings: Briefing[]; lastSuccessfulResearchAt: string | null }>(
        '/api/briefings',
        session,
      ),
      api<{ events: PublishedEvent[] }>('/api/events', session),
    ]);
    setBriefings(news.briefings);
    setFreshness(news.lastSuccessfulResearchAt);
    setEvents(scenario.events);
    setLoaded(true);
  }
  async function changeTab(next: typeof tab) {
    setTab(next);
    await cloud.task('Loading…', async () => {
      if (next === 'news') await loadNews();
      if (next === 'preferences') {
        const r = await api<{ preferences: NotificationPreferences }>(
          '/api/preferences',
          session,
        );
        setPreferences(r.preferences);
        setTopicsInput(r.preferences.topics.join(', '));
        setConsented(
          r.preferences.digest !== 'off' || r.preferences.majorAlerts,
        );
        setSavedEmail(false);
      }
      if (next === 'admin') setAdmin(await api('/api/admin/research', session));
    });
  }
  useEffect(() => {
    let id = new URLSearchParams(window.location.search).get('briefing');
    try {
      id = id ?? sessionStorage.getItem('one-ghana-linked-briefing');
      sessionStorage.removeItem('one-ghana-linked-briefing');
    } catch {
      /* Browser storage is optional. */
    }
    if (id) {
      queueMicrotask(() => {
        setTab('news');
        safely(
          cloud.task('Opening linked briefing…', async () => {
            await loadNews();
            requestAnimationFrame(() =>
              document.getElementById(`briefing-${id}`)?.scrollIntoView(),
            );
          }),
        );
      });
    }
    // Initial email navigation is consumed once per account mount.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const controls = (
    <div className="gh-app gh-stack">
      <label>
        Campaign name
        <input
          className="saas-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
        />
      </label>
      <button
        className={button}
        disabled={!!game.busy}
        onClick={() => safely(game.startNew(name, 20260904))}
      >
        Create classic campaign
      </button>
      {record ? (
        <>
          <button
            className={button}
            disabled={!!game.busy}
            onClick={() => safely(game.branch(name))}
          >
            Branch current campaign
          </button>
          <button
            className={button}
            disabled={!!game.busy}
            onClick={() => safely(game.exportGame())}
          >
            Export campaign and event history
          </button>
          {record.eventMode === 'classic' ? (
            <button
              className={button}
              disabled={!!game.busy}
              onClick={() => safely(cloud.upgrade())}
            >
              Create branch with current events enabled
            </button>
          ) : (
            <p>
              Current events enabled. Accepted scenarios affect the next quarter
              only.
            </p>
          )}
        </>
      ) : null}
      <label>
        Import JSON backup
        <input
          type="file"
          accept="application/json,.json"
          disabled={!!game.busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              safely(
                cloud
                  .task('Reading backup…', async () => {
                    if (file.size > 10 * 1024 * 1024)
                      throw new Error('Choose a backup smaller than 10 MB.');
                    return file.text();
                  })
                  .then((json) => game.importGame(json)),
              );
            }
            e.target.value = '';
          }}
        />
      </label>
      <button
        className={button}
        disabled={!!game.busy}
        onClick={() =>
          safely(
            cloud
              .task('Reading local save…', async () => {
                return localMigrationFiles('current')[0];
              })
              .then((json) => game.importGame(json)),
          )
        }
      >
        Copy this browser’s local save to account
      </button>
      <small>
        Imports create a separate campaign. The browser copy remains intact.
        Saves from another site must be exported there first.
      </small>
      {record ? (
        <div>
          {confirmDelete ? (
            <>
              <p>
                Delete “{record.state.name}” permanently? Export a backup first
                if you want to retain it.
              </p>
              <button
                className={button}
                disabled={!!game.busy}
                onClick={() =>
                  safely(
                    cloud.deleteCampaign().then(() => setConfirmDelete(false)),
                  )
                }
              >
                Confirm delete
              </button>
              <button
                className={button}
                onClick={() => setConfirmDelete(false)}
              >
                Keep campaign
              </button>
            </>
          ) : (
            <button
              className={button}
              disabled={!!game.busy}
              onClick={() => setConfirmDelete(true)}
            >
              Delete current campaign
            </button>
          )}
        </div>
      ) : null}
      <button
        className={button}
        disabled={!!game.busy}
        onClick={() =>
          safely(
            cloud
              .task('Reading local archives…', async () =>
                localMigrationFiles('archives'),
              )
              .then(async (saves) => {
                if (!saves.length) {
                  game.setError(
                    'No local archives exist on this site. Import backups exported from the original demo.',
                  );
                  return;
                }
                for (const json of saves) await game.importGame(json);
              }),
          )
        }
      >
        Copy this browser’s archived campaigns to account
      </button>
      <h3>Your campaigns</h3>
      {cloud.campaigns.map((c) => (
        <button
          className={button}
          key={c.id}
          disabled={!!game.busy}
          onClick={() => {
            setEventPreview(null);
            safely(cloud.select(c.id));
          }}
        >
          {c.state.name} · turn {c.state.quarter} · {c.eventMode}
          {c.id === record?.id ? ' · current' : ''}
        </button>
      ))}
    </div>
  );
  return (
    <>
      <div className="gh-app saas-account">
        <strong>ONE GHANA</strong>
        <span>{session.user.name || session.user.email}</span>
        <nav aria-label="Account views">
          {(
            [
              'game',
              'news',
              'preferences',
              ...(session.user.role === 'admin' ? ['admin' as const] : []),
            ] as const
          ).map((t) => (
            <button
              key={t}
              className={button}
              aria-current={tab === t ? 'page' : undefined}
              onClick={() => safely(changeTab(t))}
            >
              {t === 'news'
                ? 'Ghana now'
                : t === 'preferences'
                  ? 'Email settings'
                  : t === 'admin'
                    ? 'Research desk'
                    : 'Presidency'}
            </button>
          ))}
        </nav>
        <button
          className={button}
          onClick={() => safely(cloud.task('Signing out…', onLogout))}
        >
          Sign out
        </button>
      </div>
      {cloud.conflict ? (
        <div
          className="gh-app gh-alert gh-alert-error saas-banner"
          role="alert"
        >
          Another device changed this campaign. Your policy draft is preserved.{' '}
          <button
            className={button}
            onClick={() => record && safely(cloud.select(record.id))}
          >
            Load latest saved version
          </button>
        </div>
      ) : null}
      {tab === 'game' ? (
        <GameShell
          game={game}
          cloudControls={controls}
          draftKey={`one-ghana-draft-${session.user.id}`}
        />
      ) : (
        <main className="gh-app saas-page">
          <button className={button} onClick={() => setTab('game')}>
            Back to presidency
          </button>
          {game.error ? (
            <p role="alert" className="gh-alert gh-alert-error">
              {game.error}
            </p>
          ) : null}
          {game.busy ? <output>{game.busy}</output> : null}
          {tab === 'news' ? (
            <>
              <h1>Ghana now</h1>
              <p>
                Real developments. Optional fictional scenarios. Reading these
                briefings never changes your campaign.
              </p>
              <p className="og-small">
                Last successful research:{' '}
                {freshness
                  ? new Date(freshness).toLocaleString()
                  : 'No successful research run yet. Briefings may be unavailable or stale.'}
              </p>
              {loaded && !briefings.length ? (
                <p>
                  No published briefings yet. Check back after the next research
                  run.
                </p>
              ) : null}
              {briefings.map((b) => (
                <article
                  key={`${b.id}-${b.version}`}
                  id={`briefing-${b.id}`}
                  className="gh-panel gh-stack"
                >
                  <div className="gh-kicker">
                    {b.kind} · {b.status} · version {b.version}
                    {b.major ? ' · Major event' : ''}
                  </div>
                  <h2>{b.title}</h2>
                  <p>{b.summary}</p>
                  <p>
                    <strong>Why it matters:</strong> {b.implications}
                  </p>
                  <p>
                    <strong>Uncertainty:</strong> {b.uncertainty}
                  </p>
                  {b.correctionOf ? (
                    <p>
                      This publication corrects an earlier briefing (
                      {b.correctionOf}). Previously accepted game events retain
                      their recorded version.
                    </p>
                  ) : null}
                  <small>
                    Event date: {b.eventDate ?? 'Not established'} ·{' '}
                    {(b as Briefing & { sourcePublishedAt?: string | null })
                      .sourcePublishedAt
                      ? `Source published: ${(b as Briefing & { sourcePublishedAt?: string | null }).sourcePublishedAt}`
                      : `Collected: ${b.publishedAt}`}
                  </small>
                  <a href={b.sourceUrl} target="_blank" rel="noreferrer">
                    Source: {b.sourceName}
                  </a>
                  {events
                    .filter((e) => e.briefingId === b.id)
                    .map((event) => (
                      <div
                        key={`${event.id}-${event.version}`}
                        className="gh-inset"
                      >
                        <h3>{event.title}</h3>
                        <p>{event.description}</p>
                        <p>Model assumptions: {event.assumptions.join(' ')}</p>
                        <button
                          className={button}
                          disabled={
                            !record ||
                            record.eventMode !== 'live' ||
                            !!game.busy ||
                            event.status !== 'published'
                          }
                          onClick={() =>
                            safely(
                              cloud.previewEvent(event).then((result) =>
                                setEventPreview({
                                  event,
                                  result,
                                  campaignId: record!.id,
                                  revision: record!.revision,
                                }),
                              ),
                            )
                          }
                        >
                          Preview next-quarter effect
                        </button>
                        {record?.eventMode === 'classic' ? (
                          <p>
                            Create a current-events branch in Campaign before
                            accepting scenarios.
                          </p>
                        ) : null}
                      </div>
                    ))}
                </article>
              ))}
              {eventPreview ? (
                <section
                  className="gh-panel gh-stack"
                  aria-label="Event preview"
                >
                  <h2>{eventPreview.event.title}: next-quarter scenario</h2>
                  {eventPreview.campaignId !== record?.id ||
                  eventPreview.revision !== record?.revision ? (
                    <p role="alert">
                      The campaign changed. Preview the event again before
                      accepting.
                    </p>
                  ) : null}
                  <p>
                    Difference versus the same campaign without this event;
                    identical external shocks. Illustrative model effects, not a
                    forecast.
                  </p>
                  <dl>
                    {Object.entries(eventPreview.result.delta).map(
                      ([label, value]) => (
                        <div key={label}>
                          <dt>
                            {{
                              gdp: 'GDP (GH₵ bn)',
                              farmerIncome: 'Farmer income (index points)',
                              debt: 'Debt (GH₵ bn)',
                              approval: 'Approval (points)',
                              livingStandards:
                                'Living standards (index points)',
                            }[label] ?? label}
                          </dt>
                          <dd>{value.toFixed(3)}</dd>
                        </div>
                      ),
                    )}
                  </dl>
                  <button
                    className="gh-btn gh-btn-primary"
                    disabled={
                      !!game.busy ||
                      eventPreview.campaignId !== record?.id ||
                      eventPreview.revision !== record?.revision
                    }
                    onClick={() =>
                      safely(
                        cloud
                          .acceptEvent(
                            eventPreview.event.id,
                            eventPreview.event.version,
                          )
                          .then(() => {
                            setEventPreview(null);
                            setTab('game');
                          }),
                      )
                    }
                  >
                    Accept this version for next quarter
                  </button>
                  <button
                    className={button}
                    onClick={() => setEventPreview(null)}
                  >
                    Cancel
                  </button>
                </section>
              ) : null}
              {record?.events.length ? (
                <section className="gh-panel">
                  <h2>Your accepted events</h2>
                  {record.events.map((e) => (
                    <p key={`${e.event.id}-${e.event.version}`}>
                      {e.event.title} · v{e.event.version} ·{' '}
                      {briefings.some(
                        (b) => b.correctionOf === e.event.briefingId,
                      ) ||
                      events.some(
                        (current) =>
                          current.id === e.event.id &&
                          current.status === 'withdrawn',
                      )
                        ? 'Source corrected or scenario withdrawn; your applied history remains unchanged. '
                        : ''}
                      {e.appliedQuarter === null
                        ? `scheduled for turn ${e.scheduledQuarter}`
                        : `applied turn ${e.appliedQuarter}`}
                    </p>
                  ))}
                </section>
              ) : null}
            </>
          ) : tab === 'preferences' ? (
            <section className="gh-panel gh-stack">
              <h1>Email briefings</h1>
              <p>
                Opt in to sourced developments and policy tradeoffs. Digests are
                delivered at 08:00 Ghana time. Empty digests are skipped.
              </p>
              <label>
                Digest frequency
                <select
                  className="saas-input"
                  value={preferences.digest}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      digest: e.target
                        .value as NotificationPreferences['digest'],
                    })
                  }
                >
                  <option value="off">Off — no digests</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={preferences.majorAlerts}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      majorAlerts: e.target.checked,
                    })
                  }
                />{' '}
                I also want reviewed major-event alerts (up to two per day)
              </label>
              <label>
                Topics (comma separated; blank means all)
                <input
                  className="saas-input"
                  value={topicsInput}
                  onChange={(e) => setTopicsInput(e.target.value)}
                />
              </label>
              <button
                className="gh-btn gh-btn-primary"
                disabled={!!game.busy}
                onClick={() =>
                  safely(
                    cloud.task('Saving email choices…', async () => {
                      if (
                        (preferences.digest !== 'off' ||
                          preferences.majorAlerts) &&
                        !consented
                      )
                        throw new Error(
                          'Confirm email consent before enabling notifications.',
                        );
                      const r = await api<{
                        preferences: NotificationPreferences;
                      }>(
                        '/api/preferences',
                        session,
                        {
                          ...preferences,
                          topics: topicsInput
                            .split(',')
                            .map((t) => t.trim())
                            .filter(Boolean),
                        },
                        'PATCH',
                      );
                      setPreferences(r.preferences);
                      setTopicsInput(r.preferences.topics.join(', '));
                      setSavedEmail(true);
                    }),
                  )
                }
              >
                Save email choices
              </button>
              <label>
                <input
                  type="checkbox"
                  checked={consented}
                  onChange={(e) => setConsented(e.target.checked)}
                />{' '}
                I consent to the email choices above.
              </label>
              {savedEmail ? <output>Email preferences saved.</output> : null}
              <p>
                You can unsubscribe from any email. Account information and
                campaigns remain private.
              </p>
            </section>
          ) : (
            <section className="gh-stack">
              <h1>Research desk</h1>
              <button
                className={button}
                disabled={!!game.busy}
                onClick={() =>
                  safely(
                    cloud.task('Starting research recovery run…', async () => {
                      await api('/api/admin/research/run', session, {
                        kind: 'hourly',
                      });
                      setAdmin(await api('/api/admin/research', session));
                    }),
                  )
                }
              >
                Run source checks now
              </button>
              {admin ? (
                <>
                  <p>
                    {admin.spending.month}: $
                    {admin.spending.spentUsd.toFixed(2)} / $
                    {discretionaryBudget(admin.spending).available.toFixed(2)}{' '}
                    discretionary budget after platform reserve. Total
                    configured monthly ceiling: $
                    {admin.spending.limitUsd.toFixed(2)}.
                  </p>
                  {discretionaryBudget(admin.spending).warning ? (
                    <p role="alert" className="gh-alert gh-alert-error">
                      {discretionaryBudget(admin.spending).exhausted
                        ? 'Discretionary budget exhausted. Research and email work are suspended. Review the usage ledger and wait for the monthly reset or explicitly reduce other allocations; gameplay remains available.'
                        : 'At least 80% of the discretionary budget is used. Review research frequency and pending jobs before the allocation is exhausted.'}
                    </p>
                  ) : null}
                  {admin.notifications ? (
                    <section className="gh-inset">
                      <h2>Email delivery health</h2>
                      <p
                        role={
                          admin.notifications.failed ||
                          admin.notifications.needsReview
                            ? 'alert'
                            : undefined
                        }
                      >
                        {admin.notifications.pending} pending ·{' '}
                        {admin.notifications.needsReview} need review ·{' '}
                        {admin.notifications.failed} failed ·{' '}
                        {admin.notifications.unmatchedWebhooks} unmatched
                        delivery webhooks
                      </p>
                      {admin.notifications.failed ||
                      admin.notifications.needsReview ? (
                        <p>
                          Inspect the outbox error and provider delivery logs
                          before retrying. Consent and idempotency remain
                          enforced.
                        </p>
                      ) : null}
                      <details>
                        <summary>Inspect outbox failures</summary>
                        <pre className="saas-json">
                          {JSON.stringify(admin.notifications.items, null, 2)}
                        </pre>
                      </details>
                    </section>
                  ) : null}
                  {admin.pending.length === 0 ? (
                    <p>No briefings awaiting review.</p>
                  ) : null}
                  {admin.pending.map((b) => (
                    <article className="gh-panel gh-stack" key={b.id}>
                      <h2>{b.title}</h2>
                      <p>{b.summary}</p>
                      <p>{b.implications}</p>
                      <p>{b.uncertainty}</p>
                      <a href={b.sourceUrl} target="_blank" rel="noreferrer">
                        Review source
                      </a>
                      <div className="gh-row">
                        {(['approve', 'reject', 'withdraw'] as const).map(
                          (decision) => (
                            <button
                              className={button}
                              disabled={!!game.busy}
                              key={decision}
                              onClick={() =>
                                safely(
                                  cloud.task('Recording review…', async () => {
                                    await api(
                                      `/api/admin/research/${encodeURIComponent(b.id)}`,
                                      session,
                                      { decision, version: b.version },
                                    );
                                    setAdmin(
                                      await api('/api/admin/research', session),
                                    );
                                  }),
                                )
                              }
                            >
                              {decision}
                            </button>
                          ),
                        )}
                        <button
                          className={button}
                          disabled={!!game.busy}
                          onClick={() =>
                            safely(
                              cloud.task('Approving major event…', async () => {
                                await api(
                                  `/api/admin/research/${encodeURIComponent(b.id)}`,
                                  session,
                                  {
                                    decision: 'approve',
                                    major: true,
                                    version: b.version,
                                  },
                                );
                                setAdmin(
                                  await api('/api/admin/research', session),
                                );
                              }),
                            )
                          }
                        >
                          Approve as major event
                        </button>
                      </div>
                    </article>
                  ))}
                  <section className="gh-panel gh-stack">
                    <h2>Approve a bounded game scenario</h2>
                    <p>
                      Only create a scenario after reviewing its published
                      briefing and explicit model assumptions. These are
                      one-quarter fictional effects.
                    </p>
                    {(
                      [
                        'briefingId',
                        'title',
                        'description',
                        'assumptions',
                      ] as const
                    ).map((field) => (
                      <label key={field}>
                        {field}
                        <input
                          className="saas-input"
                          value={mapping[field]}
                          onChange={(e) =>
                            setMapping({ ...mapping, [field]: e.target.value })
                          }
                        />
                      </label>
                    ))}
                    {(
                      [
                        {
                          key: 'cocoa',
                          label: 'Cocoa yield change (%)',
                          bound: 15,
                        },
                        {
                          key: 'energy',
                          label: 'Energy availability change (index points)',
                          bound: 10,
                        },
                        {
                          key: 'demand',
                          label: 'External demand change (%)',
                          bound: 5,
                        },
                      ] as const
                    ).map((f) => (
                      <label key={f.key}>
                        {f.label}
                        <input
                          className="saas-input"
                          type="number"
                          min={-f.bound}
                          max={f.bound}
                          step="0.1"
                          value={mapping[f.key]}
                          onChange={(e) =>
                            setMapping({ ...mapping, [f.key]: e.target.value })
                          }
                        />
                      </label>
                    ))}
                    <button
                      className={button}
                      disabled={!!game.busy}
                      onClick={() =>
                        safely(
                          cloud.task(
                            'Publishing reviewed scenario…',
                            async () => {
                              await api('/api/admin/events', session, {
                                briefingId: mapping.briefingId,
                                title: mapping.title,
                                description: mapping.description,
                                effects: {
                                  cocoaYieldPct: Number(mapping.cocoa),
                                  energyAvailabilityPoints: Number(
                                    mapping.energy,
                                  ),
                                  externalDemandPct: Number(mapping.demand),
                                },
                                assumptions: [mapping.assumptions],
                              });
                              setMapping({
                                ...mapping,
                                title: '',
                                description: '',
                                assumptions: '',
                              });
                              await loadNews();
                            },
                          ),
                        )
                      }
                    >
                      Approve and publish scenario
                    </button>
                    <button
                      className={button}
                      onClick={() =>
                        safely(
                          cloud.task('Loading published scenarios…', loadNews),
                        )
                      }
                    >
                      Load scenarios for withdrawal
                    </button>
                    {events
                      .filter((e) => e.status === 'published')
                      .map((e) => (
                        <div key={`${e.id}-${e.version}`}>
                          <span>
                            {e.title} · v{e.version}
                          </span>
                          <button
                            className={button}
                            disabled={!!game.busy}
                            onClick={() =>
                              safely(
                                cloud.task(
                                  'Withdrawing scenario…',
                                  async () => {
                                    await api(
                                      `/api/admin/events/${encodeURIComponent(e.id)}`,
                                      session,
                                      { decision: 'withdraw' },
                                    );
                                    await loadNews();
                                  },
                                ),
                              )
                            }
                          >
                            Withdraw scenario
                          </button>
                        </div>
                      ))}
                  </section>
                  <section className="gh-panel gh-stack">
                    <h2>Published briefing controls</h2>
                    <button
                      className={button}
                      disabled={!!game.busy}
                      onClick={() =>
                        safely(
                          cloud.task('Loading publication history…', loadNews),
                        )
                      }
                    >
                      Load published briefings
                    </button>
                    {briefings
                      .filter((b) => b.status === 'published')
                      .map((b) => (
                        <div key={`${b.id}-${b.version}`}>
                          <strong>
                            {b.title} · v{b.version}
                          </strong>
                          <button
                            className={button}
                            disabled={!!game.busy}
                            onClick={() =>
                              safely(
                                cloud.task(
                                  'Withdrawing publication…',
                                  async () => {
                                    await api(
                                      `/api/admin/research/${encodeURIComponent(b.id)}`,
                                      session,
                                      {
                                        decision: 'withdraw',
                                        version: b.version,
                                      },
                                    );
                                    await loadNews();
                                  },
                                ),
                              )
                            }
                          >
                            Withdraw briefing
                          </button>
                        </div>
                      ))}
                  </section>
                  <details>
                    <summary>Jobs and source health</summary>
                    <pre className="saas-json">
                      {JSON.stringify(
                        { jobs: admin.jobs, sources: admin.sources },
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                </>
              ) : null}
            </section>
          )}
        </main>
      )}
    </>
  );
}
