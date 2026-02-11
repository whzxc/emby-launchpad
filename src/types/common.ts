
export interface LogEntry {
  time: string;
  step: string;
  data: unknown;
  status?: string;
}

export interface ParsedTitle {
  title: string;
  group?: string;
  resolution?: string;
  subtitle?: string;
  format?: string;
  season?: string;
  episode?: string;
}

export type MediaType = 'movie' | 'tv';

export interface TmdbInfo {
  id: number;
  mediaType: MediaType;
}

export interface DotOptions {
  posterContainer?: HTMLElement;
  titleElement?: HTMLElement;
}
