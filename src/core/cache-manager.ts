interface CacheData<T = any> {
  value: T;
  expire: number;
  createdAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  hitRate: string;
}

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
          GM_deleteValue(fullKey);
          this.stats.misses++;
        }
      } catch (e) {
        GM_deleteValue(fullKey);
        this.stats.misses++;
      }
    } else {
      this.stats.misses++;
    }

    return undefined;
  }

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

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): void {
    GM_deleteValue(this.prefix + key);
  }

  clear(filters: string[] = []): number {
    const keys = GM_listValues();
    let count = 0;

    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        let shouldDelete = false;

        if (filters.length === 0) {
          shouldDelete = true;
        } else {
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

  getStats(): CacheStats {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : '0.00';

    return {
      ...this.stats,
      hitRate: `${hitRate}%`
    };
  }

  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0
    };
  }

  listKeys(): string[] {
    const keys = GM_listValues();
    return keys
      .filter(key => key.startsWith(this.prefix))
      .map(key => key.replace(this.prefix, ''));
  }

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
          GM_deleteValue(fullKey);
          count++;
        }
      }
    });

    return count;
  }
}

export const cache = new CacheManager();
