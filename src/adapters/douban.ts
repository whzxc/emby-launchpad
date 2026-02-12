import { PageAdapter } from './interface';
import { tmdbService } from '@/services/api/tmdb';
import { type EmbyItem, embyService } from '@/services/api/emby';
import { imdbService } from '@/services/api/imdb';
import { createDot, log } from '@/utils/common';
import { hasSeasonInfo, removeSeasonInfo } from '@/utils/title-parser';
import { ProcessLogger } from '@/utils/logger';
import type { MediaType } from '@/types/tmdb';
import type { LogEntry, TmdbInfo } from '@/types/ui';

interface ListStrategy {
  name: string;
  itemSelector: string;
  titleSelector: string;
  yearSelector: string;
  getYear: (el: Element | null) => string;
  getType: (card: Element) => MediaType;
  getCover: (card: Element) => Element | null | undefined;
}

const listStrategies: ListStrategy[] = [
  {
    name: 'explore',
    itemSelector: '.subject-list-list li',
    titleSelector: '.title',
    yearSelector: '.meta, .rating',
    getYear: (el) => {
      const text = el?.textContent || '';
      const match = text.match(/\b(19|20)\d{2}\b/);
      return match ? match[0] : '';
    },
    getType: (card) => {
      const link = card.querySelector('a')?.getAttribute('href') || '';
      return link.includes('/tv/') ? 'tv' : 'movie';
    },
    getCover: (card) => card.querySelector('.cover, .poster, img')?.parentElement,
  },
  {
    name: 'chart',
    itemSelector: 'a.nbg',
    titleSelector: '.title a, .title',
    yearSelector: '.abstract, .meta',
    getYear: (el) => {
      const text = el?.textContent || '';
      const match = text.match(/\b(19|20)\d{2}\b/);
      return match ? match[0] : '';
    },
    getType: () => 'movie' as MediaType,
    getCover: (card) => card.querySelector('.post img, img')?.parentElement,
  },
  {
    name: 'subject_collection',
    itemSelector: '.subject-item, .item, [data-item-id]',
    titleSelector: '.title a, h2 a, .info a',
    yearSelector: '.meta, .pub, .info',
    getYear: (el) => {
      const text = el?.textContent || '';
      const match = text.match(/\b(19|20)\d{2}\b/);
      return match ? match[0] : '';
    },
    getType: () => 'movie' as MediaType,
    getCover: (card) => card.querySelector('.pic img, img')?.parentElement,
  },
];

export class DoubanAdapter implements PageAdapter {
  name = 'Douban';
  private observer: MutationObserver | null = null;
  private processedElements = new WeakSet<Element>();

  match(url: string): boolean {
    return url.includes('movie.douban.com') || url.includes('m.douban.com');
  }

