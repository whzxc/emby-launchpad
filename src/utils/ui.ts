import { CONFIG } from '../core/api-config';
import { Utils } from './index';
import { EmbyItem } from '../services/emby';
import { nullbrService, Nullbr115Item, NullbrMagnetItem } from '../services/nullbr';

interface DotOptions {
  posterContainer?: HTMLElement;
  titleElement?: HTMLElement;
}

interface LogEntry {
  time: string;
  step: string;
  data?: unknown;
  status?: string;
}

interface LogDataWithMeta {
  meta?: {
    method?: string;
    url?: string;
    body?: unknown;
  };
  response?: unknown;
}

export const UI = {
  init(): void {
    Utils.addStyle(`
            /* DOT STYLES */
            .us-dot {
                position: absolute;
                z-index: 9999;
                border-radius: 50%;
                cursor: pointer;
                box-shadow: 0 0 8px rgba(0,0,0,0.5);
                border: 2px solid white;
                transition: transform 0.2s ease, opacity 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0; /* Hide text if any */
            }
            .us-dot:hover { transform: scale(1.15); }
            
            /* Loading: Blue Pulse */
            .us-dot.dog-loading {
                background-color: #01b4e4; /* TMDB Blue */
                animation: us-pulse 1.5s infinite;
                opacity: 0.8;
                border-color: rgba(255,255,255,0.8);
            }
            
            /* Found: Green */
            .us-dot.found {
                background-color: #52B54B; /* Emby Green */
                box-shadow: 0 0 10px rgba(82, 181, 75, 0.8);
            }
            
            /* Not Found or Error: Grey */
            .us-dot.not-found, .us-dot.error {
                background-color: #9e9e9e;
                opacity: 0.7;
            }

            @keyframes us-pulse {
                0% { transform: scale(0.95); opacity: 0.7; }
                50% { transform: scale(1.05); opacity: 1; }
                100% { transform: scale(0.95); opacity: 0.7; }
            }

            /* MODAL STYLES */
            .us-modal-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.6); z-index: 10000;
                display: flex; justify-content: center; align-items: center;
                backdrop-filter: blur(2px);
            }
            .us-modal {
                background: white; width: 500px; max-width: 90%; max-height: 85vh;
                border-radius: 12px; display: flex; flex-direction: column;
                box-shadow: 0 10px 25px rgba(0,0,0,0.3); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                overflow: hidden;
            }
            .us-modal-header {
                padding: 15px 20px; border-bottom: 1px solid #eee;
                display: flex; justify-content: space-between; align-items: center;
                background: #f8f9fa;
            }
            .us-modal-title { font-weight: bold; font-size: 16px; color: #333; }
            .us-modal-close { cursor: pointer; font-size: 20px; color: #999; line-height: 1; }
            .us-modal-close:hover { color: #333; }
            
            .us-modal-body {
                flex: 1; overflow-y: auto; padding: 0;
            }
            
            /* Action Section */
            .us-actions { padding: 20px; border-bottom: 1px solid #eee; text-align: center; }
            .us-status-icon { font-size: 40px; margin-bottom: 10px; display: block; }
            .us-status-text { font-size: 16px; font-weight: bold; margin-bottom: 15px; display: block; }
            .us-actions-links { display: flex; gap: 10px; flex-wrap: wrap; }
            
            .us-btn {
                display: inline-block; padding: 4px 8px; border-radius: 6px;
                text-decoration: none; font-size: 14px; font-weight: 500;
                cursor: pointer; border: none; transition: background 0.2s;
            }
            .us-btn-primary { background: #52B54B; color: white; }
            .us-btn-primary:hover { background: #43943d; }
            .us-btn-outline { background: white; color: #333; border: 1px solid #ddd; }
            .us-btn-outline:hover { background: #f5f5f5; }
            .us-btn-search { background: #eef9fd; color: #01b4e4; border: 1px solid #b3e5fc; text-decoration: none !important; }
            .us-btn-search:hover { background: #e1f5fe; color: #008dba !important; text-decoration: none !important; }

            /* Stepper Logs */
            .us-log-container { padding: 15px 20px; background: #fafafa; }
            .us-log-title { font-size: 13px; font-weight: bold; color: #666; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
            .us-step { display: flex; margin-bottom: 0; position: relative; padding-bottom: 15px; }
            .us-step:last-child { padding-bottom: 0; }
            .us-step::before {
                content: ''; position: absolute; left: 9px; top: 22px; bottom: 0; width: 2px; background: #e0e0e0;
                display: block; z-index: 1;
            }
            .us-step:last-child::before { display: none; }
            
            .us-step-icon {
                width: 20px; height: 20px; border-radius: 50%;
                background: #e0e0e0; color: white; font-size: 10px;
                display: flex; justify-content: center; align-items: center;
                z-index: 2; margin-right: 12px; flex-shrink: 0;
                margin-top: 2px;
            }
            .us-step.done .us-step-icon { background: #52B54B; }
            .us-step.error .us-step-icon { background: #dc3545; }
            .us-step.active .us-step-icon { background: #01b4e4; box-shadow: 0 0 0 3px rgba(1, 180, 228, 0.2); }
            
            .us-step-content { flex: 1; min-width: 0; }
            .us-step-header { font-size: 13px; font-weight: 600; color: #333; display: flex; justify-content: space-between; }
            .us-step-time { font-size: 11px; color: #999; font-weight: normal; }
            
            .us-step-details { font-size: 12px; color: #666; margin-top: 4px; overflow-wrap: break-word; }
            .us-json-view { 
                background: #f1f1f1; padding: 6px; border-radius: 4px; 
                font-family: monospace; white-space: pre-wrap; margin-top: 6px; 
                display: none; border: 1px solid #ddd;
            }
            .us-toggle-details { font-size: 11px; color: #01b4e4; cursor: pointer; margin-left: 5px; text-decoration: underline; }

            /* Nullbr RESOURCE STYLES */
            .us-nullbr-section {
                padding: 15px 20px;
                border-bottom: 1px solid #eee;
                background: linear-gradient(135deg, #667eea0a 0%, #764ba20a 100%);
            }
            .us-nullbr-header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 12px;
                font-weight: bold;
                color: #333;
            }
            .us-nullbr-badge {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 2px 8px;
                border-radius: 10px;
                font-size: 11px;
            }
            .us-nullbr-loading {
                text-align: center;
                color: #999;
                padding: 20px;
            }
            .us-nullbr-empty {
                text-align: center;
                color: #999;
                padding: 15px;
                font-size: 13px;
            }
            .us-resource-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
                max-height: 200px;
                overflow-y: auto;
            }
            .us-resource-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 12px;
                background: white;
                border-radius: 6px;
                border: 1px solid #e0e0e0;
                font-size: 12px;
                transition: all 0.2s;
            }
            .us-resource-item:hover {
                border-color: #667eea;
                box-shadow: 0 2px 6px rgba(102, 126, 234, 0.15);
            }
            .us-resource-info {
                flex: 1;
                min-width: 0;
            }
            .us-resource-title {
                font-weight: 500;
                color: #333;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 280px;
            }
            .us-resource-meta {
                display: flex;
                gap: 8px;
                margin-top: 3px;
                color: #888;
                font-size: 11px;
            }
            .us-resource-tag {
                background: #f0f0f0;
                padding: 1px 5px;
                border-radius: 3px;
            }
            .us-resource-tag.zh-sub {
                background: #e8f5e9;
                color: #388e3c;
            }
            .us-resource-actions {
                display: flex;
                gap: 6px;
            }
            .us-resource-btn {
                padding: 4px 10px;
                border-radius: 4px;
                border: none;
                cursor: pointer;
                font-size: 11px;
                transition: all 0.2s;
            }
            .us-resource-btn.primary {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            .us-resource-btn.primary:hover {
                opacity: 0.9;
            }
            .us-resource-btn.secondary {
                background: #f5f5f5;
                color: #666;
            }
            .us-resource-btn.secondary:hover {
                background: #e0e0e0;
            }
            .us-nullbr-tabs {
                display: flex;
                gap: 10px;
                margin-bottom: 12px;
            }
            .us-nullbr-tab {
                padding: 6px 12px;
                border-radius: 15px;
                background: #f0f0f0;
                color: #666;
                font-size: 12px;
                cursor: pointer;
                border: none;
                transition: all 0.2s;
            }
            .us-nullbr-tab.active {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            .us-nullbr-tab:hover:not(.active) {
                background: #e0e0e0;
            }
        `);
  },

  /**
   * Create a standardized status dot.
   */
  createDot(options: DotOptions = {}): HTMLDivElement {
    const { posterContainer, titleElement } = options;
    const dot = document.createElement('div');
    dot.className = 'us-dot dot-loading';
    dot.title = 'Initializing...';

    // Config: poster_tl, poster_tr, poster_bl, poster_br, title_left, title_right, auto
    let configPos = CONFIG.state.dotPosition || 'auto';

    // 1. Resolve 'auto' logic
    if (configPos === 'auto') {
      if (posterContainer) configPos = 'poster_tl';
      else configPos = 'title_left';
    }

    // 2. Resolve Fallback Logic (e.g. user forced poster but no poster provided)
    if (configPos.startsWith('poster_') && !posterContainer) {
      configPos = 'title_left';
    }

    const isTitlePos = configPos === 'title_left' || configPos === 'title_right';

    // 1. Determine Sizing & Styling based on Context
    if (isTitlePos && titleElement) {
      // TITLE CONTEXT: Inline flow
      dot.style.position = 'relative';
      dot.style.display = 'inline-block';
      dot.style.verticalAlign = 'middle';

      // Match font-ish size (fixed for consistency, but smaller)
      dot.style.width = '12px';
      dot.style.height = '12px';
      dot.style.marginTop = '-2px';

      // Remove heavy borders/shadows for inline look
      dot.style.boxShadow = 'none';
      dot.style.border = '1px solid rgba(0,0,0,0.1)';

    } else if (posterContainer) {
      // POSTER CONTEXT: Absolute, Adaptive but Smaller, Close to Edge
      const rect = posterContainer.getBoundingClientRect();
      // Smaller adaptive: 10% instead of 15%, max 24px
      const adaptive = Math.round(rect.width * 0.10);
      const size = Math.max(10, Math.min(20, adaptive));

      dot.style.width = `${size}px`;
      dot.style.height = `${size}px`;
      dot.style.position = 'absolute';
      dot.style.zIndex = '99'; // High z-index

      // Ensure container has relative positioning
      const computed = window.getComputedStyle(posterContainer);
      if (computed.position === 'static') posterContainer.style.position = 'relative';

      // Closer to edge: 4px or 5%
      const margin = Math.max(4, Math.round(rect.width * 0.03)) + 'px';

      switch (configPos) {
        case 'poster_tr': dot.style.top = margin; dot.style.right = margin; break;
        case 'poster_bl': dot.style.bottom = margin; dot.style.left = margin; break;
        case 'poster_br': dot.style.bottom = margin; dot.style.right = margin; break;
        case 'poster_tl':
        default: dot.style.top = margin; dot.style.left = margin; break;
      }
    } else {
      console.warn('UI.createDot: No valid container found.');
      return dot;
    }

    // 2. Append to DOM
    if (isTitlePos && titleElement) {
      // Insert into flow
      if (configPos === 'title_right') {
        titleElement.parentNode?.insertBefore(dot, titleElement.nextSibling);
        dot.style.marginLeft = '6px';
      } else {
        titleElement.parentNode?.insertBefore(dot, titleElement);
        dot.style.marginRight = '6px';
      }
    } else if (posterContainer) {
      posterContainer.appendChild(dot);
    }

    return dot;
  },

  /**
   * Show a modal with large text content.
   */
  showTextModal(title: string, content: string): void {
    const id = 'us-text-modal';
    const existing = document.getElementById(id);
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = id;
    overlay.className = 'us-modal-overlay';
    overlay.style.zIndex = '10001'; // Above detail modal

    overlay.onclick = (e: MouseEvent): void => {
      if (e.target === overlay) overlay.remove();
    };

    const html = `
        <div class="us-modal" style="width: 600px; max-width: 95%;">
            <div class="us-modal-header">
                <div class="us-modal-title">${title}</div>
                <div class="us-modal-close" onclick="document.getElementById('${id}')?.remove()">&times;</div>
            </div>
            <div class="us-modal-body" style="padding: 15px;">
                <textarea style="width:100%; height:400px; font-family:monospace; font-size:12px; border:1px solid #ddd; padding:10px; resize:vertical;" readonly>${content}</textarea>
            </div>
        </div>
        `;
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
  },

  /**
   * Show the Detail Modal.
   */
  showDetailModal(
    title: string,
    logs: LogEntry[],
    embyItem: EmbyItem | null = null,
    searchQueries: string[] = [],
    tmdbInfo?: { id: number; mediaType: 'movie' | 'tv' }
  ): void {
    const id = 'us-detail-modal';
    const existing = document.getElementById(id);
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = id;
    overlay.className = 'us-modal-overlay';

    // Close on overlay click
    overlay.onclick = (e: MouseEvent): void => {
      if (e.target === overlay) overlay.remove();
    };

    // --- Emby Card HTML ---
    let embyHtml = '';
    if (embyItem) {
      const year = embyItem.ProductionYear || '';
      const rating = embyItem.CommunityRating ? embyItem.CommunityRating.toFixed(1) : (embyItem.OfficialRating || '');
      const path = embyItem.Path || (embyItem.MediaSources && embyItem.MediaSources[0] && embyItem.MediaSources[0].Path) || 'Path Unknown';

      // Image
      const imgUrl = `${CONFIG.emby.server}/emby/Items/${embyItem.Id}/Images/Primary?maxHeight=300&maxWidth=200&quality=90`;

      // Tech Info
      let techInfo: string[] = [];
      const streamInfo: string[] = [];

      if (embyItem.MediaSources && embyItem.MediaSources.length > 0) {
        const source = embyItem.MediaSources[0];
        const sizeBytes = source.Size || 0;
        const sizeGB = (sizeBytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
        const container = source.Container || '';

        techInfo.push(sizeGB);
        if (container) techInfo.push(container.toUpperCase());

        // Streams
        if (source.MediaStreams) {
          const video = source.MediaStreams.find(s => s.Type === 'Video');
          const audios = source.MediaStreams.filter(s => s.Type === 'Audio');
          const subs = source.MediaStreams.filter(s => s.Type === 'Subtitle');

          if (video) {
            const resolution = (video.Width && video.Height) ? `${video.Width}x${video.Height}` : '';
            const codec = (video.Codec || '').toUpperCase();
            const bitrate = video.BitRate ? (video.BitRate / 1000000).toFixed(1) + ' Mbps' : '';
            const bitDepth = video.BitDepth ? `${video.BitDepth}bit` : '';

            const vInfo: string[] = [];
            if (resolution) vInfo.push(resolution);
            if (codec) vInfo.push(codec);
            if (bitrate) vInfo.push(bitrate);
            if (bitDepth) vInfo.push(bitDepth);
            if (vInfo.length) techInfo = [...techInfo, ...vInfo];
          }

          if (audios.length > 0) {
            const audioStr = audios.map(a => {
              const lang = (a.Language || 'und').toUpperCase();
              const codec = (a.Codec || '').toUpperCase();
              const channels = a.Channels ? (a.Channels === 6 ? '5.1' : (a.Channels === 8 ? '7.1' : '2.0')) : '';
              return `${lang} ${codec} ${channels}`.trim();
            }).join(' / ');
            streamInfo.push(`🔊 ${audioStr}`);
          }

          if (subs.length > 0) {
            const subStr = subs.map(s => {
              const lang = (s.Language || 'und').toUpperCase();
              const codec = (s.Codec || '').toUpperCase();
              const forced = s.IsForced ? '[Forced]' : '';
              return `${lang} ${codec}${forced}`.trim();
            }).join(' / ');
            streamInfo.push(`💬 ${subStr}`);
          }
        }
      }

      // Series Info
      let seriesInfo = '';
      if (embyItem.Type === 'Series') {
        if (embyItem.Seasons && embyItem.Seasons.length > 0) {
          const seasonBadges = embyItem.Seasons.map(s => {
            const sName = s.Name.replace('Season', 'S').replace('Specials', 'SP');
            const epCount = s.ChildCount || s.RecursiveItemCount || 0;
            return `<span style="background:#e8f5e9; color:#2e7d32; padding:2px 6px; border-radius:4px; font-size:11px; border:1px solid #c8e6c9;">${sName}: ${epCount}集</span>`;
          }).join(' ');
          seriesInfo = `<div style="margin-top:6px; display:flex; flex-wrap:wrap; gap:4px;">${seasonBadges}</div>`;
        } else {
          const seasonCount = embyItem.ChildCount || 0;
          const episodeCount = embyItem.RecursiveItemCount || 0;
          seriesInfo = `<div style="margin-top:5px; color:#52B54B; font-weight:bold;">${seasonCount} Seasons / ${episodeCount} Episodes</div>`;
        }
      }

      embyHtml = `
            <div style="display:flex; padding:20px; border-bottom:1px solid #eee; background:#fdfdfd;">
                <div style="flex-shrink:0; width:100px; margin-right:20px;">
                    <img src="${imgUrl}" style="width:100%; border-radius:6px; box-shadow:0 2px 8px rgba(0,0,0,0.1);" onerror="this.style.display='none'">
                </div>
                <div style="flex:1;">
                    <div style="font-size:18px; font-weight:bold; color:#333; margin-bottom:4px;">
                        ${embyItem.Name} <span style="font-weight:normal; color:#999; font-size:14px;">(${year})</span>
                    </div>
                    <div style="font-size:13px; color:#666; margin-bottom:8px;">
                        <span style="background:#eee; padding:2px 6px; border-radius:4px; margin-right:6px;">${embyItem.Type}</span>
                        ${rating ? `<span style="color:#f5c518; font-weight:bold;">★ ${rating}</span>` : ''}
                    </div>
                    ${seriesInfo}
                    <div style="font-size:12px; color:#555; margin-top:8px; line-height:1.4;">
                        <strong>Path:</strong> <span style="font-family:monospace; background:#f1f1f1; padding:2px 4px; border-radius:3px; word-break:break-all;">${path}</span>
                    </div>
                    <div style="font-size:12px; color:#999; margin-top:6px;">
                        ${techInfo.join(' • ')}
                    </div>
                    ${streamInfo.length > 0 ? `<div style="font-size:11px; color:#777; margin-top:6px; line-height:1.4;">${streamInfo.join('<br>')}</div>` : ''}
                    <div style="margin-top:12px;">
                        <a href="${CONFIG.emby.server}/web/index.html#!/item?id=${embyItem.Id}&serverId=${embyItem.ServerId}" target="_blank" class="us-btn us-btn-primary">▶ Play on Emby</a>
                    </div>
                </div>
            </div>
            `;
    }

    // --- Log Timeline HTML ---
    const stepsHtml = logs.map((l, index) => {
      const statusClass = (l.step.includes('Error') || l.status === 'error') ? 'error' : 'done'; // Basic heuristic

      let detailHtml = '';

      // Helper to render complex data
      const renderData = (data: unknown): string => {
        if (!data) return '';
        if (typeof data === 'string') return `<div style="margin-top:4px;">${data}</div>`;
        if (Array.isArray(data)) {
          // For arrays, maybe join them or just JSON dump
          return `<div class="us-json-view">${JSON.stringify(data, null, 2)}</div>`;
        }

        // Object: specialized rendering depending on structure
        let html = '<div style="margin-top:6px;">';
        for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
          if (val === null || val === undefined) continue;
          // Skip 'response' if handled separately, but here we process general objects
          html += `<div style="font-size:12px; margin-bottom:2px;">
                        <span style="color:#888;">${key}:</span> 
                        <span style="color:#333; font-family:monospace;">${typeof val === 'object' ? JSON.stringify(val) : val}</span>
                    </div>`;
        }
        html += '</div>';
        return html;
      };

      // Heuristic for structured log data (from new handler logic)
      // If data has 'meta' (url/method) and 'response'
      const logData = l.data as LogDataWithMeta | undefined;
      if (logData && logData.meta) {
        const meta = logData.meta;
        const response = logData.response;
        const method = meta.method || 'GET';
        const url = meta.url || '';
        const body = meta.body ? JSON.stringify(meta.body) : '';

        detailHtml += `
                    <div style="font-family:monospace; font-size:11px; color:#01b4e4; margin-bottom:4px; word-break:break-all;">
                        <span style="font-weight:bold;">${method}</span> <a href="${url}" target="_blank" style="color:#01b4e4; text-decoration:none;">${url}</a>
                    </div>
                    ${body ? `<div style="font-family:monospace; font-size:11px; color:#666; margin-bottom:4px;">Body: ${body}</div>` : ''}
                 `;

        if (response) {
          const respStr = typeof response === 'string' ? response : JSON.stringify(response, null, 2);
          // Truncate to ~5 lines logic: split by newlines, take 5, join.
          const lines = respStr.split('\n');
          const isLong = lines.length > 5 || respStr.length > 500; // Backup length check
          const shortResp = lines.slice(0, 5).join('\n') + (isLong ? '\n...' : '');

          detailHtml += `
                        <div style="margin-top:4px; border-left:2px solid #ddd; padding-left:8px;">
                            <div style="font-size:11px; color:#28a745; font-weight:bold;">Response:</div>
                            <div style="font-family:monospace; font-size:11px; color:#555; white-space:pre-wrap; word-break:break-all;">${shortResp}</div>
                            ${isLong ? `<div class="us-toggle-details" id="us-resp-btn-${index}">Show Full Response</div>` : ''}
                        </div>
                     `;

          // Store for later binding
          if (isLong) {
            if (!window._us_log_stash) window._us_log_stash = {};
            window._us_log_stash[index] = respStr;
          }
        }
      } else {
        // Default render
        detailHtml = renderData(l.data);
      }

      return `
            <div class="us-step ${statusClass}">
                <div class="us-step-icon">${index + 1}</div>
                <div class="us-step-content">
                    <div class="us-step-header">
                        <span>${l.step}</span>
                        <span class="us-step-time">${l.time}</span>
                    </div>
                    <div class="us-step-details">${detailHtml}</div>
                </div>
            </div>
            `;
    }).join('');

    // --- Search Links (Only if not found or explicit request) ---
    let actionsHtml = '';
    if (!embyItem && searchQueries.length > 0) {
      // 使用去重后的第一个有效查询词
      const uniqueQueries = [...new Set(searchQueries.filter(q => q && q.trim()))];
      const primaryQuery = uniqueQueries[0] || '';

      if (primaryQuery) {
        actionsHtml += `<a href="https://www.gyg.si/s/1---1/${encodeURIComponent(primaryQuery)}" target="_blank" class="us-btn us-btn-search">Search GYG</a>`;
        actionsHtml += `<a href="https://bt4gprx.com/search?orderby=size&p=1&q=${encodeURIComponent(primaryQuery)}" target="_blank" class="us-btn us-btn-search">Search BT4G</a>`;
        actionsHtml += `<a href="https://dmhy.org/topics/list?keyword=${encodeURIComponent(primaryQuery)}&sort_id=2&team_id=0&order=date-desc" target="_blank" class="us-btn us-btn-search">DMHY 搜全集</a>`;
      }
    }


    overlay.innerHTML = `
        <div class="us-modal">
            <div class="us-modal-header">
                <div class="us-modal-title">${title}</div>
                <div class="us-modal-close" onclick="document.getElementById('${id}')?.remove()">&times;</div>
            </div>
            
            <div class="us-modal-body">
                <!-- Nullbr Resources Section -->
                ${tmdbInfo ? `
                <div class="us-nullbr-section" id="us-nullbr-container">
                    <div class="us-nullbr-header">
                        <span>🔗 网盘 & 磁力资源</span>
                        <span class="us-nullbr-badge">Nullbr</span>
                    </div>
                    <div class="us-nullbr-loading" id="us-nullbr-loading">
                        <span>正在搜索资源...</span>
                    </div>
                    <div id="us-nullbr-content" style="display:none;"></div>
                </div>
                ` : ''}
                
                ${embyHtml}
                
                ${(!embyItem && searchQueries.length > 0) ? `
                <div class="us-actions">
                     <div class="us-status-text" style="color:#9e9e9e">Not Found in Library</div>
                     <div class="us-actions-links">${actionsHtml}</div>
                </div>` : ''}
                
                <div class="us-log-container">
                    <div class="us-log-title" style="margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:5px;">Process Log</div>
                    ${stepsHtml}
                </div>
            </div>
            
            <div style="padding:15px; background:#f8f9fa; text-align:right; border-top:1px solid #eee;">
                 <button class="us-btn us-btn-outline" onclick="document.getElementById('${id}')?.remove()">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Bind Stashed Logs
    if (window._us_log_stash) {
      Object.keys(window._us_log_stash).forEach(idx => {
        const btn = document.getElementById(`us-resp-btn-${idx}`);
        if (btn) {
          btn.onclick = () => UI.showTextModal('Full Response', window._us_log_stash![parseInt(idx)]);
        }
      });
    }

    // Load Nullbr Resources Asynchronously
    if (tmdbInfo) {
      UI.loadNullbrResources(tmdbInfo.id, tmdbInfo.mediaType);
    }
  },

  /**
   * Load and render Nullbr resources
   */
  async loadNullbrResources(tmdbId: number, mediaType: 'movie' | 'tv'): Promise<void> {
    const loadingEl = document.getElementById('us-nullbr-loading');
    const contentEl = document.getElementById('us-nullbr-content');

    if (!loadingEl || !contentEl) return;

    try {
      const resources = await nullbrService.getAllResources(tmdbId, mediaType);

      loadingEl.style.display = 'none';
      contentEl.style.display = 'block';

      if (!resources.hasData) {
        contentEl.innerHTML = '<div class="us-nullbr-empty">暂无可用资源</div>';
        return;
      }

      let html = '';

      // 115 Resources
      if (resources.items115.length > 0) {
        html += `
          <div style="margin-bottom:12px;">
            <div style="font-size:12px; font-weight:bold; color:#666; margin-bottom:8px;">📁 115 网盘分享 (${resources.items115.length})</div>
            <div class="us-resource-list">
        `;

        resources.items115.slice(0, 5).forEach((item: Nullbr115Item) => {
          const resolution = item.resolution ? `<span class="us-resource-tag">${item.resolution}</span>` : '';
          const quality = item.quality ? `<span class="us-resource-tag">${item.quality}</span>` : '';
          const seasons = item.season_list ? `<span class="us-resource-tag">${item.season_list.join(', ')}</span>` : '';

          html += `
            <div class="us-resource-item">
              <div class="us-resource-info">
                <div class="us-resource-title" title="${item.title}">${item.title}</div>
                <div class="us-resource-meta">
                  <span>${item.size}</span>
                  ${resolution}${quality}${seasons}
                </div>
              </div>
              <div class="us-resource-actions">
                <a href="${item.share_link}" target="_blank" class="us-resource-btn primary">打开链接</a>
              </div>
            </div>
          `;
        });

        html += '</div></div>';
      }

      // Magnet Resources
      if (resources.magnets.length > 0) {
        html += `
          <div>
            <div style="font-size:12px; font-weight:bold; color:#666; margin-bottom:8px;">🧲 磁力链接 (${resources.magnets.length})</div>
            <div class="us-resource-list">
        `;

        resources.magnets.slice(0, 5).forEach((item: NullbrMagnetItem, idx: number) => {
          const resolution = item.resolution ? `<span class="us-resource-tag">${item.resolution}</span>` : '';
          const source = item.source ? `<span class="us-resource-tag">${item.source}</span>` : '';
          const zhSub = item.zh_sub ? '<span class="us-resource-tag zh-sub">中字</span>' : '';

          html += `
            <div class="us-resource-item">
              <div class="us-resource-info">
                <div class="us-resource-title" title="${item.name}">${item.name}</div>
                <div class="us-resource-meta">
                  <span>${item.size}</span>
                  ${resolution}${source}${zhSub}
                </div>
              </div>
              <div class="us-resource-actions">
                <a href="${item.magnet}" class="us-resource-btn primary" style="text-decoration:none;">打开</a>
                <button class="us-resource-btn secondary" data-magnet="${item.magnet}" onclick="navigator.clipboard.writeText(this.dataset.magnet).then(()=>{this.textContent='已复制';setTimeout(()=>this.textContent='复制',1500)})">复制</button>
              </div>
            </div>
          `;
        });

        html += '</div></div>';
      }

      contentEl.innerHTML = html;

    } catch (error) {
      console.error('[Nullbr] Load error:', error);
      loadingEl.style.display = 'none';
      contentEl.style.display = 'block';
      contentEl.innerHTML = '<div class="us-nullbr-empty">加载资源失败</div>';
    }
  }
};
