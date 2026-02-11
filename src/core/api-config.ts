interface ServiceConfig {
  apiKey?: string;
  baseUrl?: string;
  server?: string;
  cacheTTL?: number;
  [key: string]: any;
}

type ConfigListener = (service: string, config: ServiceConfig) => void;

export class ApiConfig {
  private listeners: ConfigListener[] = [];

  readonly tmdb: ServiceConfig = {
    apiKey: GM_getValue('tmdb_api_key', ''),
    baseUrl: 'https://api.themoviedb.org/3',
    language: 'zh-CN',
    cacheTTL: 1440
  };

  readonly emby: ServiceConfig = {
    server: GM_getValue('emby_server', ''),
    apiKey: GM_getValue('emby_api_key', ''),
    cacheTTL: 60
  };

  readonly bangumi: ServiceConfig = {
    apiKey: GM_getValue('bangumi_token', ''),
    baseUrl: 'https://api.bgm.tv',
    cacheTTL: 1440
  };

  readonly imdb: ServiceConfig = {
    baseUrl: 'https://www.imdb.com',
    cacheTTL: 10080 // 7天
  };

  readonly nullbr: ServiceConfig = {
    baseUrl: 'https://api.nullbr.eu.org',
    appId: GM_getValue('nullbr_app_id', process.env.NULLBR_APP_ID || ''),
    apiKey: GM_getValue('nullbr_api_key', process.env.NULLBR_API_KEY || ''),
    cacheTTL: 10080 // 7天（有结果）
  };

  readonly state: {
    dotPosition: 'auto' | 'poster_tl' | 'poster_tr' | 'poster_bl' | 'poster_br' | 'title_left' | 'title_right';
  } = {
      dotPosition: GM_getValue('us_dot_position', 'auto')
    };

  update(service: 'tmdb' | 'emby' | 'bangumi' | 'nullbr' | 'state', updates: Partial<ServiceConfig>): void {
    const config = this[service] as ServiceConfig;
    Object.assign(config, updates);

    if (service === 'tmdb' && updates.apiKey !== undefined) {
      GM_setValue('tmdb_api_key', updates.apiKey);
    } else if (service === 'emby') {
      if (updates.server !== undefined) GM_setValue('emby_server', updates.server);
      if (updates.apiKey !== undefined) GM_setValue('emby_api_key', updates.apiKey);
    } else if (service === 'bangumi' && updates.apiKey !== undefined) {
      GM_setValue('bangumi_token', updates.apiKey);
    } else if (service === 'nullbr') {
      if (updates.appId !== undefined) GM_setValue('nullbr_app_id', updates.appId);
      if (updates.apiKey !== undefined) GM_setValue('nullbr_api_key', updates.apiKey);
    } else if (service === 'state' && 'dotPosition' in updates) {
      GM_setValue('us_dot_position', updates.dotPosition);
    }

    this.notifyListeners(service, config);
  }

  validate(service: 'tmdb' | 'emby' | 'bangumi' | 'imdb' | 'nullbr'): boolean {
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
      case 'nullbr':
        return !!config.appId && !!config.apiKey;
      default:
        return false;
    }
  }

  addListener(listener: ConfigListener): void {
    this.listeners.push(listener);
  }

  removeListener(listener: ConfigListener): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  private notifyListeners(service: string, config: ServiceConfig): void {
    this.listeners.forEach(listener => {
      try {
        listener(service, config);
      } catch (error) {
        console.error('Config listener error:', error);
      }
    });
  }

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

export const CONFIG = new ApiConfig();
