import { Utils } from '../utils';
import { UI } from '../utils/ui';
import { CONFIG } from '../config';
import { TmdbService } from '../services/tmdb';
import { EmbyService } from '../services/emby';

export class GYGHandler {
  init() {
    Utils.log('Initializing GYG Handler');
    UI.init();

    // Existing functionality: TMDB/Emby Card in Ratings Section
    const metaContainer = document.querySelector('.main-ui-meta');
    const ratingSection = document.querySelector('.ratings-section');
    if (!metaContainer || !ratingSection) return;

    const titleEl = document.querySelector('.main-meta > .img > picture > img');
    const yearEl = metaContainer.querySelector('h1 .year');
    if (!titleEl) return;

    let titleRaw = titleEl.alt.replace(/第.季/g, '').trim();
    let yearRaw = yearEl ? yearEl.textContent.replace(/[()]/g, '').trim() : '';

    const wrapper = document.createElement('div');
    wrapper.className = 'tmdb-wrapper';
    ratingSection.appendChild(wrapper);

    this.render(titleRaw, yearRaw, wrapper);

    // NEW: Add Dot to Main Poster
    const posterContainer = document.querySelector('.main-meta > .img');
    const titleHeader = metaContainer.querySelector('h1');
    if (posterContainer) {
      this.addDotToPoster(posterContainer, titleHeader, titleRaw, yearRaw);
    }
  }

  async render(title, year, wrapper) {
    wrapper.innerHTML = '<div class="gyg-card" style="text-align:center; color:#999; font-size:12px;">Searching TMDB...</div>';
    const results = await TmdbService.search(title, year);

    if (results.length === 0) {
      wrapper.innerHTML = '<div class="gyg-card"><div style="font-size:12px; color:#999; text-align:center;">No TMDB Data</div></div>';
      return;
    }

    // Default to first result
    this.renderCard(results[0], wrapper, results);
  }

  renderCard(item, wrapper, allResults) {
    const isMovie = item.media_type === 'movie';
    const title = item.title || item.name;
    const date = item.release_date || item.first_air_date || '????';
    const yearStr = date.split('-')[0];
    const score = item.vote_average ? item.vote_average.toFixed(1) : '0.0';
    const tmdbUrl = `https://www.themoviedb.org/${item.media_type}/${item.id}`;
    const copyText = `${title} (${yearStr})`;

    // Selector if multiple results
    let selectorHtml = '';
    if (allResults.length > 1) {
      let options = allResults.map((r, idx) => {
        const rTitle = r.title || r.name;
        const rDate = (r.release_date || r.first_air_date || '').split('-')[0];
        return `<option value="${idx}" ${r.id === item.id ? 'selected' : ''}>${rTitle} (${rDate})</option>`;
      }).join('');
      selectorHtml = `<select class="result-selector" style="width:100%; padding:4px; margin-bottom:5px;">${options}</select>`;
    }

    const html = `
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
    wrapper.innerHTML = html;

    // Events
    const selector = wrapper.querySelector('.result-selector');
    if (selector) {
      selector.addEventListener('change', (e) => {
        this.renderCard(allResults[e.target.value], wrapper, allResults);
      });
    }

    wrapper.querySelector('#tmdb-copy-btn').addEventListener('click', function () {
      Utils.copyToClipboard(copyText, () => {
        const toast = this.querySelector('.copy-toast');
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 1500);
      });
    });

    this.checkEmby(item.id, wrapper);
  }

  async checkEmby(tmdbId, wrapper) {
    const container = wrapper.querySelector('#emby-card-container');
    const badge = container.querySelector('.emby-badge');

    const embyItem = await EmbyService.checkExistence(tmdbId);
    if (embyItem) {
      badge.className = 'emby-badge emby-yes';
      badge.textContent = 'Exists';
      const embyLink = `${CONFIG.emby.server}/web/index.html#!/item?id=${embyItem.Id}&serverId=${embyItem.ServerId}`;
      container.onclick = () => window.open(embyLink, '_blank');
      container.title = "Play on Emby";
    } else {
      badge.className = 'emby-badge emby-no';
      badge.textContent = 'Not Found';
      container.style.cursor = 'default';
      container.onclick = null;
      container.removeAttribute('title');
    }
  }

  async addDotToPoster(container, titleEl, title, year) {
    const dot = UI.createDot({ posterContainer: container, titleElement: titleEl });
    dot.style.zIndex = '20';

    const processLog = [];
    const log = (step, data) => {
      processLog.push({ time: new Date().toLocaleTimeString(), step, data });
    };

    // Step 1: 解析标题
    log('【解析标题】', {
      'Original Title': title,
      'Year': year,
      'Parsed Title': title // GYG titles are usually clean
    });

    try {
      // Step 2: TMDB
      const tmdbResult = await TmdbService.search(title, year);

      let tmdbLog = { ...tmdbResult.meta, response: { count: tmdbResult.data.length, top_result: tmdbResult.data[0] || null } };
      if (tmdbResult.error) tmdbLog.response = { error: tmdbResult.error };

      log('【请求API: TMDB】', tmdbLog);

      const results = tmdbResult.data;

      if (results.length > 0) {
        const bestMatch = results[0];

        // Step 3: Emby
        const embyResult = await EmbyService.checkExistence(bestMatch.id);
        const embyItem = embyResult.data;

        let embyLog = { ...embyResult.meta, response: embyItem ? `Found: ${embyItem.Name} (ID: ${embyItem.Id})` : 'Not Found' };
        if (embyResult.error) embyLog.response = { error: embyResult.error };

        log('【请求API: Emby】', embyLog);

        if (embyItem) {
          dot.className = 'us-dot found';
          dot.title = `Found in Emby: ${embyItem.Name}`;
          dot.onclick = (e) => {
            e.preventDefault(); e.stopPropagation();
            UI.showDetailModal(title, processLog, embyItem, [title]);
          };
        } else {
          dot.className = 'us-dot not-found';
          dot.title = 'Not found in Emby';
          dot.onclick = (e) => {
            e.preventDefault(); e.stopPropagation();
            UI.showDetailModal(title, processLog, null, [title]);
          };
        }
      } else {
        log('【请求API: Emby】', { message: 'Skipped (No TMDB Result)' });
        dot.className = 'us-dot not-found';
        dot.title = 'TMDB Not Found';
        dot.onclick = (e) => {
          e.preventDefault(); e.stopPropagation();
          UI.showDetailModal(title, processLog, null, [title]);
        };
      }
    } catch (e) {
      console.error(e);
      dot.className = 'us-dot error';
      log('Error', e.toString());
      dot.onclick = (e) => {
        e.preventDefault(); e.stopPropagation();
        UI.showDetailModal(title, processLog, null, [title]);
      };
    }
    dot.classList.remove('loading');
  }
}

