import { ApiClient, ApiResponse } from '../core/api-client';
import { CONFIG } from '../core/api-config';
import { Utils } from '../utils';

/**
 * 115 网盘分享资源
 */
export interface Nuller115Item {
  title: string;
  size: string;
  share_link: string;
  resolution?: string | null;
  quality?: string | null;
  season_list?: string[] | null;
}

/**
 * 磁力资源
 */
export interface NullerMagnetItem {
  name: string;
  size: string;
  magnet: string;
  resolution?: string | null;
  source?: string | null;
  quality?: string | string[] | null;
  zh_sub?: number;
}

/**
 * 115 资源响应
 */
export interface Nuller115Response {
  '115': Nuller115Item[];
  id: number;
  page: number;
  total_page: number;
  media_type: string;
}

/**
 * 磁力资源响应
 */
export interface NullerMagnetResponse {
  id: number;
  media_type: string;
  season_number?: number;
  magnet: NullerMagnetItem[];
}

/**
 * Nuller 资源汇总
 */
export interface NullerResources {
  items115: Nuller115Item[];
  magnets: NullerMagnetItem[];
  hasData: boolean;
}

/**
 * Nuller API 服务
 * 提供 115 网盘分享和磁力资源检索
 */
class NullerService extends ApiClient {
  constructor() {
    super('Nuller');
  }

  /**
   * 检查配置是否有效
   */
  isConfigured(): boolean {
    return !!(CONFIG.nuller.appId && CONFIG.nuller.apiKey);
  }

  /**
   * 获取请求 Headers
   */
  private getHeaders(): Record<string, string> {
    return {
      'X-APP-ID': CONFIG.nuller.appId || '',
      'X-API-KEY': CONFIG.nuller.apiKey || ''
    };
  }

  /**
   * 获取 115 网盘分享资源
   */
  async get115Resources(tmdbId: number, mediaType: 'movie' | 'tv'): Promise<ApiResponse<Nuller115Item[]>> {
    if (!this.isConfigured()) {
      return {
        data: [],
        meta: { error: 'Nuller API not configured', source: this.name, timestamp: new Date().toISOString() }
      };
    }

    const cacheKey = this.buildCacheKey('115', mediaType, tmdbId);
    const url = `${CONFIG.nuller.baseUrl}/${mediaType}/${tmdbId}/115`;

    return this.request<Nuller115Item[]>({
      requestFn: async () => {
        Utils.log(`[Nuller] Fetching 115 resources: ${mediaType}/${tmdbId}`);

        const response = await new Promise<any>((resolve, reject) => {
          GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            headers: this.getHeaders(),
            onload: (r) => resolve(r),
            onerror: (e) => reject(e)
          });
        });

        if (response.status === 200) {
          const data: Nuller115Response = JSON.parse(response.responseText);
          return data['115'] || [];
        } else if (response.status === 404) {
          return []; // 未找到资源
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      },
      cacheKey,
      cacheTTL: CONFIG.nuller.cacheTTL,
      useCache: true,
      useQueue: true
    });
  }

  /**
   * 获取磁力资源
   */
  async getMagnetResources(tmdbId: number, mediaType: 'movie' | 'tv', seasonNumber?: number): Promise<ApiResponse<NullerMagnetItem[]>> {
    if (!this.isConfigured()) {
      return {
        data: [],
        meta: { error: 'Nuller API not configured', source: this.name, timestamp: new Date().toISOString() }
      };
    }

    let url: string;
    let cacheKey: string;

    if (mediaType === 'movie') {
      url = `${CONFIG.nuller.baseUrl}/movie/${tmdbId}/magnet`;
      cacheKey = this.buildCacheKey('magnet', 'movie', tmdbId);
    } else {
      // TV: 默认获取第一季
      const season = seasonNumber || 1;
      url = `${CONFIG.nuller.baseUrl}/tv/${tmdbId}/season/${season}/magnet`;
      cacheKey = this.buildCacheKey('magnet', 'tv', tmdbId, season);
    }

    return this.request<NullerMagnetItem[]>({
      requestFn: async () => {
        Utils.log(`[Nuller] Fetching magnet resources: ${url}`);

        const response = await new Promise<any>((resolve, reject) => {
          GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            headers: this.getHeaders(),
            onload: (r) => resolve(r),
            onerror: (e) => reject(e)
          });
        });

        if (response.status === 200) {
          const data: NullerMagnetResponse = JSON.parse(response.responseText);
          return data.magnet || [];
        } else if (response.status === 404) {
          return []; // 未找到资源
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      },
      cacheKey,
      cacheTTL: CONFIG.nuller.cacheTTL,
      useCache: true,
      useQueue: true
    });
  }

  /**
   * 获取所有资源（115 + 磁力）
   */
  async getAllResources(tmdbId: number, mediaType: 'movie' | 'tv'): Promise<NullerResources> {
    const [res115, resMagnet] = await Promise.all([
      this.get115Resources(tmdbId, mediaType),
      this.getMagnetResources(tmdbId, mediaType)
    ]);

    const items115 = res115.data || [];
    const magnets = resMagnet.data || [];

    return {
      items115,
      magnets,
      hasData: items115.length > 0 || magnets.length > 0
    };
  }

  /**
   * 动态缓存时长
   */
  protected determineTTL(data: any, defaultTTL: number): number {
    // 有结果: 7天, 无结果: 1天
    if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
      return defaultTTL;
    }
    return 1440; // 1天
  }
}

// 导出单例实例
export const nullerService = new NullerService();
