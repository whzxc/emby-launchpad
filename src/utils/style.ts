export function addStyle() {
  GM_addStyle(`
.us-flex-row { display: flex; align-items: center; }
.us-flex-col { display: flex; flex-direction: column; }
.us-hidden { display: none !important; }

.tmdb-wrapper {
    animation: fadeIn 0.5s ease;
    display: flex;
    flex-direction: column;
    gap: 10px;
}
.gyg-card {
    display: flex;
    flex-direction: column;
    padding: 10px;
    background: white;
    border-radius: 8px;
    border: 1px solid #eee;
    box-shadow: 0 1px 4px rgba(0,0,0,0.05);
    transition: all 0.2s;
}
.tmdb-header-row { display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
.tmdb-source { font-size: 12px; color: #888; font-weight: bold; }
.tmdb-score { font-size: 20px; font-weight: bold; color: #01b4e4; }
.tmdb-copy-area {
    margin-top: 8px; padding-top: 8px; border-top: 1px dashed #ddd; font-size: 13px; color: #555;
    cursor: copy; position: relative; transition: color 0.2s; display: flex; align-items: center; justify-content: space-between;
}
.tmdb-copy-area:hover { color: #01b4e4; background-color: rgba(0,0,0,0.01); }
.emby-card { display: flex; flex-direction: row; justify-content: space-between; align-items: center; cursor: pointer; }
.emby-card:hover { background: rgba(0,0,0,0.02); }
.emby-label { font-size: 13px; font-weight: bold; color: #333; }
.emby-badge { padding: 2px 8px; border-radius: 4px; color: white; font-weight: bold; font-size: 11px; }
.emby-yes { background-color: #52B54B; }
.emby-no { background-color: #999; }
.emby-loading { background-color: #ddd; color: #666; }
.copy-toast {
    position: absolute; right: 0; top: -20px; background: #333; color: #fff; padding: 2px 6px;
    border-radius: 4px; font-size: 10px; opacity: 0; transition: opacity 0.3s; pointer-events: none;
}
.copy-toast.show { opacity: 1; }

.douban-aside-box { margin-bottom: 30px; }
.douban-gyg-header { display: flex; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0; }
.douban-gyg-icon { width: 16px; height: 16px; margin-right: 8px; border-radius: 3px; }
.douban-gyg-title { font-weight: bold; color: #333; font-size: 14px; }
.douban-gyg-content { display: flex; align-items: center; justify-content: space-between; font-size: 13px; }
.douban-gyg-link { color: #37a; text-decoration: none; display: flex; align-items: center; transition: color 0.2s; }
.douban-gyg-link:hover { color: #01b4e4; background: none; }
.rating_logo { font-size: 12px; color: #9b9b9b; }
.rating_self { padding-top: 5px; }

.us-settings-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; justify-content: center; align-items: center; }
.us-settings-modal { background: white; padding: 20px; border-radius: 8px; width: 400px; max-width: 90%; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
.us-settings-row { margin-bottom: 15px; }
.us-settings-label { display: block; font-weight: bold; margin-bottom: 5px; color: #333; }
.us-settings-input { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
.us-settings-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.us-button { padding: 8px 16px; border-radius: 4px; cursor: pointer; border: none; font-weight: bold; }
.us-button-primary { background: #01b4e4; color: white; }
.us-button-secondary { background: #eee; color: #333; }

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
    font-size: 0; 
}
.us-dot:hover { transform: scale(1.15); }

.us-dot.dog-loading {
    background-color: #01b4e4; 
    animation: us-pulse 1.5s infinite;
    opacity: 0.8;
    border-color: rgba(255,255,255,0.8);
}

.us-dot.found {
    background-color: #52B54B; 
    box-shadow: 0 0 10px rgba(82, 181, 75, 0.8);
}

.us-dot.not-found, .us-dot.error {
    background-color: #9e9e9e;
    opacity: 0.7;
}

@keyframes us-pulse {
    0% { transform: scale(0.95); opacity: 0.7; }
    50% { transform: scale(1.05); opacity: 1; }
    100% { transform: scale(0.95); opacity: 0.7; }
}

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
}
