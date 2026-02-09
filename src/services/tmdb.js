import { CONFIG } from '../config';
import { Utils, Cache } from '../utils';

export const TmdbService = {
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
};
