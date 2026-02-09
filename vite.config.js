import { defineConfig } from 'vite';
import monkey, { cdn } from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.js',
      userscript: {
        name: 'Emby&豆瓣影视检索增强',
        namespace: 'http://tampermonkey.net/',
        version: '1.2.0',
        description: '在豆瓣(Douban)和GYG网页中自动检测Emby服务端库内是否存在当前影视，支持豆瓣详情页/列表页/排行榜/收藏页，以及GYG列表页/详情页。集成TMDB/IMDb评分，提供gyg.si/bt4gprx.com快捷搜索链接。支持缓存机制减少API请求。',
        author: 'leo',
        match: [
          'https://movie.douban.com/*',
          'https://m.douban.com/*',
          'https://www.gyg.si/*',
          'https://dmhy.org/*'
        ],
        connect: [
          'api.themoviedb.org',
          'www.gyg.si',
          'www.imdb.com',
          'www.rottentomatoes.com',
          'api.bgm.tv'
        ],
        license: 'MIT',
        grant: [
          'GM_xmlhttpRequest',
          'GM_addStyle',
          'GM_setClipboard',
          'GM_getValue',
          'GM_setValue',
          'GM_listValues',
          'GM_deleteValue',
          'GM_registerMenuCommand',
          'GM_getResourceText'
        ],
      },
    }),
  ],
});
