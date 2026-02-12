import { ApiClient, ApiResponse } from './api-client';
import { CONFIG } from '@/services/config';
import { gmFetch } from './http';
import { log } from '@/utils/common';

export interface BangumiSubject {
  id: number;
  name: string;
  name_cn?: string;
  type: number;
  date?: string;
  images?: {
    large?: string;
    common?: string;
    medium?: string;
    small?: string;
    grid?: string;
  };
  score?: number;
  rank?: number;
}

export class BangumiService extends ApiClient {
  constructor() {
    super('Bangumi');
  }

  async search(query: string): Promise<ApiResponse<BangumiSubject | null>> {
    const apiKey = CONFIG.bangumi.apiKey;

    if (!apiKey) {
      log('[Bangumi] Token not configured');
      return {
        data: null,
        meta: { error: 'Token not configured', source: this.name, timestamp: new Date().toISOString() },
      };
    }

    const cacheKey = this.buildCacheKey('search', query);
    const config = CONFIG.bangumi;

    return this.request<BangumiSubject | null>({
      requestFn: async () => {
        const url = `${config.baseUrl}/search/subjects`;

        log(`[Bangumi] Searching anime: ${query}`);

        const response = await gmFetch({
          method: 'POST',
          url: url,
          responseType: 'json',
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });

        if (response.status === 200) {
          const data = JSON.parse(response.responseText);

          if (data && data.data && data.data.length > 0) {
            const subject: BangumiSubject = data.data[0];
            log(`[Bangumi] Found: ${subject.name}`);
            return subject;
          }
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        log('[Bangumi] No results found');
        return null;
      },
      cacheKey,
      cacheTTL: 1440,
      useCache: true,
      useQueue: true,
    });
  }

  protected determineTTL(data: any, defaultTTL: number): number {
    return data ? defaultTTL : 60;
  }
}

export const bangumiService = new BangumiService();
