import { describe, it, expect, beforeEach } from 'vitest';
import { bangumiService } from './bangumi';
import { CONFIG } from '../core/api-config';
import { skipIfNoApiKey } from '../test/helpers/api-test-helpers';

describe('BangumiService', () => {
  beforeEach(() => {
    if (skipIfNoApiKey('bangumi')) {
      console.warn('⚠️  Skipping Bangumi tests: no API key found in .env');
    }
  });

  describe('search', () => {
    it('应该能搜索动漫', async () => {
      if (skipIfNoApiKey('bangumi')) return;

      const result = await bangumiService.search('进击的巨人');

      expect(result.data).toBeDefined();
      if (result.data) {
        expect(result.data).toHaveProperty('id');
        expect(result.data).toHaveProperty('name');
        expect(result.data.type).toBe(2); // Anime type
      }
    }, 15000);

    it('应该能搜索英文动漫名', async () => {
      if (skipIfNoApiKey('bangumi')) return;

      const result = await bangumiService.search('Attack on Titan');

      expect(result.data).toBeDefined();
      if (result.data) {
        expect(result.data).toHaveProperty('id');
      }
    }, 15000);

    it('无结果时应该返回null', async () => {
      if (skipIfNoApiKey('bangumi')) return;

      const result = await bangumiService.search('xyzabc123nonexistentanime999');

      expect(result.data).toBeNull();
    }, 15000);

    it('应该使用缓存', async () => {
      if (skipIfNoApiKey('bangumi')) return;

      const query = '鬼灭之刃';

      const result1 = await bangumiService.search(query);
      console.log('Result 1:', result1); // Debug log
      expect(result1.meta.cached).toBeFalsy();

      const result2 = await bangumiService.search(query);
      console.log('Result 2:', result2); // Debug log
      expect(result2.meta.cached).toBeTruthy();

      expect(result1.data).toEqual(result2.data);
    }, 20000);
  });

  describe('错误处理', () => {
    it('没有Token时应该返回错误', async () => {
      const originalKey = CONFIG.bangumi.apiKey;
      CONFIG.update('bangumi', { apiKey: '' });

      const result = await bangumiService.search('test');

      expect(result.meta.error).toBeDefined();
      expect(result.data).toBeNull();

      if (originalKey) {
        CONFIG.update('bangumi', { apiKey: originalKey });
      }
    });
  });
});
