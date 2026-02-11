import { describe, it, expect, beforeEach, vi } from 'vitest';
import { embyService } from './emby';
import { CONFIG } from '../core/api-config';
import { Utils } from '../utils';

describe('EmbyService', () => {
  beforeEach(() => {
    CONFIG.update('emby', { server: 'https://emby.example.com', apiKey: 'test-api-key' });
    vi.clearAllMocks();
  });

  describe('checkExistence', () => {
    it('应该能检查存在的媒体', async () => {
      const searchUrl = 'https://emby.example.com/emby/Items';
      vi.spyOn(Utils, 'getJSON').mockImplementation(async (url) => {
        if (url.includes('AnyProviderIdEquals=tmdb.123')) {
          return {
            Items: [
              {
                Id: 'item1',
                Name: 'Test Movie',
                Type: 'Movie'
              }
            ]
          };
        }
        return { Items: [] };
      });

      const result = await embyService.checkExistence(123);

      expect(result.data).toBeDefined();
      expect(result.data?.Id).toBe('item1');
      expect(result.data?.Name).toBe('Test Movie');
      expect(result.meta.cached).toBeFalsy();
    });

    it('未找到时应该返回null', async () => {
      vi.spyOn(Utils, 'getJSON').mockResolvedValue({ Items: [] });

      const result = await embyService.checkExistence(999);

      expect(result.data).toBeNull();
    });

    it('配置缺失时应该返回错误', async () => {
      CONFIG.update('emby', { server: '', apiKey: '' });

      const result = await embyService.checkExistence(123);

      expect(result.meta.error).toBeDefined();
      expect(result.data).toBeNull();
    });

    it('应该处理由剧集组成的系列', async () => {
      vi.spyOn(Utils, 'getJSON').mockImplementation(async (url) => {
        if (url.includes('AnyProviderIdEquals=tmdb.456')) {
          return {
            Items: [{
              Id: 'series1',
              Name: 'Test Series',
              Type: 'Series'
            }]
          };
        }
        if (url.includes('ParentId=series1') && url.includes('IncludeItemTypes=Season')) {
          return {
            Items: [{
              Id: 'season1',
              Name: 'Season 1',
              RecursiveItemCount: 10
            }]
          };
        }
        return { Items: [] };
      });

      const result = await embyService.checkExistence(456);

      expect(result.data).toBeDefined();
      expect(result.data?.Type).toBe('Series');
      expect(result.data?.Seasons).toBeDefined();
      expect(result.data?.Seasons![0].RecursiveItemCount).toBe(10);
    });
  });

  describe('getWebUrl', () => {
    it('应该生成正确的 URL', () => {
      const item = { Id: 'item1', Name: 'Test', ServerId: 'server1' };
      const url = embyService.getWebUrl(item as any);
      expect(url).toBe('https://emby.example.com/web/index.html#!/item?id=item1&serverId=server1');
    });

    it('item为空时应该返回空字符串', () => {
      const url = embyService.getWebUrl(null);
      expect(url).toBe('');
    });
  });
});
