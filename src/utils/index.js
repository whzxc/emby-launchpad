import { GM_xmlhttpRequest, GM_addStyle, GM_setClipboard, GM_getValue, GM_setValue, GM_deleteValue, GM_listValues } from '$';

export const Utils = {
  /**
   * Promisified GM_xmlhttpRequest
   * @param {Object} details
   * @returns {Promise}
   */
  request: function (details) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        ...details,
        onload: function (response) {
          if (response.status >= 200 && response.status < 400) {
            resolve(response);
          } else {
            reject(response);
          }
        },
        onerror: function (response) {
          reject(response);
        }
      });
    });
  },

  getJSON: function (url) {
    Utils.log(`fetching ${url}`);
    return this.request({
      method: 'GET',
      url: url,
      headers: { 'Accept': 'application/json' }
    }).then(resp => JSON.parse(resp.responseText));
  },

  getDoc: function (url) {
    return this.request({
      method: 'GET',
      url: url
    }).then(resp => {
      return (new DOMParser()).parseFromString(resp.responseText, 'text/html');
    });
  },

  addStyle: function (css) {
    GM_addStyle(css);
  },

  copyToClipboard: function (text, successCallback) {
    GM_setClipboard(text);
    if (successCallback) successCallback();
  },

  log: function (...args) {
    console.log('[Unified-Script]', ...args);
  }
};

export const Cache = {
  prefix: 'us_cache_',
  get: function (key) {
    const data = GM_getValue(this.prefix + key);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (Date.now() < parsed.expire) {
          return parsed.value;
        } else {
          GM_deleteValue(this.prefix + key); // Clean up expired
        }
      } catch (e) {
        GM_deleteValue(this.prefix + key);
      }
    }
    return null;
  },
  set: function (key, value, ttlMinutes = 1440) { // Default 24 hours
    const data = {
      value: value,
      expire: Date.now() + ttlMinutes * 60 * 1000
    };
    GM_setValue(this.prefix + key, JSON.stringify(data));
  },
  clear: function (filters = []) {
    const keys = GM_listValues();
    let count = 0;
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        let shouldDelete = false;
        if (filters.length === 0) {
          shouldDelete = true;
        } else {
          for (const f of filters) {
            // key: us_cache_tmdb_..., us_cache_emby_check_..., us_cache_imdb_r_...
            // filter: 'tmdb', 'emby', 'imdb'
            if (key.indexOf(`_${f}`) !== -1) {
              shouldDelete = true;
              break;
            }
          }
        }

        if (shouldDelete) {
          GM_deleteValue(key);
          count++;
        }
      }
    });
    return count;
  }
};
