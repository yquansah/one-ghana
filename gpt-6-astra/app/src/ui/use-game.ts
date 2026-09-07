'use client';

import { useEffect, useRef, useState } from 'react';
import { branchCampaign } from '../engine';
import type {
  BranchComparison,
  GameState,
  LegacyScenario,
  PolicyPreview,
  PolicyProposal,
} from '../engine';
import { createEngineClient } from '../engine/client';
import {
  archiveCampaign,
  loadArchivedCampaigns,
  loadCampaign,
  removeArchivedCampaign,
  saveCampaign,
} from '../engine/storage';
import { registerGameTools } from '../integration/webmcp';

export type View =
  | 'briefing'
  | 'ghana'
  | 'policies'
  | 'institutions'
  | 'results'
  | 'evidence';
export function useGame() {
  const [state, setState] = useState<GameState | null>(null);
  const [view, setView] = useState<View>('briefing');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saveStatus, setSaveStatus] = useState('Loading campaign…');
  const [preview, setPreview] = useState<PolicyPreview | null>(null);
  const [comparisons, setComparisons] = useState<BranchComparison[]>([]);
  const [legacy, setLegacy] = useState<LegacyScenario[]>([]);
  const [archives, setArchives] = useState<GameState[]>([]);
  const stateRef = useRef<GameState | null>(null);
  const clientRef = useRef<ReturnType<typeof createEngineClient> | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const mounted = useRef(false);

  function current() {
    if (!stateRef.current) throw new Error('The campaign is still loading.');
    return stateRef.current;
  }
  function client() {
    if (!clientRef.current) throw new Error('The simulation is not ready.');
    return clientRef.current;
  }
  function preserveCurrent() {
    if (stateRef.current) {
      archiveCampaign(stateRef.current);
      setArchives(loadArchivedCampaigns());
    }
  }
  function commit(next: GameState) {
    if (!mounted.current) return;
    stateRef.current = next;
    setState(next);
    setPreview(null);
    setComparisons([]);
    setLegacy([]);
    setSaveStatus('Saving…');
    try {
      saveCampaign(next);
      setSaveStatus('Saved on this device');
    } catch (e) {
      setSaveStatus('Couldn’t save — export a backup');
      setError(message(e));
    }
  }
  function task<T>(label: string, run: () => Promise<T>): Promise<T> {
    const result = queue.current.then(async () => {
      if (!mounted.current) throw new Error('The game has closed.');
      setBusy(label);
      setError('');
      setNotice('');
      try {
        return await run();
      } catch (e) {
        if (mounted.current) setError(message(e));
        throw e;
      } finally {
        if (mounted.current) setBusy('');
      }
    });
    queue.current = result.catch(() => {});
    return result;
  }
  function previewPolicy(proposal: PolicyProposal) {
    return task('Calculating scenario…', async () => {
      const result = await client().request('preview', {
        state: current(),
        proposal,
      });
      setPreview(result);
      return result;
    });
  }
  function submit(proposal: PolicyProposal) {
    return task('Considering your proposal…', async () => {
      const next = await client().request('submit', {
        state: current(),
        proposal,
      });
      commit(next);
      const policy = next.activePolicies[next.activePolicies.length - 1];
      setNotice(
        policy.status === 'rejected'
          ? `Proposal rejected. ${policy.delayReason}`
          : 'Proposal approved. Advance the quarter to begin funded implementation.',
      );
      return next;
    });
  }
  function advance() {
    return task('Simulating the next quarter…', async () => {
      const result = await client().request('advance', { state: current() });
      commit(result.state);
      setView('results');
      return result;
    });
  }
  function compare(proposals: PolicyProposal[]) {
    return task('Comparing identical external shocks…', async () => {
      const result = await client().request('compare', {
        state: current(),
        proposals,
        quarters: 8,
      });
      setComparisons(result);
      setView('results');
      return result;
    });
  }
  function runLegacy() {
    return task('Simulating 20 years of legacy…', async () => {
      const result = await client().request('legacy', { state: current() });
      setLegacy(result);
      setView('results');
      return result;
    });
  }
  function startNew(name: string, seed: number) {
    return task('Opening a new presidency…', async () => {
      const next = await client().request('create', { name, seed });
      preserveCurrent();
      commit(next);
      setView('briefing');
      return next;
    });
  }
  function branch(name: string) {
    return task('Creating campaign branch…', async () => {
      const source = current();
      const next = branchCampaign(source, name);
      preserveCurrent();
      commit(next);
      setNotice(
        `Branch “${next.name}” starts at quarter ${source.quarter} with the same external shocks. Restore its source from the campaign archive.`,
      );
      return next;
    });
  }
  function importGame(json: string) {
    return task('Validating campaign file…', async () => {
      const next = await client().request('import', { json });
      preserveCurrent();
      commit(next);
      setView('briefing');
      setNotice(
        'Campaign imported with its original seed, dataset and model version. Your prior campaign is archived.',
      );
      return next;
    });
  }
  function exportGame() {
    return task('Exporting campaign…', async () => {
      const source = current();
      const json = await client().request('export', { state: source });
      download(json, `${source.name}-q${source.quarter}.json`);
      setNotice(
        'Campaign export prepared. Keep this file to restore or compare your presidency.',
      );
      return json;
    });
  }
  function restoreArchive(id: string, quarter: number, name: string) {
    return task('Restoring archived campaign…', async () => {
      const next = loadArchivedCampaigns().find(
        (s) => s.id === id && s.quarter === quarter && s.name === name,
      );
      if (!next)
        throw new Error('This archived campaign is no longer available.');
      preserveCurrent();
      commit(next);
      setView('briefing');
      setNotice(`Restored ${next.name} at completed turn ${next.quarter}.`);
      return next;
    });
  }
  function exportArchive(id: string, quarter: number, name: string) {
    return task('Exporting archive…', async () => {
      const source = loadArchivedCampaigns().find(
        (s) => s.id === id && s.quarter === quarter && s.name === name,
      );
      if (!source)
        throw new Error('This archived campaign is no longer available.');
      const json = await client().request('export', { state: source });
      download(json, `${source.name}-q${source.quarter}.json`);
      return json;
    });
  }
  function deleteArchive(id: string, quarter: number, name: string) {
    return task('Removing archived copy…', async () => {
      removeArchivedCampaign(id, quarter, name);
      setArchives(loadArchivedCampaigns());
    });
  }
  useEffect(() => {
    mounted.current = true;
    const engine = createEngineClient();
    clientRef.current = engine;
    let cancelled = false;
    async function initialize() {
      try {
        const saved = loadCampaign();
        const initial = saved ?? (await engine.request('create', {}));
        if (!cancelled) commit(initial);
      } catch (e) {
        if (!cancelled) {
          setError(
            `Could not load the saved campaign. ${message(e)} Import a valid backup or explicitly start a new campaign.`,
          );
          setSaveStatus('Saved campaign requires attention');
        }
      }
      // An unreadable main save must not prevent recovery from an independent healthy archive.
      if (!cancelled) {
        try {
          setArchives(loadArchivedCampaigns());
        } catch (e) {
          setError((previous) =>
            [previous, message(e)].filter(Boolean).join(' '),
          );
        }
      }
    }
    const initial = initialize();
    queue.current = initial;
    const unregister = registerGameTools(
      {
        // These same UI handlers read state/client/queue refs, so registration has no stale render state.
        read: () => ({ ...concise(current()), simulationMode: client().mode }),
        preview: previewPolicy,
        submit: async (proposal) => concise(await submit(proposal)),
        advance: async () => {
          const result = await advance();
          return {
            campaign: concise(result.state),
            report: {
              title: result.report.title,
              summary: result.report.summary,
              attempted: result.report.attempted,
              implemented: result.report.implemented,
              fiscalExplanation: result.report.fiscalExplanation,
              election: result.report.election,
            },
          };
        },
        compare: async (proposals) =>
          (await compare(proposals)).map(
            ({
              label,
              proposal,
              delta,
              sharedShockSeed,
              quartersSimulated,
              horizonNote,
            }) => ({
              label,
              proposal,
              delta,
              sharedShockSeed,
              quartersSimulated,
              horizonNote,
            }),
          ),
      },
      (text) => {
        if (!cancelled) setNotice(`Game tools unavailable: ${text}`);
      },
    );
    return () => {
      cancelled = true;
      mounted.current = false;
      unregister();
      engine.dispose();
      clientRef.current = null;
    };
  }, []);
  return {
    state,
    view,
    setView,
    busy,
    error,
    setError,
    notice,
    saveStatus,
    preview,
    clearPreview: () => setPreview(null),
    comparisons,
    legacy,
    archives,
    restoreArchive,
    exportArchive,
    deleteArchive,
    previewPolicy,
    submit,
    advance,
    compare,
    runLegacy,
    startNew,
    branch,
    importGame,
    exportGame,
  };
}
function concise(s: GameState) {
  return {
    id: s.id,
    name: s.name,
    quarter: s.quarter,
    year: s.year,
    quarterOfYear: s.quarterOfYear,
    phase: s.phase,
    seed: s.seed,
    datasetVersion: s.datasetVersion,
    modelVersion: s.modelVersion,
    tutorialCompleted: s.tutorialCompleted,
    fiscal: s.fiscal,
    welfare: s.welfare,
    economy: {
      realGDP: s.economy.realGDP,
      cocoaFarmerIncome: s.economy.cocoaFarmerIncome,
      inflation: s.economy.inflation,
      unemployment: s.economy.unemployment,
    },
    governmentApproval: s.institutions.governmentApproval,
    activePolicies: s.activePolicies.map((p) => ({
      id: p.id,
      proposal: p.proposal,
      status: p.status,
      progress: p.progress,
      spent: p.spent,
      delayReason: p.delayReason,
    })),
    election: s.election,
  };
}
export type GameController = ReturnType<typeof useGame>;
export const message = (e: unknown) =>
  e instanceof Error ? e.message : String(e);
export const safely = (promise: Promise<unknown>) => {
  void promise.catch(() => {});
};
function download(json: string, name: string) {
  const url = URL.createObjectURL(
    new Blob([json], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = name.replace(/[^a-zA-Z0-9_.-]/g, '-');
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
