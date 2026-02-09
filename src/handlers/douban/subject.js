import { Utils } from '../../utils';
import { UI } from '../../utils/ui';
import { CONFIG } from '../../config';
import { TmdbService } from '../../services/tmdb';
import { EmbyService } from '../../services/emby';
import { ImdbService } from '../../services/imdb';

export class DoubanSubjectHandler {
  constructor() {
    this.doubanId = location.href.match(/subject\/(\d+)/)?.[1];
  }

  init() {
    Utils.log('Initializing Douban Subject Handler');
    if (!this.doubanId) return;

    UI.init();

    // Replaced sidebar panels with Dot on Poster
    this.addDotToPoster();

    this.fetchRatings();
    this.addCopyInfo();
  }

  async addDotToPoster() {
    const posterContainer = document.querySelector('#mainpic');
    const img = document.querySelector('#mainpic img');
    if (!posterContainer || !img) return;

    const title = document.title.replace('(豆瓣)', '').trim();
    const yearEl = document.querySelector('#content .year');
    const year = yearEl ? yearEl.textContent.replace(/[()]/g, '') : '';

    // Create Dot
    const titleEl = document.querySelector('h1 span');
    const dot = UI.createDot({
      posterContainer: posterContainer,
      titleElement: titleEl
    });
    dot.style.zIndex = '10';
    dot.title = `Checking ${title}...`;

    const processLog = [{ time: new Date().toLocaleTimeString(), step: 'Init', data: `Title: ${title}, Year: ${year}` }];

    try {
      const results = await TmdbService.search(title, year);

      let found = false;
      let embyItem = null;

      if (results.length > 0) {
        const bestMatch = results[0];
        embyItem = await EmbyService.checkExistence(bestMatch.id);
        if (embyItem) {
          found = true;
          dot.className = 'us-dot found';
          dot.title = `Found in Emby: ${embyItem.Name}`;
          dot.onclick = (e) => {
            e.preventDefault(); e.stopPropagation();
            UI.showDetailModal(title, processLog, embyItem, [title]);
          };
        }
      }

      if (!found) {
        dot.className = 'us-dot not-found';
        dot.title = 'Not found in Emby';
        dot.onclick = (e) => {
          e.preventDefault(); e.stopPropagation();
          UI.showDetailModal(title, processLog, null, [title]);
        };
      }

      dot.classList.remove('loading');

    } catch (e) {
      console.error(e);
      dot.className = 'us-dot error';
      dot.classList.remove('loading');
      dot.onclick = (e) => {
        e.preventDefault(); e.stopPropagation();
        UI.showDetailModal(title, processLog, null, [title]);
      };
    }
  }

  addCopyInfo() {
    const infoDiv = document.querySelector('#info');
    if (!infoDiv) return;

    infoDiv.insertAdjacentHTML('beforeend', '<br><span class="pl">Script: </span><a href="javascript:void(0);" id="copy-movie-info">Copy Info</a>');

    const btn = document.querySelector('#copy-movie-info');
    btn.addEventListener('click', () => {
      // Construct the info text
      let text = `◎Title　${document.title.replace('(豆瓣)', '').trim()}\n`;

      const yearEl = document.querySelector('#content .year');
      if (yearEl) {
        const year = yearEl.textContent.replace(/[()]/g, '');
        text += `◎Year　${year}\n`;
      }

      text += `◎Link　${location.href}\n`;

      const imdbLinkEl = document.querySelector('#info a[href^="https://www.imdb.com/title/"]');
      if (imdbLinkEl) {
        text += `◎IMDb　${imdbLinkEl.textContent.trim()}\n`;
      }

      const ratingEl = document.querySelector('strong.ll.rating_num');
      if (ratingEl) {
        text += `◎Douban Rating　${ratingEl.textContent.trim()}/10\n`;
      }

      const introEl = document.querySelector('span[property="v:summary"]');
      if (introEl) {
        const intro = introEl.textContent.trim().replace(/\s+/g, ' ').substr(0, 150);
        text += `◎Intro　${intro}...\n`;
      }

      Utils.copyToClipboard(text, () => {
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = originalText, 2000);
      });
    });
  }

  async fetchRatings() {
    // Check for IMDb link
    const imdbLinkEl = document.querySelector('#info a[href^="https://www.imdb.com/title/"]');
    if (imdbLinkEl) {
      const imdbId = imdbLinkEl.textContent.trim();
      const interestSectl = document.querySelector('#interest_sectl');

      const ratingDiv = document.createElement('div');
      ratingDiv.className = 'rating_wrap clearbox';
      ratingDiv.id = 'imdb-rating-box';
      interestSectl.appendChild(ratingDiv);

      try {
        const data = await ImdbService.getRating(imdbId);
        if (data && data.aggregateRating) {
          const score = data.aggregateRating.ratingValue;
          const count = data.aggregateRating.ratingCount;
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
