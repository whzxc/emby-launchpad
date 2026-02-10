import { Utils } from '../../utils';
import { UI } from '../../utils/ui';
import { CONFIG } from '../../core/api-config';
import { tmdbService } from '../../services/tmdb';
import { embyService, EmbyItem } from '../../services/emby';

interface Strategy {
  name: string;
  itemSelector: string;
  titleSelector: string;
  yearSelector: string;
  getYear: (el: Element | null) => string;
  getType: (card: Element) => 'tv' | 'movie' | null;
  getCover: (card: Element) => Element | null | undefined;
}

interface LogEntry {
  time: string;
  step: string;
  data: unknown;
}

export class DoubanListHandler {
  private strategies: Strategy[];

  constructor() {
    this.strategies = [
      {
        // Scenario 1: Explore / TV (React App)
        name: 'Explore/TV',
        itemSelector: '.drc-subject-card',
        titleSelector: '.drc-subject-info-title-text',
        yearSelector: '.drc-subject-info-subtitle',
        getYear: (el) => {
          const text = el ? el.textContent : '';
          return text?.split('/').map(t => t.trim())[0] || '';
        },
        getType: (card) => {
          if (card.classList.contains('tv')) return 'tv';
          if (card.classList.contains('movie')) return 'movie';
          return null;
        },
        getCover: (card) => card.querySelector('.drc-subject-cover') || card.querySelector('img')?.parentElement
      },
      {
        // Scenario 2: Chart (Classic HTML)
        name: 'Chart',
        itemSelector: 'tr.item',
        titleSelector: 'div.pl2 > a',
        yearSelector: 'p.pl',
        getYear: (el) => {
          // Format: "2024-05-01(China) / ..." or "2023 / ..."
          const text = el ? el.textContent : '';
          const match = text?.match(/(\d{4})/);
          return match ? match[1] : '';
        },
        getType: () => 'movie',
        getCover: (card) => card.querySelector('a.nbg')
      },
      {
        // Scenario 3: Subject Collection (m.douban.com)
        name: 'SubjectCollection',
        itemSelector: '.frc-swiper-card',
        titleSelector: '.frc-subject-info-title',
        yearSelector: '.frc-subject-info-content',
        getYear: (el) => {
          const text = el ? el.textContent : '';
          return text?.split('/').map(t => t.trim())[0] || '';
        },
        getType: (card) => {
          let parent = card.parentElement;
          while (parent && parent !== document.body) {
            if (parent.classList.contains('tv')) return 'tv';
            if (parent.classList.contains('movie')) return 'movie';
            parent = parent.parentElement;
          }
          return null;
        },
        getCover: (card) => card.querySelector('.frc-subject-cover') || card.querySelector('img')?.parentElement
      }
    ];
  }

  init(): void {
    Utils.log('Initializing Douban List Handler');
    UI.init();
    this.observe();
  }

  observe(): void {
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

  processExistingCards(): void {
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
          rawTitle = titleEl.textContent?.trim() || '';
        } else if (strategy.name === 'SubjectCollection') {
          rawTitle = Array.from(titleEl.childNodes)
            .filter(n => n.nodeType === 3) // Text nodes
            .map(n => n.textContent)
            .join('').trim();
          if (!rawTitle) rawTitle = titleEl.textContent?.trim() || ''; // Fallback
        } else {
          // Chart
          rawTitle = titleEl.childNodes[0]?.textContent?.trim().split('/')[0].trim() || '';
        }

        // Check if already processed and title matches
        if ((card as HTMLElement).getAttribute('data-gyg-title') === rawTitle) {
          return;
        }

        this.processCard(card as HTMLElement, strategy, rawTitle);
      });
    });
  }

  async processCard(card: HTMLElement, strategy: Strategy, rawTitle: string): Promise<void> {
    // Mark as processed with current title
    card.setAttribute('data-gyg-title', rawTitle);

    const titleEl = card.querySelector(strategy.titleSelector);
    const yearEl = card.querySelector(strategy.yearSelector);

    // Find Cover to attach Dot
    const coverEl = strategy.getCover(card);
    if (!coverEl) {
      Utils.log(`No cover found for ${rawTitle}`);
      return;
    }

    // Clean TV Season suffixes
    let cleanTitle = rawTitle;
    let useYear = strategy.getYear(yearEl);
    const mediaType = strategy.getType ? strategy.getType(card) : null;

    const seasonRegex = /(?:[\s:：(（\[【]|^)(?:第[0-9一二三四五六七八九十]+季|Season\s*\d+|S\d+).*/i;

    if (seasonRegex.test(rawTitle)) {
      cleanTitle = rawTitle.replace(seasonRegex, '').trim();
      useYear = ''; // Don't filter by year
    }

    // Create Dot
    const dot = UI.createDot({
      posterContainer: coverEl as HTMLElement,
      titleElement: titleEl as HTMLElement
    });
    dot.title = `Checking ${cleanTitle}...`;

    const processLog: LogEntry[] = [];
    const log = (step: string, data: unknown): void => {
      processLog.push({ time: new Date().toLocaleTimeString(), step, data });
    };

    log('【Init】', { Title: cleanTitle, Year: useYear, Type: mediaType });

    try {
      const results = await tmdbService.search(cleanTitle, useYear, mediaType);

      const tmdbLog: { meta: typeof results.meta; response: unknown } = {
        ...{ meta: results.meta },
        response: { count: results.data.length, top_result: results.data[0] || null }
      };
      if (results.meta.error) tmdbLog.response = { error: results.meta.error };
      log('【请求API: TMDB】', tmdbLog);

      let found = false;
      let embyItem: EmbyItem | null = null;
      let tmdbId: number | null = null;

      if (results.data.length > 0) {
        const bestMatch = results.data[0];
        tmdbId = bestMatch.id;
        const embyResult = await embyService.checkExistence(bestMatch.id);
        embyItem = embyResult.data;

        const embyLog: { meta: typeof embyResult.meta; response: unknown } = {
          ...{ meta: embyResult.meta },
          response: embyItem ? embyItem : 'Not Found'
        };
        if (embyResult.meta.error) embyLog.response = { error: embyResult.meta.error };
        log('【请求API: Emby】', embyLog);

        if (embyItem) {
          found = true;
          dot.className = 'us-dot found';
          dot.title = `Found in Emby: ${embyItem.Name}`;
          dot.onclick = (e: MouseEvent): void => {
            e.preventDefault(); e.stopPropagation();
            UI.showDetailModal(cleanTitle, processLog, embyItem, [cleanTitle], (tmdbId && mediaType) ? { id: tmdbId, mediaType } : undefined);
          };
        }
      } else {
        log('【请求API: Emby】', { message: 'Skipped (No TMDB Result)' });
      }

      if (!found) {
        dot.className = 'us-dot not-found';
        dot.title = 'Not found in Emby';
        dot.onclick = (e: MouseEvent): void => {
          e.preventDefault(); e.stopPropagation();
          UI.showDetailModal(cleanTitle, processLog, null, [cleanTitle], (tmdbId && mediaType) ? { id: tmdbId, mediaType } : undefined);
        };
      }

      dot.classList.remove('loading');

    } catch (e) {
      console.error(e);
      dot.className = 'us-dot error';
      log('Error', String(e));
      dot.classList.remove('loading');
      dot.onclick = (e: MouseEvent): void => {
        e.preventDefault(); e.stopPropagation();
        UI.showDetailModal(cleanTitle, processLog, null, [cleanTitle]);
      };
    }
  }
}
