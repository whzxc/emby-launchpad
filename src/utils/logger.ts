
import { LogEntry } from '@/types/common';

export class ProcessLogger {
  private logs: LogEntry[] = [];

  log(step: string, data: unknown, status?: string): void {
    this.logs.push({
      time: new Date().toLocaleTimeString(),
      step,
      data,
      status
    });
  }

  logApiRequest(apiName: string, meta: any, response: any): void {
    this.log(`【请求API: ${apiName}】`, {
      meta,
      response
    });
  }

  logError(error: any): void {
    this.log('【错误】', {
      message: error?.message || String(error),
      stack: error?.stack
    }, 'error');
  }

  getLogs(): LogEntry[] {
    return this.logs;
  }
}
