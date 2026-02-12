import { PageAdapter } from './interface';
import { tmdbService } from '@/services/api/tmdb';
import { type EmbyItem, embyService } from '@/services/api/emby';
import { copyToClipboard, createDot, log } from '@/utils/common';
import { ProcessLogger } from '@/utils/logger';
import type { MediaType } from '@/types/tmdb';
import type { LogEntry, TmdbInfo } from '@/types/ui';

export class GYGAdapter implements PageAdapter {
  name = 'GYG';

  match(url: string): boolean {
    return url.includes('gyg.si');
  }

  async init(): Promise<void> {
    log('Initializing GYG Adapter');

    const url = location.href;

    if (url.includes('/s/') || url.includes('/list/')) {
      this.handleListPage();
    } else if (url.includes('/detail/') || document.querySelector('.main-ui-meta')) {
      await this.handleDetailPage();
    }
  }

  private async handleDetailPage(): Promise<void> {
    const metaContainer = document.querySelector('.main-ui-meta');
    const ratingSection = document.querySelector('.ratings-section');
    if (!metaContainer || !ratingSection) return;

    const titleEl = document.querySelector('.title-text, h1');
    const title = titleEl?.textContent?.trim() || '';
    if (!title) return;

    const yearEl = document.querySelector('.year, .meta-info .year');
    const year = yearEl?.textContent?.trim().replace(/[()]/g, '') || '';

    const mediaType: MediaType = document.querySelector('.episode-list, .season-select') ? 'tv' : 'movie';

    const logger = new ProcessLogger();
    logger.log('GYG Detail Page', `Title: ${title}, Year: ${year}`);

    // Insert TMDB card
    const wrapper = document.createElement('div');
    wrapper.className = 'tmdb-wrapper';

    // TMDB card
    const tmdbCard = document.createElement('div');
    tmdbCard.className = 'gyg-card';
    tmdbCard.innerHTML = '<span class="tmdb-source">TMDB</span> <span class="emby-badge emby-loading">Loading...</span>';
    wrapper.appendChild(tmdbCard);

    // Emby card
    const embyCard = document.createElement('div');
    embyCard.className = 'gyg-card emby-card';
    embyCard.innerHTML = '<span class="emby-label">Emby Library</span> <span class="emby-badge emby-loading">Checking...</span>';
    wrapper.appendChild(embyCard);

    ratingSection.parentElement?.insertBefore(wrapper, ratingSection.nextSibling);

    try {
      let tmdbId = 0;
      let tmdbData: any = null;

      if (mediaType === 'tv') {
        const result = await tmdbService.searchTv(title, year);
        logger.log('TMDB TV Search', result);
        if (result.data?.length) {
          tmdbId = result.data[0].id;
          tmdbData = result.data[0];
        }
      } else {
        const result = await tmdbService.searchMovie(title, year);
        logger.log('TMDB Movie Search', result);
        if (result.data?.length) {
          tmdbId = result.data[0].id;
          tmdbData = result.data[0];
        }
      }

      if (tmdbId && tmdbData) {
        const score = tmdbData.vote_average?.toFixed(1) || 'N/A';
        const tmdbUrl = `https://www.themoviedb.org/${mediaType}/${tmdbId}`;
        tmdbCard.innerHTML = `
          <div class="tmdb-header-row">
            <span class="tmdb-source">TMDB</span>
            <span class="tmdb-score">${score}</span>
          </div>
          <div class="tmdb-copy-area" title="Click to copy TMDB ID">
            <span>ID: ${tmdbId}</span>
            <a href="${tmdbUrl}" target="_blank" style="color:#01b4e4; text-decoration:none; font-size:12px;">Open TMDB →</a>
          </div>
        `;

        tmdbCard.querySelector('.tmdb-copy-area')?.addEventListener('click', (e) => {
          if (!(e.target as HTMLElement).closest('a')) {
            copyToClipboard(String(tmdbId));
          }
        });

        // Check Emby
        const embyResult = await embyService.checkExistence(tmdbId);
        logger.log('Emby Check', embyResult);

        if (embyResult.data) {
          const item = embyResult.data;
          const webUrl = embyService.getWebUrl(item);
          embyCard.innerHTML = `
            <span class="emby-label">${item.Name}</span>
            <a href="${webUrl}" target="_blank" class="emby-badge emby-yes" style="text-decoration:none;">▶ Play</a>
          `;
          embyCard.style.cursor = 'pointer';
          embyCard.addEventListener('click', (e) => {
            if (!(e.target as HTMLElement).closest('a')) {
              this.showInfoCard(title, logger.getLogs(), item, [title], { id: tmdbId, mediaType });
            }
          });
        } else {
          embyCard.innerHTML = '<span class="emby-label">Emby Library</span> <span class="emby-badge emby-no">Not Found</span>';
        }
      } else {
        tmdbCard.innerHTML = '<span class="tmdb-source">TMDB</span> <span style="color:#999;">Not Found</span>';
        embyCard.innerHTML = '<span class="emby-label">Emby Library</span> <span class="emby-badge emby-no">—</span>';
      }
    } catch (error: any) {
      log(`[GYG] Error: ${error.message}`);
      tmdbCard.innerHTML = '<span class="tmdb-source">TMDB</span> <span style="color:#dc3545;">Error</span>';
    }
  }

