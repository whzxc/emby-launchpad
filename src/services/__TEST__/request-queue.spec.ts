import { beforeEach, describe, expect, it } from 'vitest';
import { RequestQueue } from '../request-queue';
import { sleep } from '../../test/api-test-helpers';

describe('RequestQueue', () => {
  let queue: RequestQueue;

  beforeEach(() => {
    queue = new RequestQueue(2); // 限制2个并发
  });

  describe('基本功能', () => {
    it('应该能添加和执行请求', async () => {
      const result = await queue.enqueue(async () => {
        return 'test result';
      });

      expect(result).toBe('test result');
    });

    it('应该支持多个并发请求', async () => {
      const results = await Promise.all([
        queue.enqueue(async () => 'result1'),
        queue.enqueue(async () => 'result2'),
        queue.enqueue(async () => 'result3'),
      ]);

      expect(results).toEqual(['result1', 'result2', 'result3']);
    });

    it('应该限制并发数量', async () => {
      let concurrent = 0;
      let maxConcurrent = 0;

      const requests = Array.from({ length: 5 }, () =>
        queue.enqueue(async () => {
          concurrent++;
          maxConcurrent = Math.max(maxConcurrent, concurrent);
          await sleep(100);
          concurrent--;
          return 'done';
        }),
      );

      await Promise.all(requests);
      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });
  });

  describe('请求去重', () => {
    it('相同key的请求应该返回相同的Promise', async () => {
      let callCount = 0;

      const request1 = queue.enqueue(
        async () => {
          callCount++;
          await sleep(100);
          return 'result';
        },
        { key: 'same-key' },
      );

      const request2 = queue.enqueue(
        async () => {
          callCount++;
          await sleep(100);
          return 'result';
        },
        { key: 'same-key' },
      );

      const [result1, result2] = await Promise.all([request1, request2]);

      expect(result1).toBe(result2);
      expect(callCount).toBe(1); // 只调用一次
    });

    it('不同key的请求应该独立执行', async () => {
      let callCount = 0;

      const request1 = queue.enqueue(
        async () => {
          callCount++;
          return 'result1';
        },
        { key: 'key1' },
      );

      const request2 = queue.enqueue(
        async () => {
          callCount++;
          return 'result2';
        },
        { key: 'key2' },
      );

      await Promise.all([request1, request2]);
      expect(callCount).toBe(2);
    });
  });

  describe('优先级队列', () => {
    it('应该按优先级顺序执行', async () => {
      const executionOrder: string[] = [];
      const resolvers: Function[] = [];

      const createBlocker = (id: string) => {
        return queue.enqueue(
          () => new Promise(resolve => {
            resolvers.push(() => {
              executionOrder.push(id);
              resolve(id);
            });
          }),
          { priority: 0 },
        );
      };

      const blocker1 = createBlocker('blocker1');
      const blocker2 = createBlocker('blocker2');

      const low = queue.enqueue(
        async () => {
          executionOrder.push('low');
          return 'low';
        },
        { priority: 1 },
      );

      const high = queue.enqueue(
        async () => {
          executionOrder.push('high');
          return 'high';
        },
        { priority: 10 },
      );

      resolvers.forEach(r => r());

      await Promise.all([blocker1, blocker2, low, high]);

      const highIndex = executionOrder.indexOf('high');
      const lowIndex = executionOrder.indexOf('low');

      expect(highIndex).toBeGreaterThan(-1);
      expect(lowIndex).toBeGreaterThan(-1);
      expect(highIndex).toBeLessThan(lowIndex);
    });
  });

  describe('错误处理', () => {
    it('应该正确处理请求错误', async () => {
      const errorMessage = 'Test error';

      await expect(
        queue.enqueue(async () => {
          throw new Error(errorMessage);
        }),
      ).rejects.toThrow(errorMessage);
    });

    it('一个请求失败不应影响其他请求', async () => {
      const failingRequest = queue.enqueue(async () => {
        throw new Error('Failed');
      }).catch(e => 'error');

      const successRequest = queue.enqueue(async () => 'success');

      const results = await Promise.all([failingRequest, successRequest]);
      expect(results).toContain('success');
      expect(results).toContain('error');
    });
  });

  describe('队列状态', () => {
    it('应该正确报告队列状态', async () => {
      const request1 = queue.enqueue(async () => {
        await sleep(200);
        return 'done';
      });

      await sleep(10);

      const status = queue.getStatus();
      expect(status.running).toBeGreaterThan(0);
      expect(status.maxConcurrent).toBe(2);

      await request1;
    });

    it('clear() 应该清空队列', () => {
      queue.enqueue(async () => 'test', { key: 'key1' });
      queue.enqueue(async () => 'test', { key: 'key2' });

      queue.clear();

      const status = queue.getStatus();
      expect(status.queued).toBe(0);
      expect(status.pending).toBe(0);
    });
  });
});
