import { Utils } from '@/utils';
import { UI } from '@/utils/ui';
import { imdbService } from '@/services/imdb';
import { BaseMediaHandler } from '../base-handler';
import { hasSeasonInfo, removeSeasonInfo } from '@/utils/title-parser';

interface ListStrategy {
  name: string;
  itemSelector: string;
  titleSelector: string;
  yearSelector: string;
  getYear: (el: Element | null) => string;
  getType: (card: Element) => 'tv' | 'movie' | null;
  getCover: (card: Element) => Element | null | undefined;
}

export class DoubanHandler extends BaseMediaHandler {
  private isSubject: boolean;
  private doubanId: string | undefined;
  private strategies: ListStrategy[];

  constructor() {
    super();
    this.isSubject = /subject\/\d+/.test(location.href);
    this.doubanId = location.href.match(/subject\/(\d+)/)?.[1];
    this.strategies = [
      {
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
        getCover: (card) => card.querySelector('.drc-subject-cover') || card.querySelector('img')?.parentElement,
      },
      {
        name: 'Chart',
        itemSelector: 'tr.item',
        titleSelector: 'div.pl2 > a',
        yearSelector: 'p.pl',
        getYear: (el) => {
          const text = el ? el.textContent : '';
          const match = text?.match(/(\d{4})/);
          return match ? match[1] : '';
        },
        getType: () => 'movie',
        getCover: (card) => card.querySelector('a.nbg'),
      },
      {
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
        getCover: (card) => card.querySelector('.frc-subject-cover') || card.querySelector('img')?.parentElement,
      },
    ];
  }

  init(): void {
    Utils.log('Initializing Douban Handler');

    if (this.isSubject) {
      this.initSubject();
    } else {
      this.initList();
    }
  }

  // ─── Subject Page ────────────────────────────────────────

  private initSubject(): void {
    if (!this.doubanId) return;
    this.addDotToPoster();
    this.fetchRatings();
    this.addCopyInfo();
  }

  private async addDotToPoster(): Promise<void> {
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

  private addCopyInfo(): void {
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

  private async fetchRatings(): Promise<void> {
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

  // ─── List Page ───────────────────────────────────────────

  private initList(): void {
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

  private processExistingCards(): void {
    this.strategies.forEach(strategy => {
      const cards = document.querySelectorAll(strategy.itemSelector);
      if (cards.length > 0) Utils.log(`Strategy ${strategy.name}: Found ${cards.length} cards`);

      cards.forEach(card => {
        const titleEl = card.querySelector(strategy.titleSelector);
        if (!titleEl) return;

        let rawTitle = '';

        if (strategy.name === 'Explore/TV') {
          rawTitle = titleEl.textContent?.trim() || '';
        } else if (strategy.name === 'SubjectCollection') {
          rawTitle = Array.from(titleEl.childNodes)
            .filter(n => n.nodeType === 3)
            .map(n => n.textContent)
            .join('').trim();
          if (!rawTitle) rawTitle = titleEl.textContent?.trim() || '';
        } else {
          rawTitle = titleEl.childNodes[0]?.textContent?.trim().split('/')[0].trim() || '';
        }

        if ((card as HTMLElement).getAttribute('data-gyg-title') === rawTitle) {
          return;
        }

        this.processCard(card as HTMLElement, strategy, rawTitle);
      });
    });
  }

  private async processCard(card: HTMLElement, strategy: ListStrategy, rawTitle: string): Promise<void> {
    card.setAttribute('data-gyg-title', rawTitle);

    const titleEl = card.querySelector(strategy.titleSelector);
    const yearEl = card.querySelector(strategy.yearSelector);

    const coverEl = strategy.getCover(card);
    if (!coverEl) {
      Utils.log(`No cover found for ${rawTitle}`);
      return;
    }

    let cleanTitle = rawTitle;
    let useYear = strategy.getYear(yearEl);
    const mediaType = strategy.getType ? strategy.getType(card) : null;

    if (hasSeasonInfo(rawTitle)) {
      cleanTitle = removeSeasonInfo(rawTitle);
      useYear = '';
    }

    const dot = UI.createDot({
      posterContainer: coverEl as HTMLElement,
      titleElement: titleEl as HTMLElement,
    });
    dot.title = `Checking ${cleanTitle}...`;

    try {
      const result = await this.checkMedia(cleanTitle, useYear, mediaType, rawTitle);
      this.updateDotStatus(dot, result, cleanTitle, [cleanTitle]);
    } catch (e) {
      this.handleError(dot, e, cleanTitle, this.logger);
    }
  }
}
