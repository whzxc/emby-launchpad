/**
 * 缓存数据结构
 */
interface CacheData<T = any> {
  value: T;
  expire: number;
  createdAt: number;
}

/**
 * 缓存统计信息
 */
interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  hitRate: string;
}

/**
 * 增强版缓存管理器
 * 提供分级 TTL、统计信息和批量操作支持
 */
export class CacheManager {
  private prefix: string;
  private stats: Omit<CacheStats, 'hitRate'>;

  constructor(prefix: string = 'us_cache_') {
    this.prefix = prefix;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0
    };
  }

  /**
   * 获取缓存
   * @param key - 缓存键
   * @returns 缓存值或 undefined (未命中/过期)
   */
  get<T = any>(key: string): T | undefined {
    const fullKey = this.prefix + key;
    const data = GM_getValue(fullKey);

    if (data !== undefined && data !== null) {
      try {
        const parsed: CacheData<T> = typeof data === 'string' ? JSON.parse(data) : data;
        if (Date.now() < parsed.expire) {
          this.stats.hits++;
          return parsed.value;
        } else {
          // 过期清理
          GM_deleteValue(fullKey);
          this.stats.misses++;
        }
      } catch (e) {
        // 损坏的缓存数据
        GM_deleteValue(fullKey);
        this.stats.misses++;
      }
    } else {
      this.stats.misses++;
    }

    return undefined;
  }

  /**
   * 设置缓存
   * @param key - 缓存键
   * @param value - 缓存值
   * @param ttlMinutes - 存活时间(分钟),默认24小时
   */
  set<T = any>(key: string, value: T, ttlMinutes: number = 1440): void {
    const fullKey = this.prefix + key;
    const data: CacheData<T> = {
      value: value,
      expire: Date.now() + ttlMinutes * 60 * 1000,
      createdAt: Date.now()
    };

    GM_setValue(fullKey, JSON.stringify(data));
    this.stats.sets++;
  }

  /**
   * 检查缓存是否存在且未过期
   * @param key - 缓存键
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * 删除指定缓存
   * @param key - 缓存键
   */
  delete(key: string): void {
    GM_deleteValue(this.prefix + key);
  }

  /**
   * 批量清除缓存
   * @param filters - 过滤器数组,如 ['tmdb', 'emby']
   * @returns 清除的缓存数量
   */
  clear(filters: string[] = []): number {
    const keys = GM_listValues();
    let count = 0;

    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        let shouldDelete = false;

        if (filters.length === 0) {
          // 无过滤器,清除所有
          shouldDelete = true;
        } else {
          // 检查是否匹配任一过滤器
          for (const filter of filters) {
            if (key.indexOf(`_${filter}`) !== -1) {
              shouldDelete = true;
              break;
            }
          }
        }

        if (shouldDelete) {
          GM_deleteValue(key);
          count++;
        }
      }
    });

    return count;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : '0.00';

    return {
      ...this.stats,
      hitRate: `${hitRate}%`
    };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0
    };
  }

  /**
   * 获取所有缓存键列表
   */
  listKeys(): string[] {
    const keys = GM_listValues();
    return keys
      .filter(key => key.startsWith(this.prefix))
      .map(key => key.replace(this.prefix, ''));
  }

  /**
   * 清理所有过期缓存
   * @returns 清理的缓存数量
   */
  cleanExpired(): number {
    const keys = this.listKeys();
    let count = 0;

    keys.forEach(key => {
      const fullKey = this.prefix + key;
      const data = GM_getValue(fullKey);

      if (data !== undefined && data !== null) {
        try {
          const parsed: CacheData = typeof data === 'string' ? JSON.parse(data) : data;
          if (Date.now() >= parsed.expire) {
            GM_deleteValue(fullKey);
            count++;
          }
        } catch (e) {
          // 损坏的数据也删除
          GM_deleteValue(fullKey);
          count++;
        }
      }
    });

    return count;
  }
}

// 导出单例实例
export const cache = new CacheManager();
