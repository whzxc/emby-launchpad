import { beforeEach, describe, expect, it } from 'vitest';
import { CacheManager } from '../cache-manager';
import { sleep } from '../../test/api-test-helpers';

describe('CacheManager', () => {
  let cache: CacheManager;

  beforeEach(() => {
    cache = new CacheManager('test_cache_');
    cache.clear();
    cache.resetStats();
  });

  describe('基本操作', () => {
    it('应该能存储和获取缓存', () => {
      cache.set('key1', 'value1');
      const value = cache.get('key1');
      expect(value).toBe('value1');
    });

    it('应该支持不同类型的数据', () => {
      const testData = {
        string: 'test',
        number: 123,
        boolean: true,
        array: [1, 2, 3],
        object: { nested: 'value' },
      };

      cache.set('string', testData.string);
      cache.set('number', testData.number);
      cache.set('boolean', testData.boolean);
      cache.set('array', testData.array);
      cache.set('object', testData.object);

      expect(cache.get('string')).toBe(testData.string);
      expect(cache.get('number')).toBe(testData.number);
      expect(cache.get('boolean')).toBe(testData.boolean);
      expect(cache.get('array')).toEqual(testData.array);
      expect(cache.get('object')).toEqual(testData.object);
    });

    it('应该在过期后返回null', async () => {
      cache.set('key2', 'value2', 0.02);

      expect(cache.get('key2')).toBe('value2');

      await sleep(1500);
      expect(cache.get('key2')).toBeUndefined();
    });

    it('has() 应该正确判断缓存是否存在', () => {
      cache.set('exists', 'value');
      expect(cache.has('exists')).toBe(true);
      expect(cache.has('notexists')).toBe(false);
    });

    it('delete() 应该删除缓存', () => {
      cache.set('delete_test', 'value');
      cache.delete('delete_test');
      expect(cache.get('delete_test')).toBeUndefined();
    });

    it('delete() 应该删除指定缓存', () => {
      cache.set('key3', 'value3');
      expect(cache.has('key3')).toBe(true);

      cache.delete('key3');
      expect(cache.has('key3')).toBe(false);
    });
  });

  describe('统计功能', () => {
    it('应该正确统计命中率', () => {
      cache.set('key4', 'value4');

      cache.get('key4'); // hit
      cache.get('key4'); // hit
      cache.get('nonexistent'); // miss
      cache.get('alsonotexist'); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.sets).toBe(1);
      expect(stats.hitRate).toBe('50.00%');
    });

    it('resetStats() 应该重置所有统计', () => {
      cache.set('key5', 'value5');
      cache.get('key5');
      cache.get('nonexistent');

      cache.resetStats();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.sets).toBe(0);
    });
  });

  describe('批量操作', () => {
    it('clear() 无过滤器应该清除所有缓存', () => {
      cache.set('tmdb_movie_123', 'data1');
      cache.set('emby_server_456', 'data2');
      cache.set('bangumi_anime_789', 'data3');

      const count = cache.clear();
      expect(count).toBe(3);
      expect(cache.listKeys().length).toBe(0);
    });

    it('clear() 带过滤器应该只清除匹配的缓存', () => {
      cache.set('tmdb_movie_123', 'data1');
      cache.set('tmdb_tv_456', 'data2');
      cache.set('emby_server_789', 'data3');

      const count = cache.clear(['tmdb']);
      expect(count).toBe(2);
      expect(cache.has('emby_server_789')).toBe(true);
    });

    it('listKeys() 应该返回所有缓存键', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      const keys = cache.listKeys();
      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    it('cleanExpired() 应该清除所有过期缓存', async () => {
      cache.set('short', 'value1', 0.01); // 0.6秒
      cache.set('long', 'value2', 10); // 10分钟

      await sleep(800);

      const count = cache.cleanExpired();
      expect(count).toBe(1);
      expect(cache.has('short')).toBe(false);
      expect(cache.has('long')).toBe(true);
    });
  });
});
