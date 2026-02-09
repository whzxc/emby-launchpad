import { Utils } from '../utils';
import { UI } from '../utils/ui';
import { CONFIG } from '../config';
import { TmdbService } from '../services/tmdb';
import { EmbyService } from '../services/emby';
import { BangumiService } from '../services/bangumi';

export class DmhyListHandler {
  init() {
    Utils.log('Initializing DMHY List Handler');
    UI.init();
    Utils.addStyle(`
        table#topic_list tr td span.tag { display: none; }
        .us-tag {
            display: inline-block;
            padding: 2px 6px;
            margin: 0 2px;
            border-radius: 4px;
            font-size: 11px;
            color: white;
            line-height: 1.2;
            vertical-align: middle;
        }
        .us-tag-group { background-color: #4A90E2; margin-right: 5px; }
        .us-tag-res { background-color: #F5A623; }
        .us-tag-fmt { background-color: #7ED321; }
        .us-tag-sub { background-color: #9013FE; }
      `);

    this.processRows();
  }

  processRows() {
    // DMHY table selector assumption: id="topic_list" > tbody > tr
    const rows = document.querySelectorAll('table#topic_list tbody tr');
    Utils.log(`DMHY: Found ${rows.length} rows`);

    rows.forEach(tr => {
      const titleLink = tr.querySelector('td.title > a');
      if (!titleLink) return;

      // Avoid reprocessing
      if (tr.dataset.usChecked) return;
      tr.dataset.usChecked = 'true';

      this.checkRow(tr, titleLink);
    });
  }

  async checkRow(tr, link) {
    const rawTitle = link.textContent.trim();

    // Process Log Record
    const processLog = [];
    const log = (step, data) => {
      processLog.push({ time: new Date().toLocaleTimeString(), step, data });
    };

    // Step 1: 解析标题
    const parsed = this.parseTitle(rawTitle);
    log('【解析标题】', {
      'Original Title': rawTitle,
      'Parsed Title': parsed.title,
      'Group': parsed.group,
      'Resolution': parsed.res,
      'Format': parsed.fmt,
      'Subtitle': parsed.sub
    });

    const cleanTitle = parsed.title;

    // Add loading/status indicator (The Shared Dot)
    // DMHY typically has no poster in list, so we pass titleElement only.
    // 'auto' mode will default to 'title_left'.
    const dot = UI.createDot({ titleElement: link });

    const updateDot = (status, titleOverride) => {
      dot.className = `us-dot ${status}`;
      dot.title = titleOverride || dot.title;
    };

    // Default Click: Show Modal
    dot.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      UI.showDetailModal(cleanTitle, processLog, null, [cleanTitle]);
    };

    // Update UI if valid
    if (cleanTitle) {
      link.innerHTML = ''; // Clear content

      const addTag = (text, type, prepend = false) => {
        if (!text) return;
        const span = document.createElement('span');
        span.className = `us-tag us-tag-${type}`;
        span.textContent = text;
        if (prepend) link.prepend(span);
        else link.appendChild(span);
      };

      // Order: [Title] [Group] [Res] [Fmt] [Sub]
      link.appendChild(document.createTextNode(cleanTitle + ' ')); // Title first

      if (parsed.group) addTag(parsed.group, 'group'); // Group after title
      addTag(parsed.res, 'res');
      addTag(parsed.fmt, 'fmt');
      addTag(parsed.sub, 'sub');
    }

    if (!cleanTitle) return;

    try {
      let searchTitle = cleanTitle;
      let mediaType = 'tv'; // Default type



      // Step 2: Bangumi
      if (CONFIG.bangumi.token) {
        const bgmResult = await BangumiService.search(cleanTitle);

        let bgmLog = { ...bgmResult.meta, response: bgmResult.data || bgmResult.error || 'No Result' };
        log('【请求API: Bangumi】', bgmLog);

        const bgmSubject = bgmResult.data;
        if (bgmSubject) {
          searchTitle = bgmSubject.name_cn || bgmSubject.name;
          // Detect Media Type (Movie vs TV)
          if (bgmSubject.eps === 1) {
            mediaType = 'movie';
          }
        }
      }

      // Step 3: TMDB
      const tmdbResult = await TmdbService.search(searchTitle, '', mediaType);

      let tmdbLog = { ...tmdbResult.meta, response: { count: tmdbResult.data.length, top_result: tmdbResult.data[0] || null } };
      if (tmdbResult.error) tmdbLog.response = { error: tmdbResult.error };

      log('【请求API: TMDB】', tmdbLog);

      const results = tmdbResult.data;
      let found = false;
      let embyItem = null;

      if (results.length > 0) {
        const bestMatch = results[0];

        // Step 4: Emby
        const embyResult = await EmbyService.checkExistence(bestMatch.id);
        const embyItemFound = embyResult.data;

        let embyLog = { ...embyResult.meta, response: embyItemFound ? `Found: ${embyItemFound.Name} (ID: ${embyItemFound.Id})` : 'Not Found' };
        if (embyResult.error) embyLog.response = { error: embyResult.error };

        log('【请求API: Emby】', embyLog);

        embyItem = embyItemFound;

        if (embyItem) {
          found = true;
          updateDot('found', `Found: ${embyItem.Name}`);

          dot.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            UI.showDetailModal(cleanTitle, processLog, embyItem, [cleanTitle, searchTitle]);
          };
        }
      } else {
        log('【请求API: Emby】', { message: 'Skipped (No TMDB Result)' });
      }

