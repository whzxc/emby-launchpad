import { Utils } from '@/utils';

interface QueueTask<T = any> {
  requestFn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  priority: number;
  key?: string;
}

interface QueueStatus {
  running: number;
  queued: number;
  pending: number;
  maxConcurrent: number;
}

export class RequestQueue {
  private maxConcurrent: number;
  private queue: QueueTask[];
  private running: number;
  private pendingRequests: Map<string, Promise<any>>;

  constructor(maxConcurrent: number = 6) {
    this.maxConcurrent = maxConcurrent;
    this.queue = [];
    this.running = 0;
    this.pendingRequests = new Map();
  }

  async enqueue<T>(
    requestFn: () => Promise<T>,
    options: { key?: string; priority?: number } = {},
  ): Promise<T> {
    const { key, priority = 0 } = options;

    if (key && this.pendingRequests.has(key)) {
      Utils.log(`Request deduped: ${key}`);
      return this.pendingRequests.get(key)!;
    }

    const promise = new Promise<T>((resolve, reject) => {
      this.queue.push({
        requestFn,
        resolve,
        reject,
        priority,
        key,
      });
    });

    if (key) {
      this.pendingRequests.set(key, promise);
    }

    this.queue.sort((a, b) => b.priority - a.priority);

    this.processQueue();

    return promise;
  }

  getStatus(): QueueStatus {
    return {
      running: this.running,
      queued: this.queue.length,
      pending: this.pendingRequests.size,
      maxConcurrent: this.maxConcurrent,
    };
  }

  clear(): void {
    this.queue = [];
    this.pendingRequests.clear();
  }

  private async processQueue(): Promise<void> {
    while (this.running < this.maxConcurrent && this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        this.running++;
        this.executeTask(task);
      }
    }
  }

  private async executeTask<T>(task: QueueTask<T>): Promise<void> {
    const { requestFn, resolve, reject, key } = task;

    try {
      const result = await requestFn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;

      if (key) {
        this.pendingRequests.delete(key);
      }

      this.processQueue();
    }
  }
}

export const requestQueue = new RequestQueue(6);
