import { ApiClient, ApiResponse } from '@/core/api-client';
import { CONFIG } from '@/core/api-config';
import { Utils } from '@/utils';

export interface TmdbSearchResult {
  id: number;
  media_type: 'movie' | 'tv';
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  poster_path?: string | null;
  overview?: string;
}

export interface TmdbMovieDetails {
  id: number;
  title: string;
  release_date: string;
  runtime?: number;
  genres?: Array<{ id: number; name: string }>;
  vote_average?: number;
  overview?: string;
}

export interface TmdbTvDetails {
  id: number;
  name: string;
  first_air_date: string;
  number_of_seasons?: number;
  genres?: Array<{ id: number; name: string }>;
  vote_average?: number;
  overview?: string;
}

export class TmdbService extends ApiClient {
  constructor() {
    super('TMDB');
  }

  async search(
    query: string,
    year: string = '',
    type: 'movie' | 'tv' | null = null
  ): Promise<ApiResponse<TmdbSearchResult[]>> {
    if (!CONFIG.tmdb.apiKey) {
      Utils.log('[TMDB] API Key missing');
      return {
        data: [],
        meta: { error: 'API Key not configured', source: this.name, timestamp: new Date().toISOString() }
      };
    }

    const cacheKey = this.buildCacheKey('search', query, year, type || '');
    const config = CONFIG.tmdb;

    return this.request<TmdbSearchResult[]>({
      requestFn: async () => {
        const params = new URLSearchParams({
          api_key: config.apiKey!,
          query: query,
          language: config.language as string || 'zh-CN',
          include_adult: 'false'
        });

        const url = `${config.baseUrl}/search/multi?${params.toString()}`;

        Utils.log(`[TMDB] Searching: ${query}${year ? ` (${year})` : ''}${type ? ` [${type}]` : ''}`);

        const data = await Utils.getJSON(url);

        let results: TmdbSearchResult[] = [];

        if (data.results && data.results.length > 0) {
          results = data.results.filter((item: TmdbSearchResult) => {
            const matchType = item.media_type === 'movie' || item.media_type === 'tv';
            if (type && matchType) {
              return item.media_type === type;
            }
            return matchType;
          });

          if (year) {
            results.sort((a, b) => {
              const dateA = a.release_date || a.first_air_date || '';
              const dateB = b.release_date || b.first_air_date || '';
              const yearA = dateA.split('-')[0];
              const yearB = dateB.split('-')[0];

              const scoreA = yearA === year ? 1 : 0;
              const scoreB = yearB === year ? 1 : 0;

              return scoreB - scoreA;
            });
          }
        }

        Utils.log(`[TMDB] Found ${results.length} results`);
        return results;
      },
      cacheKey,
      cacheTTL: 1440, // 24小时
      useCache: true,
      useQueue: true,
      priority: type ? 5 : 0 // 有类型的搜索优先级更高
    });
  }

  async getDetails(
    id: number,
    type: 'movie' | 'tv'
  ): Promise<ApiResponse<TmdbMovieDetails | TmdbTvDetails>> {
    if (!CONFIG.tmdb.apiKey) {
      return {
        data: null as any,
        meta: { error: 'API Key not configured', source: this.name, timestamp: new Date().toISOString() }
      };
    }

    const cacheKey = this.buildCacheKey('details', id, type);
    const config = CONFIG.tmdb;

    return this.request<TmdbMovieDetails | TmdbTvDetails>({
      requestFn: async () => {
        const params = new URLSearchParams({
          api_key: config.apiKey!,
          language: config.language as string || 'zh-CN'
        });

        const url = `${config.baseUrl}/${type}/${id}?${params.toString()}`;

        Utils.log(`[TMDB] Fetching ${type} details: ${id}`);
        return await Utils.getJSON(url);
      },
      cacheKey,
      cacheTTL: 2880, // 48小时,详情数据更稳定
      useCache: true,
      useQueue: true
    });
  }

  protected determineTTL(data: any, defaultTTL: number): number {
    if (Array.isArray(data)) {
      return data.length > 0 ? defaultTTL : 60;
    }
    return defaultTTL;
  }
}

export const tmdbService = new TmdbService();