  private handleListPage(): void {
    const items = document.querySelectorAll('.search-item, .list-item, [class*="movie-item"]');

    items.forEach(item => {
      const titleEl = item.querySelector('.title, h3, a');
      if (!titleEl) return;

      const title = titleEl.textContent?.trim() || '';
      if (!title) return;

      const cover = item.querySelector('.cover, .poster, img')?.parentElement as HTMLElement | null;
      if (!cover) return;

      const dotEl = createDot();

      const dotWrapper = document.createElement('div');
      dotWrapper.style.position = 'absolute';
      dotWrapper.style.zIndex = '99';
      dotWrapper.style.width = '12px';
      dotWrapper.style.height = '12px';
      dotWrapper.style.top = '4px';
      dotWrapper.style.left = '4px';

      const computed = window.getComputedStyle(cover);
      if (computed.position === 'static') cover.style.position = 'relative';

      dotWrapper.appendChild(dotEl);
      cover.appendChild(dotWrapper);

      const logger = new ProcessLogger();
      this.checkAndUpdateDot(title, '', 'movie', dotEl, logger, [title]);
    });
  }

  private async checkAndUpdateDot(
    title: string,
    year: string,
    mediaType: MediaType,
    dotEl: Element,
    logger: ProcessLogger,
    searchQueries: string[],
  ): Promise<void> {
    try {
      const result = mediaType === 'tv'
        ? await tmdbService.searchTv(title, year)
        : await tmdbService.searchMovie(title, year);

      logger.log('TMDB Search', result);

      if (!result.data?.length) {
        dotEl.setAttribute('status', 'not-found');
        dotEl.setAttribute('title', 'TMDB not found');
        return;
      }

      const tmdbId = result.data[0].id;
      const embyResult = await embyService.checkExistence(tmdbId);
      logger.log('Emby Check', embyResult);

      if (embyResult.data) {
        dotEl.setAttribute('status', 'found');
        dotEl.setAttribute('title', `Found: ${embyResult.data.Name}`);
      } else {
        dotEl.setAttribute('status', 'not-found');
        dotEl.setAttribute('title', 'Not in Emby');
      }

      dotEl.addEventListener('click', () => {
        this.showInfoCard(title, logger.getLogs(), embyResult.data || null, searchQueries, { id: tmdbId, mediaType });
      });
    } catch (error: any) {
      dotEl.setAttribute('status', 'error');
      dotEl.setAttribute('title', `Error: ${error.message}`);
    }
  }

  private showInfoCard(
    title: string,
    logs: LogEntry[],
    embyItem: EmbyItem | null,
    searchQueries: string[],
    tmdbInfo?: TmdbInfo,
  ): void {
    const existing = document.querySelector('us-info-card');
    if (existing) existing.remove();

    const card = document.createElement('us-info-card');
    card.setAttribute('title', title);
    card.setAttribute('visible', 'true');

    const cardEl = card as any;
    cardEl.logs = logs;
    cardEl.embyItem = embyItem;
    cardEl.searchQueries = searchQueries;
    cardEl.tmdbInfo = tmdbInfo;

    card.addEventListener('close', () => card.remove());
    document.body.appendChild(card);
  }
}
