import type { GameState } from '../engine/types';
export interface Account { id: string; email: string; name: string; role: 'player' | 'admin' }
export interface Session { user: Account; csrfToken: string }
export interface EventEffects { cocoaYieldPct?: number; energyAvailabilityPoints?: number; externalDemandPct?: number }
export interface PublishedEvent {
  id: string; version: number; briefingId: string; title: string; description: string;
  sourceUrl: string; eventDate: string | null; publishedAt: string; mappingVersion: 1;
  effects: EventEffects; assumptions: string[]; status: 'published' | 'withdrawn';
}
export interface CampaignEvent {
  event: PublishedEvent; acceptedAt: string; scheduledQuarter: number; appliedQuarter: number | null;
}
export interface CampaignRecord {
  id: string; revision: number; state: GameState; eventMode: 'classic' | 'live';
  events: CampaignEvent[]; createdAt: string; updatedAt: string;
}
export interface CampaignExport { format: 'one-ghana-cloud'; version: 1; state: GameState; eventMode: 'classic' | 'live'; events: CampaignEvent[] }
export interface Briefing {
  /** Verified source metadata; null means publication date is unknown. */
  sourcePublishedAt?: string | null;
  releasedAt?: string | null;
  id: string; version: number; title: string; summary: string;
  kind: 'official-data' | 'announcement' | 'analysis'; status: 'pending' | 'published' | 'withdrawn';
  sourceUrl: string; sourceName: string; publishedAt: string; eventDate: string | null;
  topics: string[]; implications: string; uncertainty: string; major: boolean; correctionOf: string | null;
}
export interface NotificationPreferences { digest: 'off' | 'daily' | 'weekly'; majorAlerts: boolean; topics: string[] }
