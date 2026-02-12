/**
 * Shared types used across components and adapters.
 */
import type { MediaType } from '@/types/tmdb';

export interface LogEntry {
  time: string;
  step: string;
  data?: unknown;
  status?: string;
}

export interface TmdbInfo {
  id: number;
  mediaType: MediaType;
}

export interface LogDataWithMeta {
  meta?: { method?: string; url?: string; body?: unknown };
  response?: unknown;
}
