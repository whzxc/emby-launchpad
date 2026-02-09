import { Utils, Cache } from '../utils';

export const ImdbService = {
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
};
