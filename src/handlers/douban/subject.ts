import { Utils } from '../../utils';
import { UI } from '../../utils/ui';
import { CONFIG } from '../../core/api-config';
import { tmdbService } from '../../services/tmdb';
import { embyService, EmbyItem } from '../../services/emby';
import { imdbService } from '../../services/imdb';

interface LogEntry {
  time: string;
  step: string;
  data: unknown;
}

export class DoubanSubjectHandler {
  private doubanId: string | undefined;

  constructor() {
    this.doubanId = location.href.match(/subject\/(\d+)/)?.[1];
  }

  init(): void {
    Utils.log('Initializing Douban Subject Handler');
    if (!this.doubanId) return;

    UI.init();

    // Replaced sidebar panels with Dot on Poster
    this.addDotToPoster();

    this.fetchRatings();
    this.addCopyInfo();
  }

  async addDotToPoster(): Promise<void> {
    const posterContainer = document.querySelector('#mainpic');
    const img = document.querySelector('#mainpic img');
    if (!posterContainer || !img) return;

    const title = document.title.replace('(豆瓣)', '').trim();
    const yearEl = document.querySelector('#content .year');
    const year = yearEl ? yearEl.textContent?.replace(/[()]/g, '') || '' : '';

    // Create Dot
    const titleEl = document.querySelector('h1 span');
    const dot = UI.createDot({
      posterContainer: posterContainer as HTMLElement,
      titleElement: titleEl as HTMLElement
    });
    dot.style.zIndex = '10';
    dot.title = `Checking ${title}...`;

    const processLog: LogEntry[] = [];
    const log = (step: string, data: unknown): void => {
      processLog.push({ time: new Date().toLocaleTimeString(), step, data });
    };

    log('【Init】', { Title: title, Year: year });

    try {
      const results = await tmdbService.search(title, year);

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
            UI.showDetailModal(title, processLog, embyItem, [title], tmdbId ? { id: tmdbId, mediaType: 'movie' } : undefined);
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
          UI.showDetailModal(title, processLog, null, [title], tmdbId ? { id: tmdbId, mediaType: 'movie' } : undefined);
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
        UI.showDetailModal(title, processLog, null, [title]);
      };
    }
  }

  addCopyInfo(): void {
    const infoDiv = document.querySelector('#info');
    if (!infoDiv) return;

    infoDiv.insertAdjacentHTML('beforeend', '<br><span class="pl">Script: </span><a href="javascript:void(0);" id="copy-movie-info">Copy Info</a>');

    const btn = document.querySelector('#copy-movie-info') as HTMLAnchorElement;
    btn.addEventListener('click', () => {
      // Construct the info text
      let text = `◎Title　${document.title.replace('(豆瓣)', '').trim()}\n`;

      const yearEl = document.querySelector('#content .year');
      if (yearEl) {
        const year = yearEl.textContent?.replace(/[()]/g, '') || '';
        text += `◎Year　${year}\n`;
      }

      text += `◎Link　${location.href}\n`;

      const imdbLinkEl = document.querySelector('#info a[href^="https://www.imdb.com/title/"]');
      if (imdbLinkEl) {
        text += `◎IMDb　${imdbLinkEl.textContent?.trim()}\n`;
      }

      const ratingEl = document.querySelector('strong.ll.rating_num');
      if (ratingEl) {
        text += `◎Douban Rating　${ratingEl.textContent?.trim()}/10\n`;
      }

      const introEl = document.querySelector('span[property="v:summary"]');
      if (introEl) {
        const intro = introEl.textContent?.trim().replace(/\s+/g, ' ').substr(0, 150) || '';
        text += `◎Intro　${intro}...\n`;
      }

      Utils.copyToClipboard(text, () => {
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = originalText, 2000);
      });
    });
  }

  async fetchRatings(): Promise<void> {
    // Check for IMDb link
    const imdbLinkEl = document.querySelector('#info a[href^="https://www.imdb.com/title/"]');
    if (imdbLinkEl) {
      const imdbId = imdbLinkEl.textContent?.trim() || '';
      const interestSectl = document.querySelector('#interest_sectl');

      const ratingDiv = document.createElement('div');
      ratingDiv.className = 'rating_wrap clearbox';
      ratingDiv.id = 'imdb-rating-box';
      interestSectl?.appendChild(ratingDiv);

      try {
        const data = await imdbService.getRating(imdbId);
        if (data?.data?.aggregateRating) {
          const score = data.data.aggregateRating.ratingValue;
          const count = data.data.aggregateRating.ratingCount;
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
