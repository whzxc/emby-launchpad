
import { UI } from '@/utils/ui';
import { tmdbService } from '@/services/tmdb';
import { EmbyItem, embyService } from '@/services/emby';
import { ProcessLogger } from '@/utils/logger';
import { MediaType, TmdbInfo } from '@/types/common';

export interface MediaCheckResult {
  found: boolean;
  embyItem: EmbyItem | null;
  tmdbInfo: TmdbInfo | null;
  logger: ProcessLogger;
}

export abstract class BaseMediaHandler {
  protected logger: ProcessLogger;

  constructor() {
    this.logger = new ProcessLogger();
  }

  protected async checkMedia(
    title: string,
    year: string = '',
    mediaType: MediaType | null = null,
    originalTitle?: string,
  ): Promise<MediaCheckResult> {
    const logger = new ProcessLogger();

    logger.log('【解析标题】', {
      'Original Title': originalTitle || title,
      'Cleaned Title': title,
      'Year': year,
      'Type': mediaType,
    });

    try {
      const tmdbResult = await tmdbService.search(title, year, mediaType);
      logger.logApiRequest('TMDB', tmdbResult.meta, {
        count: tmdbResult.data.length,
        top_result: tmdbResult.data[0] || null,
      });

      if (tmdbResult.data.length === 0) {
        logger.log('【请求API: Emby】', { message: 'Skipped (No TMDB Result)' });
        return {
          found: false,
          embyItem: null,
          tmdbInfo: null,
          logger,
        };
      }

      const bestMatch = tmdbResult.data[0];
      const tmdbInfo: TmdbInfo = {
        id: bestMatch.id,
        mediaType: bestMatch.media_type,
      };

      const embyResult = await embyService.checkExistence(bestMatch.id);
      const embyItem = embyResult.data;

      logger.logApiRequest('Emby', embyResult.meta,
        embyItem ? `Found: ${embyItem.Name} (ID: ${embyItem.Id})` : 'Not Found',
      );

      return {
        found: !!embyItem,
        embyItem,
        tmdbInfo,
        logger,
      };

    } catch (error) {
      logger.logError(error);
      return {
        found: false,
        embyItem: null,
        tmdbInfo: null,
        logger,
      };
    }
  }

  protected updateDotStatus(
    dot: HTMLElement,
    result: MediaCheckResult,
    title: string,
    searchQueries: string[] = [],
  ): void {
    dot.classList.remove('loading');

    const queries = searchQueries.length ? searchQueries : [title];

    if (result.found && result.embyItem) {
      dot.className = 'us-dot found';
      dot.title = `Found in Emby: ${result.embyItem.Name}`;
      dot.onclick = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        UI.showDetailModal(
          title,
          result.logger.getLogs(),
          result.embyItem,
          queries,
          result.tmdbInfo || undefined,
        );
      };
    } else {
      dot.className = 'us-dot not-found';
      dot.title = 'Not found in Emby';
      dot.onclick = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        UI.showDetailModal(
          title,
          result.logger.getLogs(),
          null,
          queries,
          result.tmdbInfo || undefined,
        );
      };
    }
  }

  protected handleError(dot: HTMLElement, error: any, title: string, logger: ProcessLogger): void {
    console.error(error);
    logger.logError(error);
    dot.className = 'us-dot error';
    dot.classList.remove('loading');
    dot.title = 'Error occurred';
    dot.onclick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      UI.showDetailModal(title, logger.getLogs(), null, [title]);
    };
  }
}
