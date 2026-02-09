import { CONFIG } from '../config';
import { Utils, Cache } from '../utils';

export const EmbyService = {
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
    const fields = 'MediaSources,Path,Overview,CommunityRating,OfficialRating,RecursiveItemCount,ChildCount,MediaStreams';
    const url = `${CONFIG.emby.server}/emby/Items?Recursive=true&AnyProviderIdEquals=${queryId}&Fields=${fields}&api_key=${CONFIG.emby.apiKey}`;
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
};