  async init(): Promise<void> {
    log('Initializing Douban Adapter');

    const url = location.href;

    if (url.includes('/subject/')) {
      await this.handleSubjectPage();
    } else {
      this.handleListPage();
    }
  }

  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  private async handleSubjectPage(): Promise<void> {
    const titleEl = document.querySelector('#content h1 span');
    if (!titleEl) return;

    const fullTitle = titleEl.textContent?.trim() || '';
    let title = fullTitle;
    let mediaType: MediaType = 'movie';

    if (hasSeasonInfo(title)) {
      mediaType = 'tv';
      title = removeSeasonInfo(title);
    }

    const yearEl = document.querySelector('#content h1 .year');
    const year = yearEl?.textContent?.replace(/[()]/g, '').trim() || '';

    const infoEl = document.querySelector('#info');
    const infoText = infoEl?.textContent || '';
    if (infoText.includes('集数')) mediaType = 'tv';

    // Check for IMDb ID
    let imdbId = '';
    const links = infoEl?.querySelectorAll('a');
    links?.forEach(link => {
      const href = link.getAttribute('href') || '';
      if (href.includes('imdb.com/title/')) {
        const match = href.match(/(tt\d+)/);
        if (match) imdbId = match[1];
      }
    });
    if (!imdbId) {
      const match = infoText.match(/(tt\d+)/);
      if (match) imdbId = match[1];
    }

    // Find poster container for dot placement
    const posterContainer = document.querySelector('#mainpic .nbgnbg, #mainpic a, #mainpic') as HTMLElement | null;
    const titleElement = document.querySelector('#content h1 span') as HTMLElement | null;

    if (!posterContainer && !titleElement) return;

    // Create and mount status dot
    const dotEl = createDot();

    const dotWrapper = document.createElement('div');
    dotWrapper.style.position = 'absolute';
    dotWrapper.style.zIndex = '99';
    dotWrapper.style.width = '14px';
    dotWrapper.style.height = '14px';

    if (posterContainer) {
      const computed = window.getComputedStyle(posterContainer);
      if (computed.position === 'static') posterContainer.style.position = 'relative';
      dotWrapper.style.top = '6px';
      dotWrapper.style.left = '6px';
      dotWrapper.appendChild(dotEl);
      posterContainer.appendChild(dotWrapper);
    } else if (titleElement) {
      dotWrapper.style.display = 'inline-block';
      dotWrapper.style.position = 'relative';
      dotWrapper.style.verticalAlign = 'middle';
      dotWrapper.style.marginRight = '6px';
      dotWrapper.appendChild(dotEl);
      titleElement.parentNode?.insertBefore(dotWrapper, titleElement);
    }

    // Process media check
    const logger = new ProcessLogger();
    await this.checkMedia(title, year, mediaType, imdbId, dotEl, logger, [title, fullTitle]);
  }

