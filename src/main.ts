import { Utils } from './utils';
import { CONFIG } from './core/api-config';
import { SettingsHandler, CacheHandler } from './handlers/settings';
import { GYGHandler, GYGListHandler } from './handlers/gyg';
import { DoubanSubjectHandler } from './handlers/douban/subject';
import { DoubanListHandler } from './handlers/douban/list';
import { DmhyListHandler } from './handlers/dmhy';
import { addStyle } from '@/utils/style';


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
