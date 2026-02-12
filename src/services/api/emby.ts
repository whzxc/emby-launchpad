import { ApiClient, ApiResponse } from './api-client';
import { CONFIG } from '@/services/config';
import { httpGetJSON } from './http';
import { log } from '@/utils/common';

export interface EmbyItem {
  Id: string;
  Name: string;
  ServerId?: string;
  Type?: string;
  ProductionYear?: number;
  PremiereDate?: string;
  CommunityRating?: number;
  OfficialRating?: string;
  RunTimeTicks?: number;
  Genres?: string[];
  Path?: string;
  ChildCount?: number;
  RecursiveItemCount?: number;
  IndexNumber?: number;
  MediaSources?: Array<{
    Name?: string;
    Container?: string;
    Size?: number;
    Bitrate?: number;
    Path?: string;
    MediaStreams?: Array<{
      Type?: string;
      Language?: string;
      DisplayTitle?: string;
      Codec?: string;
      Width?: number;
      Height?: number;
      BitRate?: number;
      BitDepth?: number;
      Channels?: number;
      IsForced?: boolean;
    }>;
  }>;
  Seasons?: EmbyItem[];
}

export class EmbyService extends ApiClient {
  constructor() {
    super('Emby');
  }

  async checkExistence(tmdbId: number): Promise<ApiResponse<EmbyItem | undefined>> {
    const { server, apiKey } = CONFIG.emby as { server: string; apiKey: string };

    if (!server || !apiKey) {
      log('[Emby] Server or API Key not configured');
      return {
        data: undefined,
        meta: { error: 'Emby not configured', source: this.name, timestamp: new Date().toISOString() },
      };
    }

    const queryId = `tmdb.${tmdbId}`;
    const params = new URLSearchParams({
      Recursive: 'true',
      AnyProviderIdEquals: queryId,
      Fields: 'ProviderIds,MediaSources,MediaStreams,ProductionYear,ChildCount,RecursiveItemCount,Path,IndexNumber',
      api_key: apiKey,
    });

    const url = `${server}/emby/Items?${params.toString()}`;
    const cacheKey = this.buildCacheKey('check', tmdbId);

    const result = await this.request<EmbyItem | undefined>({
      requestFn: async () => {
        log(`[Emby] Checking TMDB ID: ${tmdbId}`);

        const data = await httpGetJSON(url);

        if (data.Items && data.Items.length > 0) {
          const item: EmbyItem = data.Items[0];
          log(`[Emby] Found: ${item.Name}`);

          if (item.Type === 'Series') {
            try {
              const seasonParams = new URLSearchParams({
                ParentId: item.Id,
                IncludeItemTypes: 'Season',
                Fields: 'ChildCount,RecursiveItemCount,Path,IndexNumber',
                api_key: apiKey,
              });
              const seasonUrl = `${server}/emby/Items?${seasonParams.toString()}`;
              const seasonData = await httpGetJSON(seasonUrl);

              if (seasonData.Items && seasonData.Items.length > 0) {
                item.Seasons = seasonData.Items;

                const totalEpisodes = item.Seasons!.reduce((acc, s) => acc + (s.RecursiveItemCount || 0), 0);

                if (totalEpisodes === 0) {
                  log('[Emby] Season counts are 0, fetching all episodes to aggregate manually...');

                  const episodeParams = new URLSearchParams({
                    ParentId: item.Id,
                    IncludeItemTypes: 'Episode',
                    Recursive: 'true',
                    Fields: 'ParentIndexNumber',
                    api_key: apiKey,
                  });
                  const allEpUrl = `${server}/emby/Items?${episodeParams.toString()}`;
                  const allEpData = await httpGetJSON(allEpUrl);

                  if (allEpData.Items && allEpData.Items.length > 0) {
                    const seasonMap: Record<number, number> = {};
                    allEpData.Items.forEach((ep: any) => {
                      const sParams = ep.ParentIndexNumber || 1;
                      seasonMap[sParams] = (seasonMap[sParams] || 0) + 1;
                    });

                    if (item.Seasons) {
                      item.Seasons.forEach(s => {
                        let ids = s.IndexNumber;
                        if (ids === undefined) {
                          const m = s.Name.match(/(\d+)/);
                          if (m) ids = parseInt(m[1], 10);
                        }

                        if (ids !== undefined && seasonMap[ids]) {
                          s.RecursiveItemCount = seasonMap[ids];
                          s.ChildCount = seasonMap[ids];
                        }
                      });
                    }
                  }
                }
              }
            } catch (e) {
              log(`[Emby] Failed to fetch seasons/episodes: ${e}`);
            }
          }

          return item;
        }

        log('[Emby] Not found in Emby');
        return undefined;
      },
      cacheKey,
      cacheTTL: 1440,
      useCache: true,
      useQueue: true,
      priority: 3,
    });

    if (result.meta) {
      (result.meta as any).url = url;
    }

    return result;
  }

  getWebUrl(item: EmbyItem | null): string {
    if (!item) return '';

    const { server } = CONFIG.emby as { server: string };
    return `${server}/web/index.html#!/item?id=${item.Id}&serverId=${item.ServerId || ''}`;
  }

  protected determineTTL(data: any, defaultTTL: number): number {
    return data ? defaultTTL : 60;
  }
}

export const embyService = new EmbyService();