      if (!found) {
        updateDot('not-found', `Not found. Checked as ${mediaType}`);
        dot.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          UI.showDetailModal(cleanTitle, processLog, null, [cleanTitle, searchTitle]);
        };
      }

      dot.classList.remove('loading');

    } catch (e) {
      console.error('DMHY Check Error:', e);
      log('Error', e.toString());
      updateDot('error', 'Error occurred');
      dot.classList.remove('loading');
      dot.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        UI.showDetailModal(cleanTitle, processLog, null, [cleanTitle]);
      };
    }
  }

  parseTitle(raw) {
    let title = raw;
    let group = '';
    let res = '';
    let sub = '';
    let fmt = '';

    // 1. Extract Group (Brackets at start)
    const groupMatch = title.match(/^(?:\[|【)([^\]】]+)(?:\]|】)/);
    if (groupMatch) {
      group = groupMatch[1];
      title = title.replace(groupMatch[0], ' ');
    }

    // 2. Extract Resolution
    const resMatch = title.match(/(?:1080[pP]|720[pP]|2160[pP]|4[kK])/);
    if (resMatch) {
      res = resMatch[0];
      title = title.replace(new RegExp(resMatch[0], 'i'), ' ');
    }

    // 3. Extract Format
    const fmtKeywords = ['AVC', 'HEVC', 'x264', 'x265', 'MP4', 'MKV', 'WebRip', 'BDRip', 'AAC', 'OPUS', '10bit', '8bit'];
    const foundFmts = [];
    fmtKeywords.forEach(k => {
      const regex = new RegExp(k, 'i');
      if (regex.test(title)) {
        foundFmts.push(k);
        title = title.replace(regex, ' ');
      }
    });
    fmt = foundFmts.join(' ');

    // 4. Extract Subtitles
    const subKeywords = ['CHS', 'CHT', 'GB', 'BIG5', 'JPN', 'ENG', '简', '繁', '日', '双语', '内封', '外挂'];
    title = title.replace(/(?:\[|【|\()([^\]】)]+)(?:\]|】|\))/g, (match, content) => {
      const up = content.toUpperCase();
      if (subKeywords.some(k => up.includes(k))) {
        sub += ' ' + content;
        return ' ';
      }
      return match;
    });

    // 5. Clean Main Title (Scoring Logic)
    const scoreStr = (str) => {
      let s = 0; if (!str) return -999;
      const lower = str.toLowerCase();
      if (/[\u4e00-\u9fa5]/.test(str)) s += 15;
      if (str.includes('/')) s += 5;
      const len = str.length;
      if (len >= 2) s += Math.min(len, 20) * 0.5;
      let techCount = 0;
      if (/(?:1080p|720p|mkv|mp4|avc|hevc|aac|opus|bdrip|web-dl|remux|fin|v\d|av1)/.test(lower)) techCount = 1;
      if (/(?:字幕组|搬运|新番|合集|整理|发布|制作|招募|staff)/i.test(str)) s -= 20;
      if (techCount > 0) s -= 5;
      return s;
    };

    const blockRegex = /(?:\[[^\]]+\]|【[^】]+】|★[^★]+★|\([^\)]+\))/g;
    const blocks = title.match(blockRegex) || [];
    const naked = title.replace(blockRegex, ' ').trim();

    let bestStr = naked;
    let maxScore = scoreStr(naked);
    if (naked.length < 2 && !/[\u4e00-\u9fa5]/.test(naked)) maxScore -= 10;

    blocks.forEach(b => {
      const content = b.slice(1, -1);
      const score = scoreStr(content);
      if (score > maxScore) { maxScore = score; bestStr = content; }
    });
    title = bestStr;

    // Standardize & Remove noise
    title = title.replace(/[|／_]/g, '/');
    const techKeywords = /(?:1080p|720p|2160p|4k|web|bdrip|avc|hevc|aac|mp4|mkv|big5|chs|cht|jpn|eng|s\d+|season|fin|opus|x264|x265|10bit|tv动画|剧场版|ova|cd|others)/gi;
    title = title.replace(techKeywords, ' ');
    title = title.replace(/第\s*\d+(\-\d+)?\s*[话集季]/g, ' ');
    title = title.replace(/\s\d+-\d+/g, ' ');
    title = title.replace(/\[\d+(?:-\d+)?\]/g, ' ');

    if (title.includes('/')) {
      const parts = title.split('/').map(p => p.trim());
      const cnPart = parts.find(p => /[\u4e00-\u9fa5]/.test(p) && p.length > 1);
      if (cnPart) title = cnPart; else title = parts[0];
    }

    title = title.split('：')[0];
    const parenMatch = title.match(/^([\u4e00-\u9fa5\s\w:-]+)\s*[\(（]/);
    if (parenMatch) title = parenMatch[1];

    title = title.replace(/[\[\]【】()（）★]/g, ' ').replace(/\s+/g, ' ').trim();

    return {
      title, group: group.trim(), res: res.trim(), sub: sub.trim(), fmt: fmt.trim()
    };
  }
}
