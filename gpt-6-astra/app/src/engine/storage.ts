import { deserializeCampaign, serializeCampaign } from './validation';
import type { GameState } from './types';
export const SAVE_KEY = 'one-ghana:campaign:v1';
export function saveCampaign(state: GameState): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SAVE_KEY, serializeCampaign(state));
  } catch (error) {
    throw new Error(
      'Automatic save failed. Export your campaign to preserve it. ' +
        (error instanceof Error ? error.message : ''),
    );
  }
}
export function loadCampaign(): GameState | null {
  if (typeof localStorage === 'undefined') return null;
  const json = localStorage.getItem(SAVE_KEY);
  return json === null ? null : deserializeCampaign(json);
}
export function clearSavedCampaign(): void {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(SAVE_KEY);
}
export const ARCHIVE_KEY = 'one-ghana:campaign-archive:v1';
export const MAX_ARCHIVED_CAMPAIGNS = 12;
/** Validate each snapshot; a corrupt archive is retained rather than silently overwritten. */
export function loadArchivedCampaigns(): GameState[] {
  if (typeof localStorage === 'undefined') return [];
  const json = localStorage.getItem(ARCHIVE_KEY);
  if (json === null) return [];
  let items: unknown;
  try {
    items = JSON.parse(json);
  } catch {
    throw new Error(
      'Campaign archive is damaged. Export the current campaign before resetting browser storage.',
    );
  }
  if (!Array.isArray(items) || items.length > MAX_ARCHIVED_CAMPAIGNS)
    throw new Error('Campaign archive has an unsupported format.');
  return items.map((item) => deserializeCampaign(JSON.stringify(item)));
}
export function archiveCampaign(state: GameState): void {
  if (typeof localStorage === 'undefined') return;
  // Complete validation before mutating storage; original autosave is not touched here.
  const snapshot = deserializeCampaign(serializeCampaign(state)),
    items = loadArchivedCampaigns();
  const existing = items.findIndex(
    (item) =>
      item.id === state.id &&
      item.name === state.name &&
      item.quarter === state.quarter,
  );
  if (existing >= 0) items[existing] = snapshot;
  else {
    if (items.length >= MAX_ARCHIVED_CAMPAIGNS)
      throw new Error(
        'The campaign archive is full (12 snapshots). Export and remove an archived campaign before creating another branch.',
      );
    items.unshift(snapshot);
  }
  try {
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(items));
  } catch {
    throw new Error(
      'The campaign archive could not be saved. Export the current campaign before continuing.',
    );
  }
}
export function removeArchivedCampaign(
  id: string,
  quarter?: number,
  name?: string,
): void {
  if (typeof localStorage === 'undefined') return;
  const items = loadArchivedCampaigns().filter(
    (s) =>
      !(
        s.id === id &&
        (quarter === undefined || s.quarter === quarter) &&
        (name === undefined || s.name === name)
      ),
  );
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(items));
}
