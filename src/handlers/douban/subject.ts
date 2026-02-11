import { Utils } from '@/utils';
import { UI } from '@/utils/ui';
import { imdbService } from '@/services/imdb';
import { BaseMediaHandler } from '../base-handler';

export class DoubanSubjectHandler extends BaseMediaHandler {
  private doubanId: string | undefined;

  constructor() {
    super(); // 调用基类constructor
    this.doubanId = location.href.match(/subject\/(\d+)/)?.[1];
  }

  init(): void {
    Utils.log('Initializing Douban Subject Handler');
    if (!this.doubanId) return;

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

    const titleEl = document.querySelector('h1 span');
    const dot = UI.createDot({
      posterContainer: posterContainer as HTMLElement,
      titleElement: titleEl as HTMLElement,
    });
    dot.style.zIndex = '10';
    dot.title = `Checking ${title}...`;

    try {
      const result = await this.checkMedia(title, year, null, title);
      this.updateDotStatus(dot, result, title, [title]);
    } catch (e) {
      this.handleError(dot, e, title, this.logger);
    }
  }

  addCopyInfo(): void {
    const infoDiv = document.querySelector('#info');
    if (!infoDiv) return;

    infoDiv.insertAdjacentHTML('beforeend', '<br><span class="pl">Script: </span><a href="javascript:void(0);" id="copy-movie-info">Copy Info</a>');

    const btn = document.querySelector('#copy-movie-info') as HTMLAnchorElement;
    btn.addEventListener('click', () => {
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
