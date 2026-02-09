import { CONFIG } from '../config';
import { Utils, Cache } from '../utils';

export const BangumiService = {
  search: async function (query) {
    if (!CONFIG.bangumi.token) return null;

    const cacheKey = `bgm_s_${query}`;
    const cached = Cache.get(cacheKey);
    if (cached) return { data: cached, meta: { cached: true } };

    const url = 'https://api.bgm.tv/v0/search/subjects';
    const body = {
      keyword: query,
      filter: { type: [2] } // Anime
    };
    const meta = {
      method: 'POST',
      url: url,
      body: body
    };

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
          data: JSON.stringify(body),
          onload: (r) => resolve(r),
          onerror: (e) => reject(e)
        });
      });

      if (resp.status === 200) {
        const data = JSON.parse(resp.responseText);
        if (data && data.data && data.data.length > 0) {
          const subject = data.data[0];
          // Cache stored as pure value
          Cache.set(cacheKey, subject, 1440); // Cache 24h
          return { data: subject, meta };
        }
      }
      return { data: null, meta, error: `Status ${resp.status}` };
    } catch (e) {
      console.error('Bangumi Search Error:', e);
      return { data: null, meta, error: e };
    }
  }
};

