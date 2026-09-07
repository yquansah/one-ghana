import { executeEngineAction } from './protocol';
import type { EngineAction, EnginePayloads, EngineResults } from './protocol';
export type { EngineAction, EnginePayloads, EngineResults } from './protocol';
export function createEngineClient() {
  let worker: Worker | null = null,
    sequence = 0,
    disposed = false;
  const pending = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >();
  if (typeof Worker !== 'undefined')
    try {
      worker = new Worker(new URL('./worker.ts', import.meta.url), {
        type: 'module',
      });
    } catch {
      worker = null;
    }
  if (worker) {
    worker.onmessage = (
      event: MessageEvent<{
        id: number;
        ok: boolean;
        result: unknown;
        error?: string;
      }>,
    ) => {
      const task = pending.get(event.data.id);
      if (!task) return;
      pending.delete(event.data.id);
      if (event.data.ok) task.resolve(event.data.result);
      else task.reject(new Error(event.data.error ?? 'Simulation failed.'));
    };
    worker.onerror = () => {
      for (const task of pending.values())
        task.reject(
          new Error(
            'The simulation worker stopped unexpectedly. Reload your saved campaign.',
          ),
        );
      pending.clear();
      worker?.terminate();
      worker = null;
    };
  }
  return {
    get mode(): 'worker' | 'fallback' {
      return worker ? 'worker' : 'fallback';
    },
    request<A extends EngineAction>(
      action: A,
      payload: EnginePayloads[A],
    ): Promise<EngineResults[A]> {
      if (disposed)
        return Promise.reject(new Error('Engine client has been disposed.'));
      if (!worker)
        return Promise.resolve().then(() =>
          executeEngineAction(action, payload),
        );
      const id = ++sequence;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
        try {
          worker!.postMessage({ id, action, payload });
        } catch (error) {
          pending.delete(id);
          reject(
            error instanceof Error
              ? error
              : new Error('Could not send simulation request.'),
          );
        }
      });
    },
    dispose() {
      disposed = true;
      worker?.terminate();
      for (const task of pending.values())
        task.reject(new Error('Engine client was disposed.'));
      pending.clear();
    },
  };
}
