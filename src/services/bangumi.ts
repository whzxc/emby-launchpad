import { ApiClient, ApiResponse } from '@/core/api-client';
import { CONFIG } from '@/core/api-config';
import { Utils } from '@/utils';

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
      Utils.log('[Bangumi] Token not configured');
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
        const body = {
          keyword: query,
          filter: { type: [2] }, // 2 = Anime
        };

        Utils.log(`[Bangumi] Searching anime: ${query}`);

        const response = await new Promise<any>((resolve, reject) => {
          GM_xmlhttpRequest({
            method: 'POST',
            url: url,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
              'User-Agent': 'Mozilla/5.0',
            },
            data: JSON.stringify(body),
            onload: (r: any) => resolve(r),
            onerror: (e: any) => reject(e),
          });
        });

        if (response.status === 200) {
          const data = JSON.parse(response.responseText);

          if (data && data.data && data.data.length > 0) {
            const subject: BangumiSubject = data.data[0]; // 返回第一个结果
            Utils.log(`[Bangumi] Found: ${subject.name}`);
            return subject;
          }
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        Utils.log('[Bangumi] No results found');
        return null;
      },
      cacheKey,
      cacheTTL: 1440, // 24小时
      useCache: true,
      useQueue: true,
    });
  }

  protected determineTTL(data: any, defaultTTL: number): number {
    return data ? defaultTTL : 60;
  }
}

export const bangumiService = new BangumiService();
