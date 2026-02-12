import { PageAdapter } from './interface';
import { bangumiService } from '@/services/api/bangumi';
import { log, addGlobalStyle } from '@/utils/common';
import { parseDmhyTitle } from '@/utils/title-parser';

export class DmhyAdapter implements PageAdapter {
  name = 'DMHY';

  match(url: string): boolean {
    return url.includes('dmhy.org');
  }

  async init(): Promise<void> {
    log('Initializing DMHY Adapter');

    // Inject global styles for the host page table (can't use Shadow DOM for host table)
    addGlobalStyle(`
      table#topic_list tr td span.tag { display: none; }
      .us-tag {
        display: inline-block;
        padding: 1px 6px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        margin-right: 4px;
        white-space: nowrap;
      }
      .us-tag-anime { background: #e3f2fd; color: #1565c0; }
      .us-tag-music { background: #fce4ec; color: #c62828; }
      .us-tag-manga { background: #e8f5e9; color: #2e7d32; }
      .us-tag-game { background: #fff3e0; color: #e65100; }
      .us-tag-other { background: #f3e5f5; color: #6a1b9a; }
      .us-tag-raw { background: #e0e0e0; color: #424242; }
      .us-tag-team { background: #fff8e1; color: #f57f17; }
      .us-bangumi-score {
        display: inline-block;
        margin-left: 5px;
        padding: 1px 6px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: bold;
        background: #e8f5e9;
        color: #2e7d32;
        cursor: help;
      }
    `);

    this.processTopicList();
  }

  private processTopicList(): void {
    const rows = document.querySelectorAll('#topic_list tbody tr');

    rows.forEach(row => {
      const titleCell = row.querySelector('td.title');
      if (!titleCell) return;

      const titleLink = titleCell.querySelector('a[href*="/topics/view/"]');
      if (!titleLink) return;

      const rawTitle = titleLink.textContent?.trim() || '';
      if (!rawTitle) return;

      // Parse title for tags
      const parsed = parseDmhyTitle(rawTitle);

      // Replace original tag spans with styled ones
      const tagSpans = titleCell.querySelectorAll('span.tag');
      tagSpans.forEach(span => {
        const tagText = span.textContent?.trim() || '';
        if (!tagText) return;

        const styledTag = document.createElement('span');
        styledTag.className = `us-tag ${this.getTagClass(tagText)}`;
        styledTag.textContent = tagText;
        span.replaceWith(styledTag);
      });

      // Add subtitle group tag if available
      if (parsed.group) {
        const teamTag = document.createElement('span');
        teamTag.className = 'us-tag us-tag-team';
        teamTag.textContent = parsed.group;
        titleLink.parentNode?.insertBefore(teamTag, titleLink);
      }

      // Bangumi search for anime titles
      if (parsed.title && this.isAnimeCategory(row)) {
        this.addBangumiScore(titleLink as HTMLElement, parsed.title);
      }
    });
  }

  private async addBangumiScore(titleEl: HTMLElement, title: string): Promise<void> {
    try {
      const result = await bangumiService.search(title);

      if (result.data?.score) {
        const badge = document.createElement('span');
        badge.className = 'us-bangumi-score';
        badge.textContent = `BGM ${result.data.score.toFixed(1)}`;
        badge.title = `${result.data.name_cn || result.data.name} - Bangumi Score`;
        titleEl.parentNode?.insertBefore(badge, titleEl.nextSibling);
      }
    } catch {
      // Silently ignore Bangumi errors
    }
  }

  private isAnimeCategory(row: Element): boolean {
    const catCell = row.querySelector('td:first-child');
    const text = catCell?.textContent?.trim().toLowerCase() || '';
    return text.includes('动画') || text.includes('anime') || text.includes('動畫');
  }

  private getTagClass(tag: string): string {
    const lower = tag.toLowerCase();
    if (lower.includes('动画') || lower.includes('anime')) return 'us-tag-anime';
    if (lower.includes('音乐') || lower.includes('music')) return 'us-tag-music';
    if (lower.includes('漫画') || lower.includes('manga')) return 'us-tag-manga';
    if (lower.includes('游戏') || lower.includes('game')) return 'us-tag-game';
    if (lower.includes('raw')) return 'us-tag-raw';
    return 'us-tag-other';
  }
}
