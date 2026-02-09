/**
 * API 服务配置接口
 */
interface ServiceConfig {
  apiKey?: string;
  baseUrl?: string;
  server?: string;
  cacheTTL?: number;
  [key: string]: any;
}

/**
 * 配置变更监听器
 */
type ConfigListener = (service: string, config: ServiceConfig) => void;

/**
 * API 配置中心
 * 统一管理所有 API Keys、URLs 和服务配置
 */
export class ApiConfig {
  private listeners: ConfigListener[] = [];

  // TMDB 配置
  readonly tmdb: ServiceConfig = {
    apiKey: GM_getValue('tmdb_api_key', ''),
    baseUrl: 'https://api.themoviedb.org/3',
    language: 'zh-CN',
    cacheTTL: 1440
  };

  // Emby 配置
  readonly emby: ServiceConfig = {
    server: GM_getValue('emby_server', ''),
    apiKey: GM_getValue('emby_api_key', ''),
    cacheTTL: 60
  };

  // Bangumi 配置
  readonly bangumi: ServiceConfig = {
    apiKey: GM_getValue('bangumi_token', ''),
    baseUrl: 'https://api.bgm.tv',
    cacheTTL: 1440
  };

  // IMDB 配置
  readonly imdb: ServiceConfig = {
    baseUrl: 'https://www.imdb.com',
    cacheTTL: 10080 // 7天
  };

  // Nuller 配置
  readonly nuller: ServiceConfig = {
    baseUrl: 'https://api.nullbr.eu.org',
    appId: GM_getValue('nuller_app_id', ''),
    apiKey: GM_getValue('nuller_api_key', ''),
    cacheTTL: 10080 // 7天（有结果）
  };

  // 状态配置
  readonly state: {
    dotPosition: 'auto' | 'poster_tl' | 'poster_tr' | 'poster_bl' | 'poster_br' | 'title_left' | 'title_right';
  } = {
      dotPosition: GM_getValue('us_dot_position', 'auto')
    };

  /**
   * 更新配置
   * @param service - 服务名称
   * @param updates - 更新的配置项
   */
  update(service: 'tmdb' | 'emby' | 'bangumi' | 'state', updates: Partial<ServiceConfig>): void {
    const config = this[service] as ServiceConfig;
    Object.assign(config, updates);

    // 持久化到 GM storage
    if (service === 'tmdb' && updates.apiKey !== undefined) {
      GM_setValue('tmdb_api_key', updates.apiKey);
    } else if (service === 'emby') {
      if (updates.server !== undefined) GM_setValue('emby_server', updates.server);
      if (updates.apiKey !== undefined) GM_setValue('emby_api_key', updates.apiKey);
    } else if (service === 'bangumi' && updates.apiKey !== undefined) {
      GM_setValue('bangumi_token', updates.apiKey);
    } else if (service === 'state' && 'dotPosition' in updates) {
      GM_setValue('us_dot_position', updates.dotPosition);
    }

    // 通知监听器
    this.notifyListeners(service, config);
  }

  /**
   * 验证配置
   * @param service - 服务名称
   * @returns 是否有效
   */
  validate(service: 'tmdb' | 'emby' | 'bangumi' | 'imdb'): boolean {
    const config = this[service];

    switch (service) {
      case 'tmdb':
        return !!config.apiKey && config.apiKey.length > 0;
      case 'emby':
        return !!config.server && !!config.apiKey;
      case 'bangumi':
        return !!config.apiKey && config.apiKey.length > 0;
      case 'imdb':
        return true; // IMDB 不需要 API Key
      default:
        return false;
    }
  }

  /**
   * 添加配置变更监听器
   * @param listener - 监听器函数
   */
  addListener(listener: ConfigListener): void {
    this.listeners.push(listener);
  }

  /**
   * 移除配置变更监听器
   * @param listener - 监听器函数
   */
  removeListener(listener: ConfigListener): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 通知所有监听器
   * @param service - 服务名称
   * @param config - 新配置
   */
  private notifyListeners(service: string, config: ServiceConfig): void {
    this.listeners.forEach(listener => {
      try {
        listener(service, config);
      } catch (error) {
        console.error('Config listener error:', error);
      }
    });
  }

  /**
   * 获取配置摘要
   */
  getSummary(): Record<string, any> {
    return {
      tmdb: {
        hasApiKey: !!this.tmdb.apiKey,
        language: this.tmdb.language
      },
      emby: {
        hasServer: !!this.emby.server,
        hasApiKey: !!this.emby.apiKey,
        server: this.emby.server || '(未配置)'
      },
      bangumi: {
        hasToken: !!this.bangumi.apiKey
      },
      state: {
        dotPosition: this.state.dotPosition
      }
    };
  }
}

// 导出单例实例
export const CONFIG = new ApiConfig();
