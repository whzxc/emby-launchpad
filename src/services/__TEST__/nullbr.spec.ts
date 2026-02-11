import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nullbrService } from '../nullbr';
import { CONFIG } from '../../core/api-config';

describe('NullbrService', () => {
  beforeEach(() => {
    CONFIG.update('nullbr', { appId: 'test-app-id', apiKey: 'test-api-key' });
    vi.clearAllMocks();
  });

  describe('get115Resources', () => {
    it('应该能获取115资源', async () => {

      const mockResponse = {
        '115': [
          {
            title: 'Test Movie',
            size: '1GB',
            share_link: 'http://115.com/s/...',
          },
        ],
      };

      (global as any).GM_xmlhttpRequest = vi.fn((options) => {
        options.onload({
          status: 200,
          responseText: JSON.stringify(mockResponse),
        });
      });

      const result = await nullbrService.get115Resources(12345, 'movie');

      expect(result.data).toBeDefined();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('Test Movie');
    });

    it('未找到资源时应该返回空数组', async () => {
      (global as any).GM_xmlhttpRequest = vi.fn((options) => {
        options.onload({
          status: 404,
          responseText: '{}',
        });
      });

      const result = await nullbrService.get115Resources(12345, 'movie');

      expect(result.data).toEqual([]);
    });
  });

  describe('getMagnetResources', () => {
    it('应该能获取磁力资源', async () => {
      const mockResponse = {
        magnet: [
          {
            name: 'Test Magnet',
            size: '2GB',
            magnet: 'magnet:?xt=urn:btih:...',
          },
        ],
      };

      (global as any).GM_xmlhttpRequest = vi.fn((options) => {
        options.onload({
          status: 200,
          responseText: JSON.stringify(mockResponse),
        });
      });

      const result = await nullbrService.getMagnetResources(12345, 'movie');

      expect(result.data).toBeDefined();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Test Magnet');
    });
  });

  describe('配置检查', () => {
    it('未配置API Key时应该返回错误', async () => {
      CONFIG.update('nullbr', { appId: '', apiKey: '' });

      const result = await nullbrService.get115Resources(12345, 'movie');

      expect(result.meta.error).toBeDefined();
      expect(result.data).toEqual([]);
    });
  });
});
