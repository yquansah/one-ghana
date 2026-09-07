import { executeEngineAction } from './protocol';
import type { EngineAction, EnginePayloads } from './protocol';
const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage: (value: unknown) => void;
};
scope.onmessage = (
  event: MessageEvent<{
    id: number;
    action: EngineAction;
    payload: EnginePayloads[EngineAction];
  }>,
) => {
  const { id, action, payload } = event.data;
  try {
    scope.postMessage({
      id,
      ok: true,
      result: executeEngineAction(action, payload),
    });
  } catch (error) {
    scope.postMessage({
      id,
      ok: false,
      error:
        error instanceof Error ? error.message : 'Simulation action failed.',
    });
  }
};
