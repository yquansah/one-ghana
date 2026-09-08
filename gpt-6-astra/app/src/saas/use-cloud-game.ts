'use client';
import { useEffect, useRef, useState } from 'react';
import type {
  PolicyProposal,
  PolicyPreview,
  BranchComparison,
  LegacyScenario,
  TurnReport,
} from '../engine';
import { createEngineClient } from '../engine/client';
import { registerGameTools } from '../integration/webmcp';
import type { GameController, View } from '../ui/use-game';
import { message } from '../ui/use-game';
import { api, ApiError, downloadJson } from './client';
import type {
  CampaignRecord,
  Session,
  PublishedEvent,
  Briefing,
} from './contracts';
import { eventSchedule, previewCampaignEvent } from './events';
export function useCloudGame(session: Session, onExpired: () => void) {
  const [record, setRecord] = useState<CampaignRecord | null>(null),
    [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [view, setView] = useState<View>('briefing'),
    [busy, setBusy] = useState(''),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [preview, setPreview] = useState<PolicyPreview | null>(null),
    [comparisons, setComparisons] = useState<BranchComparison[]>([]),
    [legacy, setLegacy] = useState<LegacyScenario[]>([]);
  const ref = useRef<CampaignRecord | null>(null),
    queue = useRef<Promise<unknown>>(Promise.resolve()),
    engine = useRef<ReturnType<typeof createEngineClient> | null>(null);
  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  const [conflict, setConflict] = useState(false);
  const pending = useRef<{ signature: string; key: string } | null>(null);
  function current() {
    if (!ref.current) throw new Error('Choose or create a campaign first.');
    return ref.current;
  }
  const mounted = useRef(false);
  const generation = useRef(0);
  function commit(c: CampaignRecord) {
    if (!mounted.current) return;
    ref.current = c;
    setRecord(c);
    setCampaigns((old) => [c, ...old.filter((x) => x.id !== c.id)]);
    setPreview(null);
    setComparisons([]);
    setLegacy([]);
    setConflict(false);
  }
  function task<T>(label: string, run: () => Promise<T>): Promise<T> {
    const result = queue.current.then(async () => {
      if (!mounted.current) throw new Error('The account session has closed.');
      setBusy(label);
      setError('');
      try {
        return await run();
      } catch (e) {
        if (!mounted.current) throw e;
        if (e instanceof ApiError) {
          if (e.status === 401) onExpired();
          if (e.status === 409) setConflict(true);
        }
        setError(message(e));
        throw e;
      } finally {
        if (mounted.current) setBusy('');
      }
    });
    queue.current = result.catch(() => {});
    return result;
  }
  async function refresh() {
    const epoch = generation.current;
    const result = await api<{ campaigns: CampaignRecord[] }>(
      '/api/campaigns',
      sessionRef.current,
    );
    if (mounted.current && epoch === generation.current)
      setCampaigns(result.campaigns);
    return result.campaigns;
  }
  function key(body: unknown) {
    const signature = JSON.stringify(body);
    if (pending.current?.signature !== signature)
      pending.current = { signature, key: crypto.randomUUID() };
    return pending.current.key;
  }
  async function mutate(action: string, extra: Record<string, unknown> = {}) {
    const c = current(),
      body = { expectedRevision: c.revision, action, ...extra };
    const result = await api<{ campaign: CampaignRecord; report?: TurnReport }>(
      `/api/campaigns/${encodeURIComponent(c.id)}/actions`,
      sessionRef.current,
      { ...body, idempotencyKey: key({ id: c.id, ...body }) },
    );
    pending.current = null;
    commit(result.campaign);
    return result;
  }
  const submit = (proposal: PolicyProposal) =>
    task('Saving policy…', async () => {
      const result = await mutate('submit', { proposal });
      return result.campaign.state;
    });
  const advance = () =>
    task('Advancing and saving quarter…', async () => {
      const r = await mutate('advance');
      setView('results');
      if (!r.report)
        throw new Error(
          'The saved turn is missing its report. Reload the campaign.',
        );
      return { state: r.campaign.state, report: r.report };
    });
  const previewPolicy = (proposal: PolicyProposal) =>
    task('Previewing policy…', async () => {
      const c = current();
      const r = await engine.current!.request('preview', {
        state: c.state,
        proposal,
        externalSchedule: eventSchedule(c),
      });
      setPreview(r);
      return r;
    });
  const compare = (proposals: PolicyProposal[]) =>
    task('Comparing identical events and shocks…', async () => {
      const c = current();
      const r = await engine.current!.request('compare', {
        state: c.state,
        proposals,
        quarters: 8,
        externalSchedule: eventSchedule(c),
      });
      setComparisons(r);
      setView('results');
      return r;
    });
  const runLegacy = () =>
    task('Exploring legacy…', async () => {
      const r = await engine.current!.request('legacy', {
        state: current().state,
      });
      setLegacy(r);
      setView('results');
      return r;
    });
  const create = (body: Record<string, unknown>) =>
    task('Saving new campaign…', async () => {
      const r = await api<{ campaign: CampaignRecord }>(
        '/api/campaigns',
        sessionRef.current,
        { ...body, idempotencyKey: key(body) },
      );
      pending.current = null;
      commit(r.campaign);
      setView('briefing');
      return r.campaign.state;
    });
  const branch = (name: string) =>
    task(
      'Creating branch…',
      async () => (await mutate('branch', { name })).campaign.state,
    );
  const upgrade = () =>
    task(
      'Creating live-event branch…',
      async () =>
        (
          await mutate('upgrade', {
            name: `${current().state.name} · Ghana now`,
          })
        ).campaign.state,
    );
  const exportGame = () =>
    task('Exporting campaign…', async () => {
      const c = current();
      const r = await fetch(
        `/api/campaigns/${encodeURIComponent(c.id)}/export`,
        { credentials: 'same-origin' },
      );
      if (!r.ok)
        throw new ApiError(
          'Export failed. Sign in again if your session has expired.',
          r.status,
        );
      const json = await r.text();
      downloadJson(json, `${c.state.name}.json`);
      return json;
    });
  const select = (id: string) =>
    task('Loading campaign…', async () => {
      const r = await api<{ campaign: CampaignRecord }>(
        `/api/campaigns/${encodeURIComponent(id)}`,
        sessionRef.current,
      );
      commit(r.campaign);
      setNotice(
        'Loaded the latest saved version. Your policy draft is preserved.',
      );
      return r.campaign.state;
    });
  const deleteCampaign = () =>
    task('Deleting campaign…', async () => {
      const c = current();
      const body = { expectedRevision: c.revision };
      await api(
        `/api/campaigns/${encodeURIComponent(c.id)}`,
        sessionRef.current,
        { ...body, idempotencyKey: key({ delete: c.id, ...body }) },
        'DELETE',
      );
      pending.current = null;
      ref.current = null;
      setRecord(null);
      setPreview(null);
      setComparisons([]);
      setLegacy([]);
      const remaining = await refresh();
      if (remaining[0]) commit(remaining[0]);
    });
  const acceptEvent = (eventId: string, eventVersion: number) =>
    task(
      'Accepting scenario…',
      async () =>
        (await mutate('accept-event', { eventId, eventVersion })).campaign,
    );
  const previewEvent = (event: PublishedEvent) =>
    task('Previewing event…', async () =>
      previewCampaignEvent(current(), event),
    );
  // Registration intentionally lasts for one authenticated mount; handlers read current campaign and session refs.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    mounted.current = true;
    generation.current++;
    let cancelled = false;
    const client = createEngineClient();
    engine.current = client;
    const initializing = refresh()
      .then((cs) => {
        if (!cancelled && cs[0]) commit(cs[0]);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(message(e));
        if (e instanceof ApiError && e.status === 401) onExpired();
      });
    queue.current = initializing;
    const unregister = registerGameTools(
      {
        read: () => current(),
        preview: previewPolicy,
        submit,
        advance,
        compare,
        briefings: () =>
          api<{ briefings: Briefing[] }>('/api/briefings', sessionRef.current),
        previewEvent: async (id, version) => {
          const r = await api<{ events: PublishedEvent[] }>(
            '/api/events',
            sessionRef.current,
          );
          const event = r.events.find(
            (e) => e.id === id && e.version === version,
          );
          if (!event) throw new Error('This event version is unavailable.');
          return previewEvent(event);
        },
        acceptEvent,
      },
      setError,
    );
    return () => {
      cancelled = true;
      mounted.current = false;
      unregister();
      client.dispose();
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const game: GameController = {
    state: record?.state ?? null,
    view,
    setView,
    busy,
    error,
    setError,
    notice,
    saveStatus: busy ? 'Working…' : 'Saved to your account',
    preview,
    clearPreview: () => setPreview(null),
    comparisons,
    legacy,
    archives: [],
    restoreArchive: async () => {
      throw new Error('Use cloud campaign selection.');
    },
    exportArchive: async () => {
      throw new Error('Select the campaign before exporting.');
    },
    deleteArchive: async () => {
      throw new Error('Cloud campaigns are managed separately.');
    },
    previewPolicy,
    submit,
    advance,
    compare,
    runLegacy,
    startNew: (name, seed) => create({ name, seed }),
    branch,
    importGame: (json) => create({ importJson: json }),
    exportGame,
  };
  return {
    game,
    record,
    campaigns,
    select,
    upgrade,
    acceptEvent,
    previewEvent,
    conflict,
    deleteCampaign,
    refresh,
    task,
  };
}
