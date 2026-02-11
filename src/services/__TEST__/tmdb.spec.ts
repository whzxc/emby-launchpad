import { beforeEach, describe, expect, it } from 'vitest';
import { tmdbService } from '../tmdb';
import { CONFIG } from '../../core/api-config';
import { skipIfNoApiKey } from '../../test/api-test-helpers';

// Polyfill GM for testing environment
if (typeof (globalThis as any).GM === 'undefined') {
  (globalThis as any).GM = {
    xmlHttpRequest: async (details: any) => {
      try {
        const response = await fetch(details.url);
        const data = await response.json();
        return { response: data };
      } catch (error) {
        console.error('Fetch error:', error);
        return { response: { results: [] } }; // Fallback
      }
    },
  };
}

describe('TmdbService', () => {
  beforeEach(() => {
    if (skipIfNoApiKey('tmdb')) {
      console.warn('⚠️  Skipping TMDB tests: no API key found in .env');
    }
  });

  describe('searchMovie', () => {
    it('应该能搜索电影', async () => {
      if (skipIfNoApiKey('tmdb')) return;

      const result = await tmdbService.searchMovie('Inception', '2010');

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);

      const firstResult = result.data[0];
      // Movie type doesn't have media_type property in the search/movie response usually,
      // but let's check for title which is specific to movies
      expect(firstResult.title).toBeTruthy();
    }, 10000);

    it('应该能按年份过滤', async () => {
      if (skipIfNoApiKey('tmdb')) return;

      const result = await tmdbService.searchMovie('Interstellar', '2014');

      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);

      const firstResult = result.data[0];
      const year = firstResult.release_date?.split('-')[0];
      expect(year).toBe('2014');
    }, 10000);
  });

  describe('searchTv', () => {
    it('应该能搜索电视剧', async () => {
      if (skipIfNoApiKey('tmdb')) return;

      const result = await tmdbService.searchTv('Game of Thrones');

      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);

      const firstResult = result.data[0];
      // TV type has name instead of title
      expect(firstResult.name).toBeTruthy();
    }, 10000);
  });

  describe('caching', () => {
    it('应该使用缓存机制', async () => {
      if (skipIfNoApiKey('tmdb')) return;

      const query = 'The Matrix';
      const year = '1999';

      const result1 = await tmdbService.searchMovie(query, year);
      expect(result1.meta.cached).toBeFalsy();

      const result2 = await tmdbService.searchMovie(query, year);
      expect(result2.meta.cached).toBeTruthy();

      expect(result1.data).toEqual(result2.data);
    }, 15000);

    it('无结果时应该返回空数组', async () => {
      if (skipIfNoApiKey('tmdb')) return;

      const result = await tmdbService.searchMovie('xyzabc123nonexistentmovie999');

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(0);
    }, 10000);
  });

  describe('getMovieDetails', () => {
    it('应该能获取电影详情', async () => {
      if (skipIfNoApiKey('tmdb')) return;

      const result = await tmdbService.getMovieDetails(27205);

      expect(result.data).toBeDefined();
      expect(result.data).toHaveProperty('title');
      expect(result.data).toHaveProperty('release_date');
      expect(result.data.id).toBe(27205);
    }, 10000);

    it('详情请求也应该使用缓存', async () => {
      if (skipIfNoApiKey('tmdb')) return;

      const result1 = await tmdbService.getMovieDetails(27205);
      expect(result1.meta.cached).toBeFalsy();

      const result2 = await tmdbService.getMovieDetails(27205);
      expect(result2.meta.cached).toBeTruthy();
    }, 15000);
  });

  describe('getTvDetails', () => {
    it('应该能获取电视剧详情', async () => {
      if (skipIfNoApiKey('tmdb')) return;

      const result = await tmdbService.getTvDetails(1399);

      expect(result.data).toBeDefined();
      expect(result.data).toHaveProperty('name');
      expect(result.data).toHaveProperty('first_air_date');
      expect(result.data.id).toBe(1399);
    }, 10000);
  });

  describe('错误处理', () => {
    it('没有API Key时应该返回错误', async () => {
      const originalKey = CONFIG.tmdb.apiKey;
      CONFIG.update('tmdb', { apiKey: '' });

      const result = await tmdbService.searchMovie('test');

      expect(result.meta.error).toBeDefined();
      expect(result.data).toEqual([]);

      if (originalKey) {
        CONFIG.update('tmdb', { apiKey: originalKey });
      }
    });
  });
});
