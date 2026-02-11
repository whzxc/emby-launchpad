export const Utils = {
  request(details: any): Promise<any> {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        ...details,
        onload(response: any) {
          if (response.status >= 200 && response.status < 400) {
            resolve(response);
          } else {
            reject(response);
          }
        },
        onerror(response: any) {
          reject(response);
        },
      });
    });
  },

  async getJSON(url: string): Promise<any> {
    const resp = await this.request({
      method: 'GET',
      url: url,
      headers: { 'Accept': 'application/json' },
    });
    return JSON.parse(resp.responseText);
  },

  async getDoc(url: string): Promise<Document> {
    const resp = await this.request({
      method: 'GET',
      url: url,
    });
    return (new DOMParser()).parseFromString(resp.responseText, 'text/html');
  },

  addStyle(css: string): void {
    GM_addStyle(css);
  },

  copyToClipboard(text: string, successCallback?: () => void): void {
    GM_setClipboard(text);
    if (successCallback) successCallback();
  },

  log(...args: any[]): void {
    console.log('[Unified-Script]', ...args);
  },
};

export { cache as Cache } from '../core/cache-manager';