  private handleListPage(): void {
    const scan = () => {
      for (const strategy of listStrategies) {
        const items = document.querySelectorAll(strategy.itemSelector);
        if (items.length === 0) continue;

        items.forEach(card => {
          if (this.processedElements.has(card)) return;
          this.processedElements.add(card);

          const titleEl = card.querySelector(strategy.titleSelector);
          if (!titleEl) return;

          let title = titleEl.textContent?.trim() || '';
          if (!title) return;

          let mediaType = strategy.getType(card);
          if (hasSeasonInfo(title)) {
            mediaType = 'tv';
            title = removeSeasonInfo(title);
          }

          const yearEl = card.querySelector(strategy.yearSelector);
          const year = strategy.getYear(yearEl);

          const cover = strategy.getCover(card) as HTMLElement | null;
          const titleElement = titleEl as HTMLElement;

          if (!cover && !titleElement) return;

          const dotEl = createDot();

          const dotWrapper = document.createElement('div');
          dotWrapper.style.width = '12px';
          dotWrapper.style.height = '12px';

          if (cover) {
            const computed = window.getComputedStyle(cover);
            if (computed.position === 'static') cover.style.position = 'relative';
            dotWrapper.style.position = 'absolute';
            dotWrapper.style.zIndex = '99';
            dotWrapper.style.top = '4px';
            dotWrapper.style.left = '4px';
            dotWrapper.appendChild(dotEl);
            cover.appendChild(dotWrapper);
          } else {
            dotWrapper.style.display = 'inline-block';
            dotWrapper.style.position = 'relative';
            dotWrapper.style.verticalAlign = 'middle';
            dotWrapper.style.marginRight = '6px';
            dotWrapper.appendChild(dotEl);
            titleElement.parentNode?.insertBefore(dotWrapper, titleElement);
          }

          const logger = new ProcessLogger();
          this.checkMedia(title, year, mediaType, '', dotEl, logger, [title]);
        });
      }
    };

    scan();

    this.observer = new MutationObserver(() => scan());
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private async checkMedia(
    title: string,
    year: string,
    mediaType: MediaType,
    imdbId: string,
    dotEl: Element,
    logger: ProcessLogger,
    searchQueries: string[],
  ): Promise<void> {
    try {
      logger.log('Starting check', `Title: ${title}, Year: ${year}, Type: ${mediaType}`);

      // Step 1: TMDB search
      let tmdbId = 0;
      if (mediaType === 'tv') {
        const result = await tmdbService.searchTv(title, year);
        logger.log('TMDB TV Search', result);
        if (result.data?.length) {
          tmdbId = result.data[0].id;
        }
      } else {
        const result = await tmdbService.searchMovie(title, year);
        logger.log('TMDB Movie Search', result);
        if (result.data?.length) {
          tmdbId = result.data[0].id;
        }
      }

      if (!tmdbId) {
        logger.log('TMDB not found', 'Trying without year...');
        if (mediaType === 'tv') {
          const retry = await tmdbService.searchTv(title);
          if (retry.data?.length) tmdbId = retry.data[0].id;
        } else {
          const retry = await tmdbService.searchMovie(title);
          if (retry.data?.length) tmdbId = retry.data[0].id;
        }
      }

      if (!tmdbId) {
        dotEl.setAttribute('status', 'not-found');
        dotEl.setAttribute('title', 'TMDB not found');
        logger.log('Result', 'TMDB ID not found');
        this.bindDotClick(dotEl, title, logger, null, searchQueries);
        return;
      }

      logger.log('TMDB ID found', `${tmdbId}`);

      // Step 2: Emby check
      const embyResult = await embyService.checkExistence(tmdbId);
      logger.log('Emby Check', embyResult);

      const embyItem = embyResult.data || null;
      const tmdbInfo: TmdbInfo = { id: tmdbId, mediaType };

      if (embyItem) {
        dotEl.setAttribute('status', 'found');
        dotEl.setAttribute('title', `Found: ${embyItem.Name}`);
        logger.log('Result', `Found in Emby: ${embyItem.Name}`);
      } else {
        dotEl.setAttribute('status', 'not-found');
        dotEl.setAttribute('title', 'Not in Emby');
        logger.log('Result', 'Not found in Emby');
      }

      this.bindDotClick(dotEl, title, logger, embyItem, searchQueries, tmdbInfo);

      // Step 3: IMDb rating (for subject page)
      if (imdbId) {
        imdbService.getRating(imdbId).then(result => {
          if (result.data?.aggregateRating) {
            logger.log('IMDb Rating', `${result.data.aggregateRating.ratingValue}/10`);
          }
        }).catch(() => {
        });
      }

    } catch (error: any) {
      dotEl.setAttribute('status', 'error');
      dotEl.setAttribute('title', `Error: ${error.message || error}`);
      logger.log('Error', error.message || String(error));
      this.bindDotClick(dotEl, title, logger, null, searchQueries);
    }
  }

  private bindDotClick(
    dotEl: Element,
    title: string,
    logger: ProcessLogger,
    embyItem: EmbyItem | null,
    searchQueries: string[],
    tmdbInfo?: TmdbInfo,
  ): void {
    dotEl.addEventListener('dotClick', () => {
      this.showInfoCard(title, logger.getLogs(), embyItem, searchQueries, tmdbInfo);
    });
    // Also handle native click for the shadowRoot dot
    dotEl.addEventListener('click', () => {
      this.showInfoCard(title, logger.getLogs(), embyItem, searchQueries, tmdbInfo);
    });
  }

  private showInfoCard(
    title: string,
    logs: LogEntry[],
    embyItem: EmbyItem | null,
    searchQueries: string[],
    tmdbInfo?: TmdbInfo,
  ): void {
    // Remove existing info card
    const existing = document.querySelector('us-info-card');
    if (existing) existing.remove();

    const card = document.createElement('us-info-card');
    card.setAttribute('title', title);
    card.setAttribute('visible', 'true');

    // Pass complex props via the element's properties
    const cardEl = card as any;
    cardEl.logs = logs;
    cardEl.embyItem = embyItem;
    cardEl.searchQueries = searchQueries;
    cardEl.tmdbInfo = tmdbInfo;

    card.addEventListener('close', () => {
      card.remove();
    });

    document.body.appendChild(card);
  }
}
