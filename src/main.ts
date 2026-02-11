import { Utils } from './utils';
import { CONFIG } from './core/api-config';
import { CacheHandler, SettingsHandler } from './handlers/settings';
import { GYGHandler, GYGListHandler } from './handlers/gyg';
import { DmhyListHandler } from './handlers/dmhy';
import { addStyle } from '@/utils/style';
import { DoubanHandler } from '@/handlers/douban';

(function () {
  'use strict';

  addStyle();

  GM_registerMenuCommand('设置 / Settings', () => new SettingsHandler().showPanel());
  GM_registerMenuCommand('清除缓存 / Clear Cache', () => new CacheHandler().showPanel());

  const host = location.host;
  Utils.log(`Script Loaded. Host: ${host}, URL: ${location.href}`);

  if (!CONFIG.tmdb.apiKey) {
    Utils.log('TMDB API Key missing. Please configure in settings.');
  }

  if (/douban\.com/.test(host)) {
    Utils.log(`Host is douban.com`);
    const isSubject = /subject\/\d+/.test(location.href);
    const isList = /(explore|tv|chart|subject_collection)/.test(location.href);
    Utils.log(`Detection: isSubject=${isSubject}, isList=${isList}`);

    const handler = new DoubanHandler();

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
