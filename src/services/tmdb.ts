import { ApiClient, ApiResponse } from '@/core/api-client';
import { CONFIG } from '@/core/api-config';
import { MediaType, MovieDetails, TvShowDetails, Movie, TV } from '@/types/tmdb';

export class TmdbService extends ApiClient {
  constructor() {
    super('TMDB');
  }

  async searchMovie(
    query: string,
    year: string = '',
  ): Promise<ApiResponse<Movie[]>> {
    if (!CONFIG.tmdb.apiKey) {
      return {
        data: [],
        meta: { error: 'API Key not configured', source: this.name, timestamp: new Date().toISOString() },
      };
    }

    const cacheKey = this.buildCacheKey('search', 'movie', query, year);
    const config = CONFIG.tmdb;

    return this.request<Movie[]>({
      requestFn: async () => {
        const params = new URLSearchParams({
          api_key: config.apiKey!,
          query: query,
          language: config.language as string || 'zh-CN',
          include_adult: 'false',
        });

        if (year) {
          params.append('primary_release_year', year);
        }

        const url = `${config.baseUrl}/search/movie?${params.toString()}`;

        const response = await GM.xmlHttpRequest({ url, responseType: 'json' });
        const data = response.response;

        let results: Movie[] = [];

        if (data.results && data.results.length > 0) {
          results = data.results;
          // The API handles primary_release_year, so manual sorting/filtering might not be strictly necessary if the API works as expected,
          // but keeping a client-side sort if exact match is preferred could be useful. 
          // However, for now, let's trust the API's 'primary_release_year' param which is more efficient.
          // If the user previously did manual sorting, I'll trust the API param 'primary_release_year' is sufficient for 'year' filtering.
        }

        return results;
      },
      cacheKey,
      cacheTTL: 1440, // 24 hours
      useCache: true,
      useQueue: true,
      priority: 5,
    });
  }

  async searchTv(
    query: string,
    year: string = '',
  ): Promise<ApiResponse<TV[]>> {
    if (!CONFIG.tmdb.apiKey) {
      return {
        data: [],
        meta: { error: 'API Key not configured', source: this.name, timestamp: new Date().toISOString() },
      };
    }

    const cacheKey = this.buildCacheKey('search', 'tv', query, year);
    const config = CONFIG.tmdb;

    return this.request<TV[]>({
      requestFn: async () => {
        const params = new URLSearchParams({
          api_key: config.apiKey!,
          query: query,
          language: config.language as string || 'zh-CN',
          include_adult: 'false',
        });

        if (year) {
          params.append('first_air_date_year', year);
        }

        const url = `${config.baseUrl}/search/tv?${params.toString()}`;

        const response = await GM.xmlHttpRequest({ url, responseType: 'json' });
        const data = response.response;

        return data.results || [];
      },
      cacheKey,
      cacheTTL: 1440,
      useCache: true,
      useQueue: true,
      priority: 5,
    });
  }

  async getMovieDetails(id: number): Promise<ApiResponse<MovieDetails>> {
    return this.getDetailsBase<MovieDetails>(id, 'movie');
  }

  async getTvDetails(id: number): Promise<ApiResponse<TvShowDetails>> {
    return this.getDetailsBase<TvShowDetails>(id, 'tv');
  }

  private async getDetailsBase<T>(
    id: number,
    type: MediaType,
  ): Promise<ApiResponse<T>> {
    if (!CONFIG.tmdb.apiKey) {
      return {
        data: null as any,
        meta: { error: 'API Key not configured', source: this.name, timestamp: new Date().toISOString() },
      };
    }

    const cacheKey = this.buildCacheKey('details', type, id);
    const config = CONFIG.tmdb;

    return this.request<T>({
      requestFn: async () => {
        const params = new URLSearchParams({
          api_key: config.apiKey!,
          language: config.language as string || 'zh-CN',
        });

        const url = `${config.baseUrl}/${type}/${id}?${params.toString()}`;

        const response = await GM.xmlHttpRequest({ url, responseType: 'json' });
        return response.response;
      },
      cacheKey,
      cacheTTL: 2880, // 48 hours
      useCache: true,
      useQueue: true,
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
