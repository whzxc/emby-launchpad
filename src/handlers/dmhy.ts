import { Utils } from '@/utils';
import { UI } from '@/utils/ui';
import { CONFIG } from '@/core/api-config';
import { bangumiService } from '@/services/bangumi';
import { BaseMediaHandler } from './base-handler';
import { parseDmhyTitle } from '@/utils/title-parser';
import { MediaType } from '@/types/tmdb';

export class DmhyListHandler extends BaseMediaHandler {
  init(): void {
    Utils.log('Initializing DMHY List Handler');

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

  processRows(): void {
    const rows = document.querySelectorAll('table#topic_list tbody tr');
    Utils.log(`DMHY: Found ${rows.length} rows`);

    rows.forEach(tr => {
      const titleLink = tr.querySelector('td.title > a');
      if (!titleLink) return;

      if ((tr as HTMLElement).dataset.usChecked) return;
      (tr as HTMLElement).dataset.usChecked = 'true';

      this.checkRow(tr as HTMLElement, titleLink as HTMLAnchorElement);
    });
  }

  async checkRow(tr: HTMLElement, link: HTMLAnchorElement): Promise<void> {
    const rawTitle = link.textContent?.trim() || '';

    const parsed = parseDmhyTitle(rawTitle); // 使用统一工具
    const cleanTitle = parsed.title;

    const dot = UI.createDot({ titleElement: link });

    if (cleanTitle) {
      link.innerHTML = ''; // Clear content

      const addTag = (text: string, type: string, prepend = false): void => {
        if (!text) return;
        const span = document.createElement('span');
        span.className = `us-tag us-tag-${type}`;
        span.textContent = text;
        if (prepend) link.prepend(span);
        else link.appendChild(span);
      };

      link.appendChild(document.createTextNode(cleanTitle + ' ')); // Title first

      if (parsed.group) addTag(parsed.group, 'group'); // Group after title
      addTag(parsed.resolution || '', 'res');
      addTag(parsed.format || '', 'fmt');
      addTag(parsed.subtitle || '', 'sub');
    }

    if (!cleanTitle) return;

    try {
      let searchTitle = cleanTitle;
      let mediaType: MediaType = 'tv'; // Default type

      if (CONFIG.bangumi.apiKey) {
        const bgmResult = await bangumiService.search(cleanTitle);
        const bgmSubject = bgmResult.data;
        if (bgmSubject) {
          searchTitle = bgmSubject.name_cn || bgmSubject.name;
          if (bgmSubject.type === 1) {
            mediaType = 'movie';
          }
        }
      }

      const result = await this.checkMedia(searchTitle, '', mediaType, rawTitle);
      this.updateDotStatus(dot, result, cleanTitle, [cleanTitle, searchTitle]);
    } catch (e) {
      this.handleError(dot, e, cleanTitle, this.logger);
    }
  }

}
