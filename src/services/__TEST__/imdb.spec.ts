import { describe, expect, it } from 'vitest';
import { imdbService } from '../imdb';

describe('ImdbService', () => {
  describe('getRating', () => {
    it('应该能获取IMDB评分', async () => {
      const result = await imdbService.getRating('tt1375666');

      expect(result.data).toBeDefined();
      if (result.data) {
        expect(result.data).toHaveProperty('aggregateRating');
        expect(result.data.aggregateRating).toHaveProperty('ratingValue');
        expect(result.data.aggregateRating!.ratingValue).toBeGreaterThan(0);
      }
    }, 15000);

    it('应该使用缓存', async () => {
      const imdbId = 'tt0133093'; // The Matrix

      const result1 = await imdbService.getRating(imdbId);
      expect(result1.meta.cached).toBeFalsy();

      const result2 = await imdbService.getRating(imdbId);
      expect(result2.meta.cached).toBeTruthy();

      expect(result1.data).toEqual(result2.data);
    }, 20000);

    it('无效ID应该返回null', async () => {
      const result = await imdbService.getRating('tt99999999999');

      expect(result.data === null || result.meta.error).toBeTruthy();
    }, 15000);
  });
});
