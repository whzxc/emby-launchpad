import { ApiClient, ApiResponse } from '@/core/api-client';
import { CONFIG } from '@/core/api-config';
import { Utils } from '@/utils';
import { MediaType } from '@/types/tmdb';

export interface Nullbr115Item {
  title: string;
  size: string;
  share_link: string;
  resolution?: string | null;
  quality?: string | null;
  season_list?: string[] | null;
}

export interface NullbrMagnetItem {
  name: string;
  size: string;
  magnet: string;
  resolution?: string | null;
  source?: string | null;
  quality?: string | string[] | null;
  zh_sub?: number;
}

export interface Nullbr115Response {
  '115': Nullbr115Item[];
  id: number;
  page: number;
  total_page: number;
  media_type: string;
}

export interface NullbrMagnetResponse {
  id: number;
  media_type: string;
  season_number?: number;
  magnet: NullbrMagnetItem[];
}

export interface NullbrResources {
  items115: Nullbr115Item[];
  magnets: NullbrMagnetItem[];
  hasData: boolean;
}

class NullbrService extends ApiClient {
  constructor() {
    super('Nullbr');
  }

  isConfigured(): boolean {
    return !!(CONFIG.nullbr.appId && CONFIG.nullbr.apiKey);
  }

  async get115Resources(tmdbId: number, mediaType: MediaType): Promise<ApiResponse<Nullbr115Item[]>> {
    if (!this.isConfigured()) {
      return {
        data: [],
        meta: { error: 'Nullbr API not configured', source: this.name, timestamp: new Date().toISOString() },
      };
    }

    const cacheKey = this.buildCacheKey('115', mediaType, tmdbId);
    const url = `${CONFIG.nullbr.baseUrl}/${mediaType}/${tmdbId}/115`;

    return this.request<Nullbr115Item[]>({
      requestFn: async () => {
        Utils.log(`[Nullbr] Fetching 115 resources: ${mediaType}/${tmdbId}`);

        const response = await GM.xmlHttpRequest({
          method: 'GET',
          url: url,
          responseType: 'json',
          headers: this.getHeaders(),
        });

        if (response.status === 200) {
          const data: Nullbr115Response = JSON.parse(response.responseText);
          return data['115'] || [];
        } else if (response.status === 404) {
          return []; // 未找到资源
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      },
      cacheKey,
      cacheTTL: CONFIG.nullbr.cacheTTL,
      useCache: true,
      useQueue: true,
    });
  }

  async getMagnetResources(tmdbId: number, mediaType: MediaType, seasonNumber?: number): Promise<ApiResponse<NullbrMagnetItem[]>> {
    if (!this.isConfigured()) {
      return {
        data: [],
        meta: { error: 'Nullbr API not configured', source: this.name, timestamp: new Date().toISOString() },
      };
    }

    let url: string;
    let cacheKey: string;

    if (mediaType === 'movie') {
      url = `${CONFIG.nullbr.baseUrl}/movie/${tmdbId}/magnet`;
      cacheKey = this.buildCacheKey('magnet', 'movie', tmdbId);
    } else {
      const season = seasonNumber || 1;
      url = `${CONFIG.nullbr.baseUrl}/tv/${tmdbId}/season/${season}/magnet`;
      cacheKey = this.buildCacheKey('magnet', 'tv', tmdbId, season);
    }

    return this.request<NullbrMagnetItem[]>({
      requestFn: async () => {
        Utils.log(`[Nullbr] Fetching magnet resources: ${url}`);

        const response = await new Promise<any>((resolve, reject) => {
          GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            headers: this.getHeaders(),
            onload: (r: any) => resolve(r),
            onerror: (e: any) => reject(e),
          });
        });

        if (response.status === 200) {
          const data: NullbrMagnetResponse = JSON.parse(response.responseText);
          return data.magnet || [];
        } else if (response.status === 404) {
          return []; // 未找到资源
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      },
      cacheKey,
      cacheTTL: CONFIG.nullbr.cacheTTL,
      useCache: true,
      useQueue: true,
    });
  }

  async getAllResources(tmdbId: number, mediaType: MediaType): Promise<NullbrResources> {
    const [res115, resMagnet] = await Promise.all([
      this.get115Resources(tmdbId, mediaType),
      this.getMagnetResources(tmdbId, mediaType),
    ]);

    const items115 = res115.data || [];
    const magnets = resMagnet.data || [];

    return {
      items115,
      magnets,
      hasData: items115.length > 0 || magnets.length > 0,
    };
  }

  protected determineTTL(data: any, defaultTTL: number): number {
    if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
      return defaultTTL;
    }
    return 1440; // 1天
  }

  private getHeaders(): Record<string, string> {
    return {
      'X-APP-ID': CONFIG.nullbr.appId || '',
      'X-API-KEY': CONFIG.nullbr.apiKey || '',
    };
  }
}

export const nullbrService = new NullbrService();
