import { describe, it, expect, beforeEach } from 'vitest';
import { tmdbService } from './tmdb';
import { CONFIG } from '../core/api-config';
import { skipIfNoApiKey, sleep } from '../test/helpers/api-test-helpers';

describe('TmdbService', () => {
  beforeEach(() => {
    if (skipIfNoApiKey('tmdb')) {
      console.warn('⚠️  Skipping TMDB tests: no API key found in .env');
    }
  });

  describe('search', () => {
    it('应该能搜索电影', async () => {
      if (skipIfNoApiKey('tmdb')) return;

      const result = await tmdbService.search('Inception', '2010', 'movie');

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);

      const firstResult = result.data[0];
      expect(firstResult.media_type).toBe('movie');
      expect(firstResult.title || firstResult.name).toBeTruthy();
    }, 10000);

    it('应该能搜索电视剧', async () => {
      if (skipIfNoApiKey('tmdb')) return;

      const result = await tmdbService.search('Game of Thrones', '', 'tv');

      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);

      const firstResult = result.data[0];
      expect(firstResult.media_type).toBe('tv');
    }, 10000);

    it('应该能按年份过滤', async () => {
      if (skipIfNoApiKey('tmdb')) return;

      const result = await tmdbService.search('Interstellar', '2014', 'movie');

      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);

      const firstResult = result.data[0];
      const year = firstResult.release_date?.split('-')[0];
      expect(year).toBe('2014');
    }, 10000);

    it('应该使用缓存机制', async () => {
      if (skipIfNoApiKey('tmdb')) return;

      const query = 'The Matrix';
      const year = '1999';

      // 第一次请求
      const result1 = await tmdbService.search(query, year, 'movie');
      expect(result1.meta.cached).toBeFalsy();

      // 第二次请求应该从缓存获取
      const result2 = await tmdbService.search(query, year, 'movie');
      expect(result2.meta.cached).toBeTruthy();

      // 数据应该一致
      expect(result1.data).toEqual(result2.data);
    }, 15000);

    it('无结果时应该返回空数组', async () => {
      if (skipIfNoApiKey('tmdb')) return;

      const result = await tmdbService.search('xyzabc123nonexistentmovie999', '', null);

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(0);
    }, 10000);
  });

  describe('getDetails', () => {
    it('应该能获取电影详情', async () => {
      if (skipIfNoApiKey('tmdb')) return;

      // Inception 的 TMDB ID: 27205
      const result = await tmdbService.getDetails(27205, 'movie');

      expect(result.data).toBeDefined();
      expect(result.data).toHaveProperty('title');
      expect(result.data).toHaveProperty('release_date');
      expect(result.data.id).toBe(27205);
    }, 10000);

    it('应该能获取电视剧详情', async () => {
      if (skipIfNoApiKey('tmdb')) return;

      // Game of Thrones 的 TMDB ID: 1399
      const result = await tmdbService.getDetails(1399, 'tv');

      expect(result.data).toBeDefined();
      expect(result.data).toHaveProperty('name');
      expect(result.data).toHaveProperty('first_air_date');
      expect(result.data.id).toBe(1399);
    }, 10000);

    it('详情请求也应该使用缓存', async () => {
      if (skipIfNoApiKey('tmdb')) return;

      const result1 = await tmdbService.getDetails(27205, 'movie');
      expect(result1.meta.cached).toBeFalsy();

      const result2 = await tmdbService.getDetails(27205, 'movie');
      expect(result2.meta.cached).toBeTruthy();
    }, 15000);
  });

  describe('错误处理', () => {
    it('没有API Key时应该返回错误', async () => {
      // 临时保存并清除 API Key
      const originalKey = CONFIG.tmdb.apiKey;
      CONFIG.update('tmdb', { apiKey: '' });

      const result = await tmdbService.search('test', '', null);

      expect(result.meta.error).toBeDefined();
      expect(result.data).toEqual([]);

      // 恢复 API Key
      if (originalKey) {
        CONFIG.update('tmdb', { apiKey: originalKey });
      }
    });
  });
});
