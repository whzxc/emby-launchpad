import { Utils } from './utils';
import { CONFIG } from './config';
import { SettingsHandler, CacheHandler } from './handlers/settings';
import { GYGHandler, GYGListHandler } from './handlers/gyg';
import { DoubanSubjectHandler } from './handlers/douban/subject';
import { DoubanListHandler } from './handlers/douban/list';
import { DmhyListHandler } from './handlers/dmhy';
import { GM_registerMenuCommand } from '$';

(function () {
  'use strict';

  // --- Common Styles ---
  Utils.addStyle(`
        /* Shared Utility Classes */
        .us-flex-row { display: flex; align-items: center; }
        .us-flex-col { display: flex; flex-direction: column; }
        .us-hidden { display: none !important; }
        
        /* GYG Specific Styles */
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
        
        /* Douban Specific Styles */
        .douban-aside-box { margin-bottom: 30px; }
        .douban-gyg-header { display: flex; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0; }
        .douban-gyg-icon { width: 16px; height: 16px; margin-right: 8px; border-radius: 3px; }
        .douban-gyg-title { font-weight: bold; color: #333; font-size: 14px; }
        .douban-gyg-content { display: flex; align-items: center; justify-content: space-between; font-size: 13px; }
        .douban-gyg-link { color: #37a; text-decoration: none; display: flex; align-items: center; transition: color 0.2s; }
        .douban-gyg-link:hover { color: #01b4e4; background: none; }
        .rating_logo { font-size: 12px; color: #9b9b9b; }
        .rating_self { padding-top: 5px; }

        /* Settings Modal */
        .us-settings-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; justify-content: center; align-items: center; }
        .us-settings-modal { background: white; padding: 20px; border-radius: 8px; width: 400px; max-width: 90%; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .us-settings-row { margin-bottom: 15px; }
        .us-settings-label { display: block; font-weight: bold; margin-bottom: 5px; color: #333; }
        .us-settings-input { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
        .us-settings-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
        .us-button { padding: 8px 16px; border-radius: 4px; cursor: pointer; border: none; font-weight: bold; }
        .us-button-primary { background: #01b4e4; color: white; }
        .us-button-secondary { background: #eee; color: #333; }
    `);

  // --- Main Entry ---
  GM_registerMenuCommand('设置 / Settings', () => new SettingsHandler().showPanel());
  GM_registerMenuCommand('清除缓存 / Clear Cache', () => new CacheHandler().showPanel());

  const host = location.host;
  Utils.log(`Script Loaded. Host: ${host}, URL: ${location.href}`);

  // Check Config
  if (!CONFIG.tmdb.apiKey) {
    Utils.log('TMDB API Key missing. Please configure in settings.');
    // Optional: Auto-open settings if critical
    // new SettingsHandler().showPanel();
  }

  if (/douban\.com/.test(host)) {
    Utils.log(`Host is douban.com`);
    const isSubject = /subject\/\d+/.test(location.href);
    const isList = /(explore|tv|chart|subject_collection)/.test(location.href);
    Utils.log(`Detection: isSubject=${isSubject}, isList=${isList}`);

    let handler;
    if (isSubject) {
      Utils.log('Creating DoubanSubjectHandler');
      handler = new DoubanSubjectHandler();
    } else if (isList) {
      handler = new DoubanListHandler();
    }

    if (handler) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => handler.init());
      } else {
        handler.init();
      }
    }
  } else if (/gyg\.si/.test(host)) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        new GYGHandler().init();
        new GYGListHandler().init();
      }, 500);
    });
  } else if (/dmhy\.org/.test(host)) {
    window.addEventListener('load', () => {
      new DmhyListHandler().init();
    });
  }

})();
