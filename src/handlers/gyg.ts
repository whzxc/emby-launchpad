import { Utils } from '@/utils';
import { UI } from '@/utils/ui';
import { CONFIG } from '@/core/api-config';
import { TmdbSearchResult, tmdbService } from '@/services/tmdb';
import { embyService } from '@/services/emby';
import { BaseMediaHandler } from './base-handler';

export class GYGHandler extends BaseMediaHandler {
  init(): void {
    Utils.log('Initializing GYG Handler');

    const metaContainer = document.querySelector('.main-ui-meta');
    const ratingSection = document.querySelector('.ratings-section');
    if (!metaContainer || !ratingSection) return;

    const titleEl = document.querySelector('.main-meta > .img > picture > img') as HTMLImageElement | null;
    const yearEl = metaContainer.querySelector('h1 .year');
    if (!titleEl) return;

    const titleRaw = titleEl.alt.replace(/第.季/g, '').trim();
    const yearRaw = yearEl ? yearEl.textContent?.replace(/[()]/g, '').trim() || '' : '';

    const wrapper = document.createElement('div');
    wrapper.className = 'tmdb-wrapper';
    ratingSection.appendChild(wrapper);

    this.render(titleRaw, yearRaw, wrapper);

    const posterContainer = document.querySelector('.main-meta > .img');
    const titleHeader = metaContainer.querySelector('h1');
    if (posterContainer) {
      this.addDotToPoster(posterContainer as HTMLElement, titleHeader as HTMLElement, titleRaw, yearRaw);
    }
  }

  async render(title: string, year: string, wrapper: HTMLElement): Promise<void> {
    wrapper.innerHTML = '<div class="gyg-card" style="text-align:center; color:#999; font-size:12px;">Searching TMDB...</div>';
    const results = await tmdbService.search(title, year);

    if (results.data.length === 0) {
      wrapper.innerHTML = '<div class="gyg-card"><div style="font-size:12px; color:#999; text-align:center;">No TMDB Data</div></div>';
      return;
    }

    this.renderCard(results.data[0], wrapper, results.data);
  }

  renderCard(item: TmdbSearchResult, wrapper: HTMLElement, allResults: TmdbSearchResult[]): void {
    const title = item.title || item.name || '';
    const date = item.release_date || item.first_air_date || '????';
    const yearStr = date.split('-')[0];
    const score = item.vote_average ? item.vote_average.toFixed(1) : '0.0';
    const tmdbUrl = `https://www.themoviedb.org/${item.media_type}/${item.id}`;
    const copyText = `${title} (${yearStr})`;

    let selectorHtml = '';
    if (allResults.length > 1) {
      const options = allResults.map((r, idx) => {
        const rTitle = r.title || r.name || '';
        const rDate = (r.release_date || r.first_air_date || '').split('-')[0];
        return `<option value="${idx}" ${r.id === item.id ? 'selected' : ''}>${rTitle} (${rDate})</option>`;
      }).join('');
      selectorHtml = `<select class="result-selector" style="width:100%; padding:4px; margin-bottom:5px;">${options}</select>`;
    }

    wrapper.innerHTML = `
                ${selectorHtml}
                <div class="gyg-card tmdb-card">
                    <div class="tmdb-header-row" onclick="window.open('${tmdbUrl}', '_blank')" title="Go to TMDB">
                        <div class="rating-auto"><span class="freshness" style="color:#01b4e4">${score}</span></div>
                        <span class="tmdb-source">TMDB</span>
                    </div>
                    <div class="tmdb-copy-area" id="tmdb-copy-btn" title="Copy: ${copyText}">
                        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${copyText}</span>
                        <span class="copy-icon">📋</span>
                        <span class="copy-toast">Copied</span>
                    </div>
                </div>
                <div class="gyg-card emby-card" id="emby-card-container">
                    <span class="emby-label">Emby</span>
                    <span class="emby-badge emby-loading">Checking...</span>
                </div>
            `;

    const selector = wrapper.querySelector('.result-selector') as HTMLSelectElement | null;
    if (selector) {
      selector.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        this.renderCard(allResults[parseInt(target.value)], wrapper, allResults);
      });
    }

    const copyBtn = wrapper.querySelector('#tmdb-copy-btn') as HTMLElement;
    copyBtn.addEventListener('click', function (this: HTMLElement) {
      Utils.copyToClipboard(copyText, () => {
        const toast = this.querySelector('.copy-toast') as HTMLElement;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 1500);
      });
    });

    this.checkEmby(item.id, wrapper);
  }

  async checkEmby(tmdbId: number, wrapper: HTMLElement): Promise<void> {
    const container = wrapper.querySelector('#emby-card-container') as HTMLElement;
    const badge = container.querySelector('.emby-badge') as HTMLElement;

    const embyResult = await embyService.checkExistence(tmdbId);
    const embyItem = embyResult.data;
    if (embyItem) {
      badge.className = 'emby-badge emby-yes';
      badge.textContent = 'Exists';
      const embyLink = `${CONFIG.emby.server}/web/index.html#!/item?id=${embyItem.Id}&serverId=${embyItem.ServerId}`;
      container.onclick = () => window.open(embyLink, '_blank');
      container.title = 'Play on Emby';
    } else {
      badge.className = 'emby-badge emby-no';
      badge.textContent = 'Not Found';
      container.style.cursor = 'default';
      container.onclick = null;
      container.removeAttribute('title');
    }
  }

  async addDotToPoster(container: HTMLElement, titleEl: HTMLElement, title: string, year: string): Promise<void> {
    const dot = UI.createDot({ posterContainer: container, titleElement: titleEl });
    dot.style.zIndex = '20';

    try {
      const result = await this.checkMedia(title, year, 'movie', title);
      this.updateDotStatus(dot, result, title, [title]);
    } catch (e) {
      this.handleError(dot, e, title, this.logger);
    }
  }
}

