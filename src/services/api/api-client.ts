import { cache, CacheManager } from '@/services/cache';
import { requestQueue, RequestQueue } from '@/services/request-queue';
import { log } from '@/utils/common';

export interface RequestOptions<T = any> {
  requestFn: () => Promise<T>;
  cacheKey?: string;
  cacheTTL?: number;
  useCache?: boolean;
  useQueue?: boolean;
  priority?: number;
}

export interface ApiResponse<T> {
  data: T;
  meta: {
    cached?: boolean;
    source?: string;
    timestamp?: string;
    error?: string;
    note?: string;
    url?: string;
    method?: string;
    body?: unknown;
  };
}

export abstract class ApiClient {
  protected name: string;
  protected cache: CacheManager;
  protected queue: RequestQueue;

  constructor(name: string) {
    this.name = name;
    this.cache = cache;
    this.queue = requestQueue;
  }

  protected async request<T>(options: RequestOptions<T>): Promise<ApiResponse<T>> {
    const {
      requestFn,
      cacheKey,
      cacheTTL = 1440,
      useCache = true,
      useQueue = true,
      priority = 0,
    } = options;

    if (useCache && cacheKey) {
      const cached = this.cache.get<T>(cacheKey);
      if (cached !== undefined) {
        log(`[${this.name}] Cache hit: ${cacheKey}`);
        return {
          data: cached,
          meta: {
            cached: true,
            source: this.name,
            timestamp: new Date().toISOString(),
          },
        };
      }
    }

    try {
      let result: T;

      if (useQueue) {
        result = await this.queue.enqueue(requestFn, {
          key: cacheKey,
          priority,
        });
      } else {
        result = await requestFn();
      }

      const processedData = await this.handleResponse<T>(result);

      if (useCache && cacheKey) {
        const ttl = this.determineTTL(processedData, cacheTTL);
        this.cache.set(cacheKey, processedData, ttl);
      }

      return {
        data: processedData,
        meta: {
          cached: false,
          source: this.name,
          timestamp: new Date().toISOString(),
        },
      };

    } catch (error: any) {
      log(`[${this.name}] Request failed:`, error);

      if (useCache && cacheKey) {
        this.cache.set(cacheKey, null as any, 5);
      }

      return {
        data: null as any,
        meta: {
          error: error.message || String(error),
          source: this.name,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  protected async handleResponse<T>(response: any): Promise<T> {
    return response;
  }

  protected determineTTL(data: any, defaultTTL: number): number {
    if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
      return defaultTTL;
    }

    return Math.min(defaultTTL, 60);
  }

  protected buildCacheKey(...parts: (string | number)[]): string {
    return `${this.name.toLowerCase()}_${parts.filter(Boolean).join('_')}`;
  }
}
