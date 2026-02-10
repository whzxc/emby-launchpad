import { cache, CacheManager } from './cache-manager';
import { requestQueue, RequestQueue } from './request-queue';
import { Utils } from '../utils';

/**
 * API 请求选项
 */
export interface RequestOptions<T = any> {
  requestFn: () => Promise<T>;
  cacheKey?: string;
  cacheTTL?: number;
  useCache?: boolean;
  useQueue?: boolean;
  priority?: number;
}

/**
 * API 响应包装
 */
export interface ApiResponse<T> {
  data: T;
  meta: {
    cached?: boolean;
    source?: string;
    timestamp?: string;
    error?: string;
    note?: string;
  };
}

/**
 * API 客户端抽象基类
 * 提供统一的缓存、队列和错误处理机制
 */
export abstract class ApiClient {
  protected name: string;
  protected cache: CacheManager;
  protected queue: RequestQueue;

  constructor(name: string) {
    this.name = name;
    this.cache = cache;
    this.queue = requestQueue;
  }

  /**
   * 发起请求(带缓存和队列支持)
   * @param options - 请求选项
   * @returns API 响应
   */
  protected async request<T>(options: RequestOptions<T>): Promise<ApiResponse<T>> {
    const {
      requestFn,
      cacheKey,
      cacheTTL = 1440,
      useCache = true,
      useQueue = true,
      priority = 0
    } = options;

    // 1. 尝试从缓存获取
    if (useCache && cacheKey) {
      const cached = this.cache.get<T>(cacheKey);
      if (cached !== undefined) {
        Utils.log(`[${this.name}] Cache hit: ${cacheKey}`);
        return {
          data: cached,
          meta: {
            cached: true,
            source: this.name,
            timestamp: new Date().toISOString()
          }
        };
      }
    }

    // 2. 执行请求(可能通过队列)
    try {
      let result: T;

      if (useQueue) {
        result = await this.queue.enqueue(requestFn, {
          key: cacheKey,
          priority
        });
      } else {
        result = await requestFn();
      }

      // 3. 处理响应
      const processedData = await this.handleResponse<T>(result);

      // 4. 缓存结果
      if (useCache && cacheKey) {
        const ttl = this.determineTTL(processedData, cacheTTL);
        this.cache.set(cacheKey, processedData, ttl);
      }

      return {
        data: processedData,
        meta: {
          cached: false,
          source: this.name,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error: any) {
      Utils.log(`[${this.name}] Request failed:`, error);

      // 错误情况下,短时间缓存空结果
      if (useCache && cacheKey) {
        this.cache.set(cacheKey, null as any, 5); // 5分钟
      }

      return {
        data: null as any,
        meta: {
          error: error.message || String(error),
          source: this.name,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * 处理响应数据
   * 子类可覆盖此方法以自定义响应处理
   * @param response - 原始响应
   * @returns 处理后的数据
   */
  protected async handleResponse<T>(response: any): Promise<T> {
    return response;
  }

  /**
   * 根据数据质量动态确定 TTL
   * 子类可覆盖此方法以实现自定义策略
   * @param data - 响应数据
   * @param defaultTTL - 默认 TTL
   * @returns 最终 TTL
   */
  protected determineTTL(data: any, defaultTTL: number): number {
    // 成功数据:使用默认 TTL
    if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
      return defaultTTL;
    }

    // 空数据:缩短 TTL
    return Math.min(defaultTTL, 60);
  }

  /**
   * 构建缓存键
   * @param parts - 键的各个部分
   * @returns 缓存键
   */
  protected buildCacheKey(...parts: (string | number)[]): string {
    return `${this.name.toLowerCase()}_${parts.filter(Boolean).join('_')}`;
  }
}
