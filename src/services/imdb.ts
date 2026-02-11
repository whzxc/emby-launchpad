import { ApiClient, ApiResponse } from '@/core/api-client';
import { CONFIG } from '@/core/api-config';
import { Utils } from '@/utils';

export interface ImdbAggregateRating {
  '@type': string;
  ratingCount: number;
  bestRating: number;
  worstRating: number;
  ratingValue: number;
}

export interface ImdbData {
  '@context': string;
  '@type': string;
  url: string;
  name: string;
  image?: string;
  description?: string;
  aggregateRating?: ImdbAggregateRating;
  contentRating?: string;
  genre?: string | string[];
  datePublished?: string;
  keywords?: string;
}

export class ImdbService extends ApiClient {
  constructor() {
    super('IMDB');
  }

  async getRating(imdbId: string): Promise<ApiResponse<ImdbData | null>> {
    const cacheKey = this.buildCacheKey('rating', imdbId);
    const config = CONFIG.imdb;

    return this.request<ImdbData | null>({
      requestFn: async () => {
        const url = `${config.baseUrl}/title/${imdbId}/`;

        Utils.log(`[IMDB] Fetching rating for: ${imdbId}`);

        const doc = await Utils.getDoc(url);

        const jsonLd = doc.querySelector('script[type="application/ld+json"]');

        if (jsonLd && jsonLd.textContent) {
          const data: ImdbData = JSON.parse(jsonLd.textContent);

          if (data.aggregateRating) {
            Utils.log(`[IMDB] Rating: ${data.aggregateRating.ratingValue}/10`);
            return data;
          }
        }

        Utils.log('[IMDB] No rating found');
        return null;
      },
      cacheKey,
      cacheTTL: config.cacheTTL as number, // 7天,IMDB评分变化较慢
      useCache: true,
      useQueue: true,
      priority: 1 // IMDB 优先级较低
    });
  }

  protected determineTTL(data: any, defaultTTL: number): number {
    return defaultTTL;
  }
}

export const imdbService = new ImdbService();
