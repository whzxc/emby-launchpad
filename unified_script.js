// ==UserScript==
// @name         Emby&豆瓣影视检索增强
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  在豆瓣(Douban)和GYG网页中自动检测Emby服务端库内是否存在当前影视，支持豆瓣详情页/列表页/排行榜/收藏页，以及GYG列表页/详情页。集成TMDB/IMDb评分，提供gyg.si/bt4gprx.com快捷搜索链接。支持缓存机制减少API请求。
// @author       leo
// @match        https://movie.douban.com/*
// @match        https://m.douban.com/*
// @match        https://www.gyg.si/*
// @match        https://dmhy.org/*
// @connect      api.themoviedb.org
// @connect      www.gyg.si
// @connect      www.imdb.com
// @connect      www.rottentomatoes.com
// @connect      api.bgm.tv
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @grant        GM_getResourceText
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  // --- Configuration ---
  const CONFIG = {
    get tmdb() {
      return {
        apiKey: GM_getValue('tmdb_api_key', ''),
        baseUrl: 'https://api.themoviedb.org/3',
      };
    },
    get emby() {
      return {
        server: GM_getValue('emby_server', ''),
        apiKey: GM_getValue('emby_api_key', '')
      };
    },
    gyg: {
      baseUrl: 'https://www.gyg.si'
    },
    bangumi: {
      token: GM_getValue('bangumi_token', '')
    }
  };

  // --- Utils ---
  const Utils = {
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

  // --- Cache System ---
  const Cache = {
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

  // --- Common Styles ---
  Utils.addStyle(`
        /* Shared Utility Classes */
        .us-flex-row { display: flex; align-items: center; }
        .us-flex-col { display: flex; flex-direction: column; }
        .us-hidden { display: none !important; }
        
        /* GYG Specific Styles */
        .tmdb-wrapper {
            animation: fadeIn 0.5s ease;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .gyg-card {
            display: flex;
            flex-direction: column;
            padding: 10px;
            background: white;
            border-radius: 8px;
            border: 1px solid #eee;
            box-shadow: 0 1px 4px rgba(0,0,0,0.05);
            transition: all 0.2s;
        }
        .tmdb-header-row { display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
        .tmdb-source { font-size: 12px; color: #888; font-weight: bold; }
        .tmdb-score { font-size: 20px; font-weight: bold; color: #01b4e4; }
        .tmdb-copy-area {
            margin-top: 8px; padding-top: 8px; border-top: 1px dashed #ddd; font-size: 13px; color: #555;
            cursor: copy; position: relative; transition: color 0.2s; display: flex; align-items: center; justify-content: space-between;
        }
        .tmdb-copy-area:hover { color: #01b4e4; background-color: rgba(0,0,0,0.01); }
        .emby-card { display: flex; flex-direction: row; justify-content: space-between; align-items: center; cursor: pointer; }
        .emby-card:hover { background: rgba(0,0,0,0.02); }
        .emby-label { font-size: 13px; font-weight: bold; color: #333; }
        .emby-badge { padding: 2px 8px; border-radius: 4px; color: white; font-weight: bold; font-size: 11px; }
        .emby-yes { background-color: #52B54B; }
        .emby-no { background-color: #999; }
        .emby-loading { background-color: #ddd; color: #666; }
        .copy-toast {
            position: absolute; right: 0; top: -20px; background: #333; color: #fff; padding: 2px 6px;
            border-radius: 4px; font-size: 10px; opacity: 0; transition: opacity 0.3s; pointer-events: none;
        }
        .copy-toast.show { opacity: 1; }
        
        /* Douban Specific Styles */
        .douban-aside-box { margin-bottom: 30px; }
        .douban-gyg-header { display: flex; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0; }
        .douban-gyg-icon { width: 16px; height: 16px; margin-right: 8px; border-radius: 3px; }
        .douban-gyg-title { font-weight: bold; color: #333; font-size: 14px; }
        .douban-gyg-content { display: flex; align-items: center; justify-content: space-between; font-size: 13px; }
        .douban-gyg-link { color: #37a; text-decoration: none; display: flex; align-items: center; transition: color 0.2s; }
        .douban-gyg-link:hover { color: #01b4e4; background: none; }
        .rating_logo { font-size: 12px; color: #9b9b9b; }
        .rating_self { padding-top: 5px; }

        /* Settings Modal */
        .us-settings-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; justify-content: center; align-items: center; }
        .us-settings-modal { background: white; padding: 20px; border-radius: 8px; width: 400px; max-width: 90%; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .us-settings-row { margin-bottom: 15px; }
        .us-settings-label { display: block; font-weight: bold; margin-bottom: 5px; color: #333; }
        .us-settings-input { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
        .us-settings-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
        .us-button { padding: 8px 16px; border-radius: 4px; cursor: pointer; border: none; font-weight: bold; }
        .us-button-primary { background: #01b4e4; color: white; }
        .us-button-secondary { background: #eee; color: #333; }
    `);

  // --- Services ---
  const Services = {
    tmdb: {
      search: async function (query, year, type) {
        // Cache Key: sanitize query to avoid weird keys
        const cleanQuery = query.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
        const cacheKey = `tmdb_s_${cleanQuery}_${year || ''}_${type || ''}`;

        const cached = Cache.get(cacheKey);
        if (cached) {
          // Utils.log(`Cache Hit: ${cacheKey}`);
          return cached;
        }

        const url = `${CONFIG.tmdb.baseUrl}/search/multi?api_key=${CONFIG.tmdb.apiKey}&query=${encodeURIComponent(query)}&language=zh-CN&include_adult=true`;
        try {
          const data = await Utils.getJSON(url);
          let results = [];

          if (data.results && data.results.length > 0) {
            results = data.results.filter(item => {
              const matchType = item.media_type === 'movie' || item.media_type === 'tv';
              if (type && matchType) {
                return item.media_type === type;
              }
              return matchType;
            })
              .sort((a, b) => { // Sort by year proximity if year is provided
                if (!year) return 0;
                const dateA = a.release_date || a.first_air_date || '';
                const dateB = b.release_date || b.first_air_date || '';
                const yearA = dateA.split('-')[0];
                const yearB = dateB.split('-')[0];
                return (yearB === year) - (yearA === year); // simple priority for exact match
              });
          }

          // Cache logic: found = 1 day, empty = 1 hour
          const ttl = results.length > 0 ? 1440 : 60;
          Cache.set(cacheKey, results, ttl);

          return results;
        } catch (e) {
          console.error('TMDB Search Error:', e);
          return [];
        }
      }
    },
    emby: {
      checkExistence: async function (tmdbId) {
        const cacheKey = `emby_check_${tmdbId}`;

        // Manual cache check to distinguish NULL (not found) from MISSING (no cache)
        const raw = GM_getValue(Cache.prefix + cacheKey);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Date.now() < parsed.expire) {
              // Utils.log(`Cache Hit Emby: ${tmdbId}`);
              return parsed.value;
            }
          } catch (e) { }
        }

        const queryId = `tmdb.${tmdbId}`;
        const url = `${CONFIG.emby.server}/emby/Items?Recursive=true&AnyProviderIdEquals=${queryId}&api_key=${CONFIG.emby.apiKey}`;
        try {
          const data = await Utils.getJSON(url);
          const item = (data.Items && data.Items.length > 0) ? data.Items[0] : null;

          // Found: Cache 1 day. Not Found: Cache 1 hour (user might add it)
          const ttl = item ? 1440 : 60;
          Cache.set(cacheKey, item, ttl);

          return item;
        } catch (e) {
          console.error('Emby Check Error:', e);
          return null;
        }
      }
    },
    imdb: {
      getRating: async function (imdbId) {
        const cacheKey = `imdb_r_${imdbId}`;
        const cached = Cache.get(cacheKey);
        if (cached) return cached;

        const url = `https://www.imdb.com/title/${imdbId}/`;
        try {
          const doc = await Utils.getDoc(url);
          const jsonLd = doc.querySelector('script[type="application/ld+json"]');
          if (jsonLd) {
            const data = JSON.parse(jsonLd.textContent);
            Cache.set(cacheKey, data, 4320);
            return data;
          }
        } catch (e) {
          console.error('IMDb check error:', e);
        }
        return null;
      }
    },
    bangumi: {
      search: async function (query) {
        if (!CONFIG.bangumi.token) return null;

        const cacheKey = `bgm_s_${query}`;
        const cached = Cache.get(cacheKey);
        if (cached) return cached;

        const url = 'https://api.bgm.tv/v0/search/subjects';
        try {
          const resp = await new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
              method: 'POST',
              url: url,
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.bangumi.token}`,
                'User-Agent': 'Tampermonkey/UnifiedScript'
              },
              data: JSON.stringify({
                keyword: query,
                filter: { type: [2] } // Anime
              }),
              onload: (r) => resolve(r),
              onerror: (e) => reject(e)
            });
          });

          if (resp.status === 200) {
            const data = JSON.parse(resp.responseText);
            if (data && data.data && data.data.length > 0) {
              const subject = data.data[0];
              Cache.set(cacheKey, subject, 1440); // Cache 24h
              return subject;
            }
          }
        } catch (e) {
          console.error('Bangumi Search Error:', e);
        }
        return null;
      }
    }
  };

  // --- Handler: Settings ---
  class SettingsHandler {
    constructor() {
      this.id = 'us-settings-overlay';
    }

    showPanel() {
      if (document.getElementById(this.id)) return;

      const overlay = document.createElement('div');
      overlay.id = this.id;
      overlay.className = 'us-settings-overlay';
      overlay.innerHTML = `
            <div class="us-settings-modal">
                <h3 style="margin-top:0; margin-bottom:20px;">脚本设置 / Settings</h3>
                <div class="us-settings-row">
                    <label class="us-settings-label">TMDB API Key</label>
                    <input type="text" id="us-tmdb-key" class="us-settings-input" value="${GM_getValue('tmdb_api_key', '')}" placeholder="Required for ratings">
                </div>
                <div class="us-settings-row">
                    <label class="us-settings-label">Emby Server URL</label>
                    <input type="text" id="us-emby-server" class="us-settings-input" value="${GM_getValue('emby_server', '')}" placeholder="https://emby.example.com">
                </div>
                <div class="us-settings-row">
                    <label class="us-settings-label">Emby API Key</label>
                    <input type="text" id="us-emby-key" class="us-settings-input" value="${GM_getValue('emby_api_key', '')}" placeholder="Required for library check">
                </div>
                <div class="us-settings-row">
                    <label class="us-settings-label">Bangumi Token (Optional)</label>
                    <input type="text" id="us-bangumi-token" class="us-settings-input" value="${GM_getValue('bangumi_token', '')}" placeholder="For Anime Search Optimization">
                </div>
                
                
                <div class="us-settings-actions">
                    <button id="us-btn-cancel" class="us-button us-button-secondary">Cancel</button>
                    <button id="us-btn-save" class="us-button us-button-primary">Save</button>
                </div>
            </div>
        `;

      document.body.appendChild(overlay);

      document.getElementById('us-btn-cancel').onclick = () => this.close();
      document.getElementById('us-btn-save').onclick = () => this.save();
    }

    save() {
      const tmdbKey = document.getElementById('us-tmdb-key').value.trim();
      const embyServer = document.getElementById('us-emby-server').value.trim().replace(/\/$/, '');
      const embyKey = document.getElementById('us-emby-key').value.trim();
      const bangumiToken = document.getElementById('us-bangumi-token').value.trim();

      GM_setValue('tmdb_api_key', tmdbKey);
      GM_setValue('emby_server', embyServer);
      GM_setValue('emby_api_key', embyKey);
      GM_setValue('bangumi_token', bangumiToken);

      alert('Settings saved. Refreshing page...');
      this.close();
      location.reload();
    }

    close() {
      const el = document.getElementById(this.id);
      if (el) el.remove();
    }
  }

  // --- Handler: GYG ---
  class GYGHandler {
    init() {
      Utils.log('Initializing GYG Handler');
      const metaContainer = document.querySelector('.main-ui-meta');
      const ratingSection = document.querySelector('.ratings-section');
      if (!metaContainer || !ratingSection) return;

      const titleEl = document.querySelector('.main-meta > .img > picture > img');
      const yearEl = metaContainer.querySelector('h1 .year');
      if (!titleEl) return;

      let titleRaw = titleEl.alt.replace(/第.季/g, '').trim();
      let yearRaw = yearEl ? yearEl.textContent.replace(/[()]/g, '').trim() : '';

      const wrapper = document.createElement('div');
      wrapper.className = 'tmdb-wrapper';
      ratingSection.appendChild(wrapper);

      this.render(titleRaw, yearRaw, wrapper);
    }

    async render(title, year, wrapper) {
      wrapper.innerHTML = '<div class="gyg-card" style="text-align:center; color:#999; font-size:12px;">Searching TMDB...</div>';
      const results = await Services.tmdb.search(title, year);

      if (results.length === 0) {
        wrapper.innerHTML = '<div class="gyg-card"><div style="font-size:12px; color:#999; text-align:center;">No TMDB Data</div></div>';
        return;
      }

      // Default to first result
      this.renderCard(results[0], wrapper, results);
    }

    renderCard(item, wrapper, allResults) {
      const isMovie = item.media_type === 'movie';
      const title = item.title || item.name;
      const date = item.release_date || item.first_air_date || '????';
      const yearStr = date.split('-')[0];
      const score = item.vote_average ? item.vote_average.toFixed(1) : '0.0';
      const tmdbUrl = `https://www.themoviedb.org/${item.media_type}/${item.id}`;
      const copyText = `${title} (${yearStr})`;

      // Selector if multiple results
      let selectorHtml = '';
      if (allResults.length > 1) {
        let options = allResults.map((r, idx) => {
          const rTitle = r.title || r.name;
          const rDate = (r.release_date || r.first_air_date || '').split('-')[0];
          return `<option value="${idx}" ${r.id === item.id ? 'selected' : ''}>${rTitle} (${rDate})</option>`;
        }).join('');
        selectorHtml = `<select class="result-selector" style="width:100%; padding:4px; margin-bottom:5px;">${options}</select>`;
      }

      const html = `
                ${selectorHtml}
                <div class="gyg-card tmdb-card">
                    <div class="tmdb-header-row" onclick="window.open('${tmdbUrl}', '_blank')" title="Go to TMDB">
                        <div class="rating-auto"><span class="freshness" style="color:#01b4e4">${score}</span></div>
                        <span class="tmdb-source">TMDB</span>
                    </div>
                    <div class="tmdb-copy-area" id="tmdb-copy-btn" title="Copy: ${copyText}">
                        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${copyText}</span>
                        <span class="copy-icon">📋</span>
                        <span class="copy-toast">Copied</span>
                    </div>
                </div>
                <div class="gyg-card emby-card" id="emby-card-container">
                    <span class="emby-label">Emby</span>
                    <span class="emby-badge emby-loading">Checking...</span>
                </div>
            `;
      wrapper.innerHTML = html;

      // Events
      const selector = wrapper.querySelector('.result-selector');
      if (selector) {
        selector.addEventListener('change', (e) => {
          this.renderCard(allResults[e.target.value], wrapper, allResults);
        });
      }

      wrapper.querySelector('#tmdb-copy-btn').addEventListener('click', function () {
        Utils.copyToClipboard(copyText, () => {
          const toast = this.querySelector('.copy-toast');
          toast.classList.add('show');
          setTimeout(() => toast.classList.remove('show'), 1500);
        });
      });

      this.checkEmby(item.id, wrapper);
    }

    async checkEmby(tmdbId, wrapper) {
      const container = wrapper.querySelector('#emby-card-container');
      const badge = container.querySelector('.emby-badge');

      const embyItem = await Services.emby.checkExistence(tmdbId);
      if (embyItem) {
        badge.className = 'emby-badge emby-yes';
        badge.textContent = 'Exists';
        const embyLink = `${CONFIG.emby.server}/web/index.html#!/item?id=${embyItem.Id}&serverId=${embyItem.ServerId}`;
        container.onclick = () => window.open(embyLink, '_blank');
        container.title = "Play on Emby";
      } else {
        badge.className = 'emby-badge emby-no';
        badge.textContent = 'Not Found';
        container.style.cursor = 'default';
        container.onclick = null;
        container.removeAttribute('title');
      }
    }
  }

  // --- Handler: GYG List ---
  class GYGListHandler {
    init() {
      Utils.log('Initializing GYG List Handler');
      // Style
      Utils.addStyle(`
        .gyg-emby-dot {
            position: absolute;
            top: 6px;
            left: 6px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            z-index: 100;
            cursor: default;
            box-shadow: 0 0 4px rgba(0,0,0,0.5);
            border: 2px solid white;
            transition: all 0.3s ease;
        }
        .gyg-emby-dot.loading {
             background-color: #999;
             animation: emby-pulse 1.5s infinite;
        }
        .gyg-emby-dot.found {
            background-color: #52B54B;
            cursor: pointer;
            width: 16px;
            height: 16px;
            box-shadow: 0 0 8px rgba(82, 181, 75, 0.6);
        }
        .gyg-emby-dot.found:hover {
            transform: scale(1.2);
        }
        @keyframes emby-pulse {
            0% { transform: scale(0.9); opacity: 0.7; }
            50% { transform: scale(1.1); opacity: 1; }
            100% { transform: scale(0.9); opacity: 0.7; }
        }
      `);

      this.processCards();

      this.observe();
    }

    observe() {
      const observer = new MutationObserver((mutations) => {
        let added = false;
        for (const m of mutations) {
          if (m.addedNodes.length) added = true;
        }
        if (added) this.processCards();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    processCards() {
      const cards = document.querySelectorAll('li .li-img.cover');
      cards.forEach(imgDiv => {
        const li = imgDiv.closest('li');
        if (!li) return;

        // Use a unique attribute to avoid double processing
        if (li.dataset.gygEmbyChecked) return;
        li.dataset.gygEmbyChecked = 'true';

        // Fire and forget check
        this.checkCard(li, imgDiv);
      });
    }

    async checkCard(li, imgDiv) {
      // Find Title
      const titleEl = li.querySelector('.li-bottom h3 a');
      if (!titleEl) return;

      let rawTitle = titleEl.getAttribute('title') || titleEl.textContent;
      rawTitle = rawTitle ? rawTitle.trim() : '';

      // Find Year
      const tagEl = li.querySelector('.li-bottom .tag');
      let year = '';
      if (tagEl) {
        const parts = tagEl.textContent.split('/');
        year = parts[0].trim();
      }

      // Title Cleaning
      let cleanTitle = rawTitle;

      // Regex to detect "Season N", "第N季", "S5"
      const seasonRegex = /(?:[\s:：(（\[【]|^)(?:第[0-9一二三四五六七八九十]+季|Season\s*\d+|S\d+).*/i;

      let yearParam = year;
      if (seasonRegex.test(rawTitle)) {
        cleanTitle = rawTitle.replace(seasonRegex, '').trim();
      }

      // Add Loading Dot
      const dot = this.createDot(imgDiv);
      dot.className = 'gyg-emby-dot loading';
      dot.title = `Checking ${cleanTitle}...`;

      try {
        const results = await Services.tmdb.search(cleanTitle, yearParam);

        // Strategy: First pass with Year. If not found and we strongly filtered (like season removal), maybe retry?
        // For now, let's trust the search with year.

        let found = false;
        if (results.length > 0) {
          // Try the first match
          const bestMatch = results[0];
          const embyItem = await Services.emby.checkExistence(bestMatch.id);

          if (embyItem) {
            found = true;
            this.updateDotSuccess(dot, embyItem);
          }
        }

        if (!found) {
          dot.remove();
        }

      } catch (e) {
        console.error('GYG Check Error:', e);
        dot.remove();
      }
    }

    createDot(container) {
      const dot = document.createElement('div');
      // Ensure absolute works
      const style = window.getComputedStyle(container);
      if (style.position === 'static') {
        container.style.position = 'relative';
      }
      container.appendChild(dot);
      return dot;
    }

    updateDotSuccess(dot, embyItem) {
      dot.className = 'gyg-emby-dot found';
      dot.title = `Play ${embyItem.Name} on Emby`;
      const embyLink = `${CONFIG.emby.server}/web/index.html#!/item?id=${embyItem.Id}&serverId=${embyItem.ServerId}`;
      dot.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.open(embyLink, '_blank');
      };
    }
  }

  // --- Handler: Douban Subject ---
  class DoubanSubjectHandler {
    constructor() {
      this.doubanId = location.href.match(/subject\/(\d+)/)?.[1];
    }

    init() {
      Utils.log('Initializing Douban Subject Handler');
      if (!this.doubanId) return;

      this.addResourcePanel();
      this.fetchRatings();
      this.addCopyInfo();
    }

    addResourcePanel() {
      // Add panel to the side
      const aside = document.querySelector('#content .aside');
      if (!aside) return;

      const title = document.title.replace('(豆瓣)', '').trim();
      const gygUrl = `https://www.gyg.si/s/1---1/${encodeURIComponent(title)}`;
      const bt4gUrl = `https://bt4gprx.com/search?orderby=size&p=1&q=${encodeURIComponent(title)}`;

      // 1. Resource Search Card
      const gygCardHtml = `
            <div class="douban-aside-box" style="margin-bottom:15px;">
                 <div class="gyg-card" style="padding: 15px;">
                     <div class="douban-gyg-header">
                         <span class="douban-gyg-title">Resource Search</span>
                     </div>
                     <div class="douban-gyg-content" style="flex-direction: column; gap: 8px;">
                         <a href="${gygUrl}" target="_blank" class="douban-gyg-link" style="width:100%; justify-content:center; padding:5px 0; background:#f5f5f5; border-radius:4px;">
                            <img src="https://www.gyg.si/favicon.ico" style="width:16px; height:16px; margin-right:5px; border-radius: 3px;"> GYG Search
                         </a>
                         <a href="${bt4gUrl}" target="_blank" class="douban-gyg-link" style="width:100%; justify-content:center; padding:5px 0; background:#f5f5f5; border-radius:4px;">
                            <span style="margin-right:5px;">🔍</span> BT4G Search
                         </a>
                     </div>
                 </div>
            </div>
      `;

      // 2. Emby Status Card
      const embyCardHtml = `
            <div class="douban-aside-box" style="margin-bottom:30px;">
                 <div class="gyg-card" style="padding: 15px;">
                     <div class="douban-gyg-header">
                         <span class="douban-gyg-icon" style="background:#52B54B; display:inline-block; text-align:center; line-height:16px; color:white; font-size:10px;">E</span>
                         <span class="douban-gyg-title">Emby Status</span>
                     </div>
                     <div class="douban-gyg-content" id="douban-emby-container" style="justify-content:center;">
                         <span id="douban-emby-status" style="color:#999; font-size:12px;">Checking...</span>
                     </div>
                 </div>
            </div>
      `;

      aside.insertAdjacentHTML('afterbegin', embyCardHtml);
      aside.insertAdjacentHTML('afterbegin', gygCardHtml);

      this.checkEmbyStatus(title);
    }

    async checkEmbyStatus(title) {
      const yearEl = document.querySelector('#content .year');
      const year = yearEl ? yearEl.textContent.replace(/[()]/g, '') : '';
      const statusEl = document.querySelector('#douban-emby-status');
      const container = document.querySelector('#douban-emby-container');

      try {
        const results = await Services.tmdb.search(title, year);
        if (results.length > 0) {
          const bestMatch = results[0];
          const embyItem = await Services.emby.checkExistence(bestMatch.id);

          if (embyItem) {
            const embyLink = `${CONFIG.emby.server}/web/index.html#!/item?id=${embyItem.Id}&serverId=${embyItem.ServerId}`;
            statusEl.innerHTML = `<span style="color:#52B54B; font-weight:bold;">Example in Library</span>`;

            // Update container to be clickable
            container.innerHTML = `
                        <a href="${embyLink}" target="_blank" class="douban-gyg-link" style="width:100%; justify-content:center; padding:5px 0; background:#eaffea; border:1px solid #52B54B; border-radius:4px; color:#52B54B;">
                            ▶ Play Now
                        </a>
                    `;
          } else {
            statusEl.innerHTML = `<span style="color:#999;">Not Found in Library</span>`;
          }
        } else {
          statusEl.textContent = 'TMDB Match Failed';
        }
      } catch (e) {
        console.error(e);
        statusEl.textContent = 'Check Error';
      }
    }

    addCopyInfo() {
      const infoDiv = document.querySelector('#info');
      if (!infoDiv) return;

      infoDiv.insertAdjacentHTML('beforeend', '<br><span class="pl">Script: </span><a href="javascript:void(0);" id="copy-movie-info">Copy Info</a>');

      const btn = document.querySelector('#copy-movie-info');
      btn.addEventListener('click', () => {
        // Construct the info text
        let text = `◎Title　${document.title.replace('(豆瓣)', '').trim()}\n`;

        const yearEl = document.querySelector('#content .year');
        if (yearEl) {
          const year = yearEl.textContent.replace(/[()]/g, '');
          text += `◎Year　${year}\n`;
        }

        text += `◎Link　${location.href}\n`;

        const imdbLinkEl = document.querySelector('#info a[href^="https://www.imdb.com/title/"]');
        if (imdbLinkEl) {
          text += `◎IMDb　${imdbLinkEl.textContent.trim()}\n`;
        }

        const ratingEl = document.querySelector('strong.ll.rating_num');
        if (ratingEl) {
          text += `◎Douban Rating　${ratingEl.textContent.trim()}/10\n`;
        }

        const introEl = document.querySelector('span[property="v:summary"]');
        if (introEl) {
          const intro = introEl.textContent.trim().replace(/\s+/g, ' ').substr(0, 150);
          text += `◎Intro　${intro}...\n`;
        }

        Utils.copyToClipboard(text, () => {
          const originalText = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(() => btn.textContent = originalText, 2000);
        });
      });
    }

    async fetchRatings() {
      // Check for IMDb link
      const imdbLinkEl = document.querySelector('#info a[href^="https://www.imdb.com/title/"]');
      if (imdbLinkEl) {
        const imdbId = imdbLinkEl.textContent.trim();
        const interestSectl = document.querySelector('#interest_sectl');

        const ratingDiv = document.createElement('div');
        ratingDiv.className = 'rating_wrap clearbox';
        ratingDiv.id = 'imdb-rating-box';
        interestSectl.appendChild(ratingDiv);

        try {
          const data = await Services.imdb.getRating(imdbId);
          if (data && data.aggregateRating) {
            const score = data.aggregateRating.ratingValue;
            const count = data.aggregateRating.ratingCount;
            ratingDiv.innerHTML = `
                            <div class="rating_logo">IMDb Rating</div>
                            <div class="rating_self clearfix">
                                <strong class="ll rating_num">${score}</strong>
                                <div class="rating_right">
                                    <a href="https://www.imdb.com/title/${imdbId}/" target="_blank">${count} votes</a>
                                </div>
                            </div>
                        `;
          }
        } catch (e) {
          console.error('IMDb check failed', e);
        }
      }
    }
  }

  // --- Handler: Douban List (Explore, TV, Chart) ---
  class DoubanListHandler {
    constructor() {
      this.strategies = [
        {
          // Scenario 1: Explore / TV (React App)
          name: 'Explore/TV',
          itemSelector: '.drc-subject-card',
          titleSelector: '.drc-subject-info-title-text',
          yearSelector: '.drc-subject-info-subtitle',
          insertPos: 'afterend', // Insert after the title element
          getYear: (el) => {
            const text = el ? el.textContent : '';
            return text.split('/').map(t => t.trim())[0] || '';
          },
          getType: (card) => {
            if (card.classList.contains('tv')) return 'tv';
            if (card.classList.contains('movie')) return 'movie';
            return null;
          }
        },
        {
          // Scenario 2: Chart (Classic HTML)
          name: 'Chart',
          itemSelector: 'tr.item',
          titleSelector: 'div.pl2 > a',
          yearSelector: 'p.pl',
          insertPos: 'afterend',
          getYear: (el) => {
            // Format: "2024-05-01(China) / ..." or "2023 / ..."
            const text = el ? el.textContent : '';
            const match = text.match(/(\d{4})/);
            return match ? match[1] : '';
          },
          getType: (card) => 'movie'
        },
        {
          // Scenario 3: Subject Collection (m.douban.com)
          name: 'SubjectCollection',
          itemSelector: '.frc-swiper-card',
          titleSelector: '.frc-subject-info-title',
          yearSelector: '.frc-subject-info-content',
          insertPos: 'beforeend', // Inside H3 to sit next to title
          getYear: (el) => {
            const text = el ? el.textContent : '';
            return text.split('/').map(t => t.trim())[0] || '';
          },
          getType: (card) => {
            let parent = card.parentElement;
            while (parent && parent !== document.body) {
              if (parent.classList.contains('tv')) return 'tv';
              if (parent.classList.contains('movie')) return 'movie';
              parent = parent.parentElement;
            }
            return null;
          }
        }
      ];
    }

    init() {
      Utils.log('Initializing Douban List Handler');
      Utils.addStyle(`
            .emby-status-tag {
                display: inline-block;
                padding: 1px 4px;
                margin-left: 6px;
                border-radius: 3px;
                font-size: 11px;
                font-weight: normal;
                line-height: 14px;
                vertical-align: text-bottom;
            }
            .emby-tag-yes { background: #eaffea; color: #52B54B; border: 1px solid #52B54B; cursor: pointer; }
            .emby-tag-search { background: #eef9fd; color: #01b4e4; border: 1px solid #01b4e4; cursor: pointer; }
            .emby-tag-loading { background: #f0f0f0; color: #999; border: 1px solid #ddd; }
          `);

      this.observe();
    }

    observe() {
      this.processExistingCards();

      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.addedNodes.length) {
            this.processExistingCards();
          }
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
    }

    processExistingCards() {
      // Iterate over all strategies to find matching items
      this.strategies.forEach(strategy => {
        const cards = document.querySelectorAll(strategy.itemSelector);
        if (cards.length > 0) Utils.log(`Strategy ${strategy.name}: Found ${cards.length} cards`);

        cards.forEach(card => {
          const titleEl = card.querySelector(strategy.titleSelector);
          if (!titleEl) return;

          // Get raw title for comparison
          let rawTitle = '';

          if (strategy.name === 'Explore/TV') {
            rawTitle = titleEl.textContent.trim();
          } else if (strategy.name === 'SubjectCollection') {
            rawTitle = Array.from(titleEl.childNodes)
              .filter(n => n.nodeType === 3) // Text nodes
              .map(n => n.textContent)
              .join('').trim();
            if (!rawTitle) rawTitle = titleEl.textContent.trim(); // Fallback
          } else {
            // Chart
            rawTitle = titleEl.childNodes[0].textContent.trim().split('/')[0].trim();
          }

          // Check if already processed and title matches
          if (card.getAttribute('data-gyg-title') === rawTitle) {
            return;
          }

          this.processCard(card, strategy, rawTitle);
        });
      });
    }

    async processCard(card, strategy, rawTitle) {
      // Mark as processed with current title
      card.setAttribute('data-gyg-title', rawTitle);
      // Remove potential partial tag from previous recycle
      const oldTag = card.querySelector('.emby-status-tag');
      if (oldTag) oldTag.remove();

      const titleEl = card.querySelector(strategy.titleSelector);
      const yearEl = card.querySelector(strategy.yearSelector);

      // Clean TV Season suffixes (e.g. "怪奇物语 第五季" -> "怪奇物语")
      let cleanTitle = rawTitle;
      let useYear = strategy.getYear(yearEl);
      const mediaType = strategy.getType ? strategy.getType(card) : null;

      // Regex to detect "Season N", "第N季", "S5"
      // Matches: space/separator + indicator + rest of string
      const seasonRegex = /(?:[\s:：(（\[【]|^)(?:第[0-9一二三四五六七八九十]+季|Season\s*\d+|S\d+).*/i;

      if (seasonRegex.test(rawTitle)) {
        cleanTitle = rawTitle.replace(seasonRegex, '').trim();
        useYear = ''; // Don't filter by year
      }

      Utils.log(`Processing: ${cleanTitle} (${useYear || 'No Year'})`);

      // Insert loading tag
      const tagId = `emby-tag-${Math.random().toString(36).substr(2, 9)}`;
      const badgeHtml = `<span id="${tagId}" class="emby-status-tag emby-tag-loading" title="Checking Emby...">E</span>`;

      if (strategy.insertPos === 'afterend') {
        titleEl.insertAdjacentHTML('afterend', badgeHtml);
      } else if (strategy.insertPos === 'beforeend') {
        titleEl.insertAdjacentHTML('beforeend', badgeHtml);
      } else {
        titleEl.appendChild(document.createRange().createContextualFragment(badgeHtml));
      }

      const tagEl = document.getElementById(tagId);
      if (!tagEl) return; // Safety check

      const showSearch = () => {
        const gygUrl = `https://www.gyg.si/s/1---1/${encodeURIComponent(cleanTitle)}`;
        tagEl.className = 'emby-status-tag emby-tag-search';
        tagEl.textContent = 'GYG';
        tagEl.title = 'Search on GYG';
        tagEl.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          window.open(gygUrl, '_blank');
        };

        // Add BT4G Tag
        const bt4gId = `${tagId}-bt4g`;
        if (!document.getElementById(bt4gId)) {
          const bt4gUrl = `https://bt4gprx.com/search?orderby=size&p=1&q=${encodeURIComponent(cleanTitle)}`;
          const bt4gHtml = `<span id="${bt4gId}" class="emby-status-tag emby-tag-search" title="Search on BT4G" style="margin-left: 2px;">BT4G</span>`;
          tagEl.insertAdjacentHTML('afterend', bt4gHtml);

          const bt4gEl = document.getElementById(bt4gId);
          if (bt4gEl) {
            bt4gEl.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(bt4gUrl, '_blank');
            };
          }
        }
      };

      try {
        const results = await Services.tmdb.search(cleanTitle, useYear, mediaType);
        if (results.length > 0) {
          const bestMatch = results[0];
          const embyItem = await Services.emby.checkExistence(bestMatch.id);
          if (embyItem) {
            Utils.log(`Emby Found: ${cleanTitle}`);
            const embyLink = `${CONFIG.emby.server}/web/index.html#!/item?id=${embyItem.Id}&serverId=${embyItem.ServerId}`;
            tagEl.className = 'emby-status-tag emby-tag-yes';
            tagEl.textContent = 'Emby';
            tagEl.title = 'Click to Play on Emby';
            tagEl.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(embyLink, '_blank');
            };
          } else {
            Utils.log(`Emby Not Found: ${cleanTitle}, showing GYG`);
            showSearch();
          }
        } else {
          Utils.log(`TMDB Not Found: ${cleanTitle}, showing GYG`);
          showSearch();
        }
      } catch (e) {
        console.error(e);
        showSearch();
      }
    }
  }



  // --- Handler: DMHY List ---
  class DmhyListHandler {
    init() {
      Utils.log('Initializing DMHY List Handler');
      Utils.addStyle(`
        table#topic_list tr td span.tag { display: none; }
        .dmhy-emby-dot {
            display: inline-block;
            width: 10px;
            height: 10px;
            background-color: #52B54B;
            border-radius: 50%;
            margin-right: 5px;
            cursor: pointer;
            box-shadow: 0 0 4px rgba(0,0,0,0.3);
            vertical-align: middle;
        }
        .dmhy-emby-dot.loading {
            background-color: #ccc;
            animation: emby-pulse 1.5s infinite;
        }
        .us-tag {
            display: inline-block;
            padding: 2px 6px;
            margin: 0 2px;
            border-radius: 4px;
            font-size: 11px;
            color: white;
            line-height: 1.2;
            vertical-align: middle;
        }
        .us-tag-group { background-color: #4A90E2; margin-right: 5px; }
        .us-tag-res { background-color: #F5A623; }
        .us-tag-fmt { background-color: #7ED321; }
        .us-tag-sub { background-color: #9013FE; }
        
        /* Log Viewer Overlay */
        .us-log-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); z-index: 10000;
            display: flex; justify-content: center; align-items: center;
        }
        .us-log-modal {
            background: white; width: 700px; max-height: 85vh;
            border-radius: 8px; padding: 20px;
            display: flex; flex-direction: column;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            font-family: sans-serif;
        }
        .us-log-content {
            flex: 1; overflow-y: auto; background: #f8f9fa;
            padding: 15px; border-radius: 4px; border: 1px solid #e9ecef;
            margin: 10px 0; font-family: 'Consolas', 'Monaco', monospace; 
            font-size: 12px; color: #333; line-height: 1.5;
        }
        .us-log-entry { margin-bottom: 12px; border-bottom: 1px dashed #eee; padding-bottom: 8px; }
        .us-log-time { color: #888; font-size: 11px; margin-right: 8px; }
        .us-log-step { font-weight: bold; color: #007bff; }
        .us-log-info { margin-top: 4px; white-space: pre-wrap; word-break: break-all; }
        .us-log-json { 
            background: #fff; border: 1px solid #ddd; border-radius: 4px;
            padding: 5px; margin-top: 5px; max-height: 200px; overflow-y: auto;
        }
        details > summary { cursor: pointer; color: #666; font-style: italic; outline: none; }
        details[open] > summary { color: #333; font-style: normal; margin-bottom: 5px; }
      `);

      this.processRows();
    }

    processRows() {
      // DMHY table selector assumption: id="topic_list" > tbody > tr
      const rows = document.querySelectorAll('table#topic_list tbody tr');
      Utils.log(`DMHY: Found ${rows.length} rows`);

      rows.forEach(tr => {
        const titleLink = tr.querySelector('td.title > a');
        if (!titleLink) return;

        // Avoid reprocessing
        if (tr.dataset.usChecked) return;
        tr.dataset.usChecked = 'true';

        this.checkRow(tr, titleLink);
      });
    }

    async checkRow(tr, link) {
      const rawTitle = link.textContent.trim();

      // Process Log Record
      const processLog = [];
      const log = (step, data) => {
        processLog.push({ time: new Date().toLocaleTimeString(), step, data });
      };

      log('Original Title', rawTitle);

      const parsed = this.parseTitle(rawTitle);
      log('Title Parsed', parsed);

      const cleanTitle = parsed.title;

      // Add loading/status indicator (The Emby Dot)
      const dot = document.createElement('span');
      dot.className = 'dmhy-emby-dot loading';
      dot.title = `Checking ${cleanTitle}... \nClick for details.`;
      // Default Click: Show Logs
      dot.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showLogViewer(cleanTitle, processLog);
      };
      link.parentNode.insertBefore(dot, link);

      // Update UI if valid
      if (cleanTitle) {
        link.innerHTML = ''; // Clear content

        const addTag = (text, type, prepend = false) => {
          if (!text) return;
          const span = document.createElement('span');
          span.className = `us-tag us-tag-${type}`;
          span.textContent = text;
          if (prepend) link.prepend(span);
          else link.appendChild(span);
        };

        // Order: [Title] [Group] [Res] [Fmt] [Sub]
        link.appendChild(document.createTextNode(cleanTitle + ' ')); // Title first

        if (parsed.group) addTag(parsed.group, 'group'); // Group after title
        addTag(parsed.res, 'res');
        addTag(parsed.fmt, 'fmt');
        addTag(parsed.sub, 'sub');
      }

      if (!cleanTitle) return;

      try {
        let searchTitle = cleanTitle;
        let mediaType = 'tv'; // Default type

        // Step 0: Optimize with Bangumi
        if (CONFIG.bangumi.token) {
          log('API Request [Bangumi]', {
            method: 'POST',
            url: 'https://api.bgm.tv/v0/search/subjects',
            body: { keyword: cleanTitle, filter: { type: [2] } }
          });

          const bgmSubject = await Services.bangumi.search(cleanTitle);
          if (bgmSubject) {
            log('API Response [Bangumi]', bgmSubject);

            searchTitle = bgmSubject.name_cn || bgmSubject.name;

            // Detect Media Type (Movie vs TV)
            // eps = 1 usually implies Movie/OVA, so we prioritize 'movie' search in TMDB?
            // User requested: try to get media type from bangumi response
            if (bgmSubject.eps === 1) {
              mediaType = 'movie';
              log('Strategy', `Bangumi eps=1, switching TMDB search to 'movie'`);
            } else {
              log('Strategy', `Bangumi eps=${bgmSubject.eps}, keeping TMDB search as 'tv'`);
            }

            log('Query Optimized', `${cleanTitle} -> ${searchTitle}`);
            dot.title = `Checking ${searchTitle} (${mediaType})...`;
          } else {
            log('API Response [Bangumi]', 'No result found');
          }
        } else {
          log('Skipped', 'Bangumi token not configured');
        }

        // Step 1: Search TMDB
        log('API Request [TMDB]', {
          method: 'GET',
          url: `${CONFIG.tmdb.baseUrl}/search/multi`,
          params: { query: searchTitle, type: mediaType } // internal Service logic might differ, but logging intent
        });

        // Pass mediaType to search
        const results = await Services.tmdb.search(searchTitle, '', mediaType);
        log('API Response [TMDB]', { count: results.length, top_result: results[0] || null });

        if (results.length > 0) log('TMDB Top Match', results[0]);

        let found = false;
        let embyItem = null;

        if (results.length > 0) {
          const bestMatch = results[0];

          // Check Emby
          log('API Request [Emby]', {
            method: 'GET',
            url: `${CONFIG.emby.server}/emby/Items`,
            params: { ProviderId: `tmdb.${bestMatch.id}` }
          });

          embyItem = await Services.emby.checkExistence(bestMatch.id);
          log('API Response [Emby]', embyItem || 'Not Found');

          if (embyItem) {
            found = true;
            dot.className = 'dmhy-emby-dot';
            dot.style.backgroundColor = '#52B54B'; // Green for found
            dot.title = `Exists in Emby: ${embyItem.Name}`;

            dot.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              this.showLogViewer(cleanTitle, processLog, embyItem);
            };
          }
        }

        if (!found) {
          dot.className = 'dmhy-emby-dot';
          dot.style.backgroundColor = '#ccc'; // Grey for not found
          dot.title = `Not found in Emby.\nChecked as ${mediaType}`;
          dot.classList.remove('loading');
        }

      } catch (e) {
        console.error('DMHY Check Error:', e);
        log('Error', e.toString());
        dot.className = 'dmhy-emby-dot';
        dot.style.backgroundColor = 'red'; // Red for error
        dot.title = `Error checking.\nClick to view logs.`;
        dot.classList.remove('loading');
      }
    }

    parseTitle(raw) {
      let title = raw;
      let group = '';
      let res = '';
      let sub = '';
      let fmt = '';

      // 1. Extract Group (Brackets at start)
      const groupMatch = title.match(/^(?:\[|【)([^\]】]+)(?:\]|】)/);
      if (groupMatch) {
        group = groupMatch[1];
        title = title.replace(groupMatch[0], ' ');
      }

      // 2. Extract Resolution
      const resMatch = title.match(/(?:1080[pP]|720[pP]|2160[pP]|4[kK])/);
      if (resMatch) {
        res = resMatch[0];
        title = title.replace(new RegExp(resMatch[0], 'i'), ' ');
      }

      // 3. Extract Format
      const fmtKeywords = ['AVC', 'HEVC', 'x264', 'x265', 'MP4', 'MKV', 'WebRip', 'BDRip', 'AAC', 'OPUS', '10bit', '8bit'];
      const foundFmts = [];
      fmtKeywords.forEach(k => {
        const regex = new RegExp(k, 'i');
        if (regex.test(title)) {
          foundFmts.push(k);
          title = title.replace(regex, ' ');
        }
      });
      fmt = foundFmts.join(' ');

      // 4. Extract Subtitles
      const subKeywords = ['CHS', 'CHT', 'GB', 'BIG5', 'JPN', 'ENG', '简', '繁', '日', '双语', '内封', '外挂'];
      title = title.replace(/(?:\[|【|\()([^\]】)]+)(?:\]|】|\))/g, (match, content) => {
        const up = content.toUpperCase();
        if (subKeywords.some(k => up.includes(k))) {
          sub += ' ' + content;
          return ' ';
        }
        return match;
      });

      // 5. Clean Main Title (Scoring Logic)
      const scoreStr = (str) => {
        let s = 0; if (!str) return -999;
        const lower = str.toLowerCase();
        if (/[\u4e00-\u9fa5]/.test(str)) s += 15;
        if (str.includes('/')) s += 5;
        const len = str.length;
        if (len >= 2) s += Math.min(len, 20) * 0.5;
        let techCount = 0;
        if (/(?:1080p|720p|mkv|mp4|avc|hevc|aac|opus|bdrip|web-dl|remux|fin|v\d|av1)/.test(lower)) techCount = 1;
        if (/(?:字幕组|搬运|新番|合集|整理|发布|制作|招募|staff)/i.test(str)) s -= 20;
        if (techCount > 0) s -= 5;
        return s;
      };

      const blockRegex = /(?:\[[^\]]+\]|【[^】]+】|★[^★]+★|\([^\)]+\))/g;
      const blocks = title.match(blockRegex) || [];
      const naked = title.replace(blockRegex, ' ').trim();

      let bestStr = naked;
      let maxScore = scoreStr(naked);
      if (naked.length < 2 && !/[\u4e00-\u9fa5]/.test(naked)) maxScore -= 10;

      blocks.forEach(b => {
        const content = b.slice(1, -1);
        const score = scoreStr(content);
        if (score > maxScore) { maxScore = score; bestStr = content; }
      });
      title = bestStr;

      // Standardize & Remove noise
      title = title.replace(/[|／_]/g, '/');
      const techKeywords = /(?:1080p|720p|2160p|4k|web|bdrip|avc|hevc|aac|mp4|mkv|big5|chs|cht|jpn|eng|s\d+|season|fin|opus|x264|x265|10bit|tv动画|剧场版|ova|cd|others)/gi;
      title = title.replace(techKeywords, ' ');
      title = title.replace(/第\s*\d+(\-\d+)?\s*[话集季]/g, ' ');
      title = title.replace(/\s\d+-\d+/g, ' ');
      title = title.replace(/\[\d+(?:-\d+)?\]/g, ' ');

      if (title.includes('/')) {
        const parts = title.split('/').map(p => p.trim());
        const cnPart = parts.find(p => /[\u4e00-\u9fa5]/.test(p) && p.length > 1);
        if (cnPart) title = cnPart; else title = parts[0];
      }

      title = title.split('：')[0];
      const parenMatch = title.match(/^([\u4e00-\u9fa5\s\w:-]+)\s*[\(（]/);
      if (parenMatch) title = parenMatch[1];

      title = title.replace(/[\[\]【】()（）★]/g, ' ').replace(/\s+/g, ' ').trim();

      return {
        title, group: group.trim(), res: res.trim(), sub: sub.trim(), fmt: fmt.trim()
      };
    }

    showLogViewer(title, logs, embyItem = null) {
      const id = 'us-log-viewer';
      const existing = document.getElementById(id);
      if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.id = id;
      overlay.className = 'us-log-overlay';
      overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
      };

      let embyAction = '';
      if (embyItem) {
        const embyLink = `${CONFIG.emby.server}/web/index.html#!/item?id=${embyItem.Id}&serverId=${embyItem.ServerId}`;
        embyAction = `
                <div style="margin-bottom: 15px; padding: 12px; background: #e8f5e9; border: 1px solid #c8e6c9; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #2e7d32; font-weight: bold; font-size:14px;">✅ Found in Emby: ${embyItem.Name}</span>
                    <a href="${embyLink}" target="_blank" class="us-button us-button-primary" style="text-decoration: none;">Open in Emby</a>
                </div>
            `;
      } else {
        embyAction = `
                <div style="margin-bottom: 15px; padding: 12px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 6px; color: #666;">
                    ❌ Not found in Emby Library
                </div>
            `;
      }

      const logHtml = logs.map(l => {
        let content = '';
        if (l.data && typeof l.data === 'object') {
          const json = JSON.stringify(l.data, null, 2);
          content = `
                    <details>
                        <summary>View Data</summary>
                        <div class="us-log-json">${json}</div>
                    </details>
                `;
        } else if (l.data) {
          content = `<div class="us-log-info">${l.data}</div>`;
        }
        return `
                <div class="us-log-entry">
                    <div><span class="us-log-time">${l.time}</span><span class="us-log-step">${l.step}</span></div>
                    ${content}
                </div>
            `;
      }).join('');

      overlay.innerHTML = `
            <div class="us-log-modal">
                <h3 style="margin:0 0 15px 0; font-size:18px; border-bottom:1px solid #eee; padding-bottom:10px;">
                    Trace: <span style="font-weight:normal;">${title}</span>
                </h3>
                ${embyAction}
                <div class="us-log-content">${logHtml}</div>
                <div style="display:flex; justify-content:flex-end;">
                     <button class="us-button us-button-secondary" onclick="document.getElementById('${id}').remove()">Close</button>
                </div>
            </div>
        `;
      document.body.appendChild(overlay);
    }
  }

  // --- Handler: Cache Settings ---
  class CacheHandler {
    constructor() {
      this.id = 'us-cache-overlay';
    }

    showPanel() {
      if (document.getElementById(this.id)) return;

      const overlay = document.createElement('div');
      overlay.id = this.id;
      overlay.className = 'us-settings-overlay';
      overlay.innerHTML = `
            <div class="us-settings-modal" style="width: 320px;">
                <h3 style="margin-top:0; margin-bottom:20px;">清除缓存 / Clear Cache</h3>
                
                <div class="us-settings-row" style="margin-bottom:15px;">
                   <div style="display:flex; flex-direction:column; gap:8px;">
                      <label style="cursor:pointer;"><input type="checkbox" id="us-cache-emby" checked> Emby Data</label>
                      <label style="cursor:pointer;"><input type="checkbox" id="us-cache-tmdb" checked> TMDB Search</label>
                      <label style="cursor:pointer;"><input type="checkbox" id="us-cache-imdb" checked> IMDb Ratings</label>
                   </div>
                </div>

                <div class="us-settings-actions" style="justify-content: space-between; align-items: center;">
                    <span id="us-cache-msg" style="font-size:12px; color:#52B54B; opacity:0; transition:opacity 0.5s;">Done!</span>
                    <div style="display:flex; gap:10px;">
                        <button id="us-btn-close-cache" class="us-button us-button-secondary">Close</button>
                        <button id="us-btn-do-clear" class="us-button us-button-primary">Clear</button>
                    </div>
                </div>
            </div>
        `;

      document.body.appendChild(overlay);

      document.getElementById('us-btn-close-cache').onclick = () => this.close();

      document.getElementById('us-btn-do-clear').onclick = () => {
        const filters = [];
        if (document.getElementById('us-cache-emby').checked) filters.push('emby');
        if (document.getElementById('us-cache-tmdb').checked) filters.push('tmdb');
        if (document.getElementById('us-cache-imdb').checked) filters.push('imdb');

        const count = Cache.clear(filters);
        const msg = document.getElementById('us-cache-msg');
        msg.textContent = `Cleared ${count} items.`;
        msg.style.opacity = '1';
        setTimeout(() => msg.style.opacity = '0', 3000);
      };
    }

    close() {
      const el = document.getElementById(this.id);
      if (el) el.remove();
    }
  }

  // --- Main Entry ---
  GM_registerMenuCommand('设置 / Settings', () => new SettingsHandler().showPanel());
  GM_registerMenuCommand('清除缓存 / Clear Cache', () => new CacheHandler().showPanel());

  const host = location.host;
  Utils.log(`Script Loaded. Host: ${host}, URL: ${location.href}`);

  // Check Config
  if (!CONFIG.tmdb.apiKey) {
    Utils.log('TMDB API Key missing. Please configure in settings.');
    // Optional: Auto-open settings if critical
    // new SettingsHandler().showPanel();
  }

  if (/douban\.com/.test(host)) {
    Utils.log(`Host is douban.com`); // Added log
    const isSubject = /subject\/\d+/.test(location.href);
    const isList = /(explore|tv|chart|subject_collection)/.test(location.href);
    Utils.log(`Detection: isSubject=${isSubject}, isList=${isList}`);

    let handler;
    if (isSubject) {
      Utils.log('Creating DoubanSubjectHandler'); // Added log
      handler = new DoubanSubjectHandler();
    } else if (isList) {
      handler = new DoubanListHandler();
    }

    if (handler) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => handler.init());
      } else {
        handler.init();
      }
    }
  } else if (/gyg\.si/.test(host)) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        new GYGHandler().init();
        new GYGListHandler().init();
      }, 500);
    });
  } else if (/dmhy\.org/.test(host)) {
    window.addEventListener('load', () => {
      new DmhyListHandler().init();
    });
  }

})();
