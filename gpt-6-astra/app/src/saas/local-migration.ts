import { loadCampaign, loadArchivedCampaigns } from '../engine/storage';
import { serializeCampaign } from '../engine/validation';
/** Read-only preparation: validate all selected saves before starting cloud uploads. */
export function localMigrationFiles(kind: 'current' | 'archives'): string[] {
  if (kind === 'archives')
    return loadArchivedCampaigns().map(serializeCampaign);
  const saved = loadCampaign();
  if (!saved)
    throw new Error(
      'No local campaign exists on this origin. Export a JSON backup from the original demo, then import it here.',
    );
  return [serializeCampaign(saved)];
}
export function discretionaryBudget(spending: {
  spentUsd: number;
  limitUsd: number;
  reservedPlatformUsd?: number;
}) {
  const available = Math.max(
    0,
    spending.limitUsd - (spending.reservedPlatformUsd ?? 0),
  );
  return {
    available,
    exhausted: spending.spentUsd >= available,
    warning: spending.spentUsd >= available * 0.8,
  };
}