export class GYGListHandler extends BaseMediaHandler {
  init(): void {
    Utils.log('Initializing GYG List Handler');
    this.processCards();
    this.observe();
  }

  observe(): void {
    const observer = new MutationObserver((mutations) => {
      let added = false;
      for (const m of mutations) {
        if (m.addedNodes.length) added = true;
      }
      if (added) this.processCards();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  processCards(): void {
    const cards = document.querySelectorAll('li .li-img.cover');
    cards.forEach(imgDiv => {
      const li = imgDiv.closest('li');
      if (!li) return;

      if ((li as HTMLElement).dataset.gygEmbyChecked) return;
      (li as HTMLElement).dataset.gygEmbyChecked = 'true';

      this.checkCard(li as HTMLElement, imgDiv as HTMLElement);
    });
  }

  async checkCard(li: HTMLElement, imgDiv: HTMLElement): Promise<void> {
    const titleEl = li.querySelector('.li-bottom h3 a') as HTMLAnchorElement | null;
    if (!titleEl) return;

    let rawTitle = titleEl.getAttribute('title') || titleEl.textContent || '';
    rawTitle = rawTitle.trim();

    const tagEl = li.querySelector('.li-bottom .tag');
    let year = '';
    if (tagEl) {
      const parts = tagEl.textContent?.split('/') || [];
      year = parts[0]?.trim() || '';
    }

    let cleanTitle = rawTitle;

    const seasonRegex = /(?:[\s:：(（\[【]|^)(?:第[0-9一二三四五六七八九十]+季|Season\s*\d+|S\d+).*/i;

    const yearParam = year;
    if (seasonRegex.test(rawTitle)) {
      cleanTitle = rawTitle.replace(seasonRegex, '').trim();
    }

    const dot = UI.createDot({ posterContainer: imgDiv, titleElement: titleEl });
    dot.title = `Checking ${cleanTitle}...`;

    try {
      const result = await this.checkMedia(cleanTitle, yearParam, null, rawTitle);
      this.updateDotStatus(dot, result, cleanTitle, [cleanTitle]);
    } catch (e) {
      this.handleError(dot, e, cleanTitle, this.logger);
    }
  }
}