export class GYGListHandler {
  init() {
    Utils.log('Initializing GYG List Handler');
    UI.init();
    this.processCards();
    this.observe();
  }

  observe() {
    const observer = new MutationObserver((mutations) => {
      let added = false;
      for (const m of mutations) {
        if (m.addedNodes.length) added = true;
      }
      if (added) this.processCards();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  processCards() {
    const cards = document.querySelectorAll('li .li-img.cover');
    cards.forEach(imgDiv => {
      const li = imgDiv.closest('li');
      if (!li) return;

      // Use a unique attribute to avoid double processing
      if (li.dataset.gygEmbyChecked) return;
      li.dataset.gygEmbyChecked = 'true';

      // Fire and forget check
      this.checkCard(li, imgDiv);
    });
  }

  async checkCard(li, imgDiv) {
    // Find Title
    const titleEl = li.querySelector('.li-bottom h3 a');
    if (!titleEl) return;

    let rawTitle = titleEl.getAttribute('title') || titleEl.textContent;
    rawTitle = rawTitle ? rawTitle.trim() : '';

    // Find Year
    const tagEl = li.querySelector('.li-bottom .tag');
    let year = '';
    if (tagEl) {
      const parts = tagEl.textContent.split('/');
      year = parts[0].trim();
    }

    // Title Cleaning
    let cleanTitle = rawTitle;

    // Regex to detect "Season N", "第N季", "S5"
    const seasonRegex = /(?:[\s:：(（\[【]|^)(?:第[0-9一二三四五六七八九十]+季|Season\s*\d+|S\d+).*/i;

    let yearParam = year;
    if (seasonRegex.test(rawTitle)) {
      cleanTitle = rawTitle.replace(seasonRegex, '').trim();
    }

    // Add Loading Dot
    const dot = UI.createDot({ posterContainer: imgDiv, titleElement: titleEl });
    dot.title = `Checking ${cleanTitle}...`;

    // Log for Modal
    const processLog = [];
    const log = (step, data) => {
      processLog.push({ time: new Date().toLocaleTimeString(), step, data });
    };

    // Step 1: 解析标题
    log('【解析标题】', {
      'Original Title': rawTitle,
      'Year': year,
      'Cleaned Title': cleanTitle
    });

    try {
      // Step 2: TMDB
      const tmdbResult = await TmdbService.search(cleanTitle, yearParam);

      let tmdbLog = { ...tmdbResult.meta, response: { count: tmdbResult.data.length, top_result: tmdbResult.data[0] || null } };
      if (tmdbResult.error) tmdbLog.response = { error: tmdbResult.error };

      log('【请求API: TMDB】', tmdbLog);

      const results = tmdbResult.data;

      let found = false;
      let embyItem = null;

      if (results.length > 0) {
        // Try the first match
        const bestMatch = results[0];

        // Step 3: Emby
        const embyResult = await EmbyService.checkExistence(bestMatch.id);
        embyItem = embyResult.data;

        let embyLog = { ...embyResult.meta, response: embyItem ? `Found: ${embyItem.Name} (ID: ${embyItem.Id})` : 'Not Found' };
        if (embyResult.error) embyLog.response = { error: embyResult.error };

        log('【请求API: Emby】', embyLog);

        if (embyItem) {
          found = true;
          dot.className = 'us-dot found';
          dot.title = `Play ${embyItem.Name} on Emby`;
          dot.onclick = (e) => {
            e.preventDefault(); e.stopPropagation();
            UI.showDetailModal(cleanTitle, processLog, embyItem, [cleanTitle]);
          };
        }
      } else {
        log('【请求API: Emby】', { message: 'Skipped (No TMDB Result)' });
      }

      if (!found) {
        dot.className = 'us-dot not-found';
        dot.title = 'Not found in Emby';
        dot.onclick = (e) => {
          e.preventDefault(); e.stopPropagation();
          UI.showDetailModal(cleanTitle, processLog, null, [cleanTitle]);
        };
      }

      dot.classList.remove('loading');

    } catch (e) {
      console.error('GYG Check Error:', e);
      dot.className = 'us-dot error';
      log('Error', e.toString());
      dot.classList.remove('loading');
      dot.onclick = (e) => {
        e.preventDefault(); e.stopPropagation();
        UI.showDetailModal(cleanTitle, processLog, null, [cleanTitle]);
      };
    }
  }
}
