import { Cache } from '../utils';

export class SettingsHandler {
  constructor() {
    this.id = 'us-settings-overlay';
  }

  showPanel() {
    if (document.getElementById(this.id)) return;

    const overlay = document.createElement('div');
    overlay.id = this.id;
    overlay.className = 'us-settings-overlay';
    overlay.innerHTML = `
            <div class="us-settings-modal">
                <h3 style="margin-top:0; margin-bottom:20px;">脚本设置 / Settings</h3>
                <div class="us-settings-row">
                    <label class="us-settings-label">TMDB API Key</label>
                    <input type="text" id="us-tmdb-key" class="us-settings-input" value="${GM_getValue('tmdb_api_key', '')}" placeholder="Required for ratings">
                </div>
                <div class="us-settings-row">
                    <label class="us-settings-label">Emby Server URL</label>
                    <input type="text" id="us-emby-server" class="us-settings-input" value="${GM_getValue('emby_server', '')}" placeholder="https://emby.example.com">
                </div>
                <div class="us-settings-row">
                    <label class="us-settings-label">Emby API Key</label>
                    <input type="text" id="us-emby-key" class="us-settings-input" value="${GM_getValue('emby_api_key', '')}" placeholder="Required for library check">
                </div>
                <div class="us-settings-row">
                    <label class="us-settings-label">Bangumi Token (Optional)</label>
                    <input type="text" id="us-bangumi-token" class="us-settings-input" value="${GM_getValue('bangumi_token', '')}" placeholder="For Anime Search Optimization">
                </div>
                
                <div class="us-settings-row">
                    <label>Dot Position (圆点位置)</label>
                    <select id="us-dot-pos" style="width:100%; padding:8px; border-radius:4px; border:1px solid #ddd;">
                        <option value="auto">Auto (智能自动)</option>
                        <option value="poster_tl">Poster Top-Left (海报左上)</option>
                        <option value="poster_tr">Poster Top-Right (海报右上)</option>
                        <option value="poster_bl">Poster Bottom-Left (海报左下)</option>
                        <option value="poster_br">Poster Bottom-Right (海报右下)</option>
                        <option value="title_left">Title Left (标题左侧)</option>
                        <option value="title_right">Title Right (标题右侧)</option>
                    </select>
                </div>
                
                
                <div class="us-settings-actions">
                    <button id="us-btn-cancel" class="us-button us-button-secondary">Cancel</button>
                    <button id="us-btn-save" class="us-button us-button-primary">Save</button>
                </div>
            </div>
        `;

    document.body.appendChild(overlay);

    // Set default value for Dot Position
    document.getElementById('us-dot-pos').value = GM_getValue('us_dot_position', 'auto');

    document.getElementById('us-btn-cancel').onclick = () => this.close();
    document.getElementById('us-btn-save').onclick = () => {
      // Save Dot Position
      const dotPos = document.getElementById('us-dot-pos').value;
      GM_setValue('us_dot_position', dotPos);
      this.save();
    };
  }

  save() {
    const tmdbKey = document.getElementById('us-tmdb-key').value.trim();
    const embyServer = document.getElementById('us-emby-server').value.trim().replace(/\/$/, '');
    const embyKey = document.getElementById('us-emby-key').value.trim();
    const bangumiToken = document.getElementById('us-bangumi-token').value.trim();

    GM_setValue('tmdb_api_key', tmdbKey);
    GM_setValue('emby_server', embyServer);
    GM_setValue('emby_api_key', embyKey);
    GM_setValue('bangumi_token', bangumiToken);

    alert('Settings saved. Refreshing page...');
    this.close();
    location.reload();
  }

  close() {
    const el = document.getElementById(this.id);
    if (el) el.remove();
  }
}


export class CacheHandler {
  constructor() {
    this.id = 'us-cache-overlay';
  }

  showPanel() {
    if (document.getElementById(this.id)) return;

    const overlay = document.createElement('div');
    overlay.id = this.id;
    overlay.className = 'us-settings-overlay';
    overlay.innerHTML = `
            <div class="us-settings-modal" style="width: 320px;">
                <h3 style="margin-top:0; margin-bottom:20px;">清除缓存 / Clear Cache</h3>
                
                <div class="us-settings-row" style="margin-bottom:15px;">
                   <div style="display:flex; flex-direction:column; gap:8px;">
                      <label style="cursor:pointer;"><input type="checkbox" id="us-cache-emby" checked> Emby Data</label>
                      <label style="cursor:pointer;"><input type="checkbox" id="us-cache-tmdb" checked> TMDB Search</label>
                      <label style="cursor:pointer;"><input type="checkbox" id="us-cache-imdb" checked> IMDb Ratings</label>
                   </div>
                </div>

                <div class="us-settings-actions" style="justify-content: space-between; align-items: center;">
                    <span id="us-cache-msg" style="font-size:12px; color:#52B54B; opacity:0; transition:opacity 0.5s;">Done!</span>
                    <div style="display:flex; gap:10px;">
                        <button id="us-btn-close-cache" class="us-button us-button-secondary">Close</button>
                        <button id="us-btn-do-clear" class="us-button us-button-primary">Clear</button>
                    </div>
                </div>
            </div>
        `;

    document.body.appendChild(overlay);

    document.getElementById('us-btn-close-cache').onclick = () => this.close();

    document.getElementById('us-btn-do-clear').onclick = () => {
      const filters = [];
      if (document.getElementById('us-cache-emby').checked) filters.push('emby');
      if (document.getElementById('us-cache-tmdb').checked) filters.push('tmdb');
      if (document.getElementById('us-cache-imdb').checked) filters.push('imdb');

      const count = Cache.clear(filters);
      const msg = document.getElementById('us-cache-msg');
      msg.textContent = `Cleared ${count} items.`;
      msg.style.opacity = '1';
      setTimeout(() => msg.style.opacity = '0', 3000);
    };
  }

  close() {
    const el = document.getElementById(this.id);
    if (el) el.remove();
  }
}
