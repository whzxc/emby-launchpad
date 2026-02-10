import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';
import dts from 'vite-plugin-dts';
import pkg from './package.json'

export default defineConfig({
  plugins: [
    dts({
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.test.ts']
    }),
    {
      name: 'inject-env-vars',
      config() {
        return {
          define: {
            'process.env.NULLBR_APP_ID': JSON.stringify(process.env.NULLBR_APP_ID),
            'process.env.NULLBR_API_KEY': JSON.stringify(process.env.NULLBR_API_KEY),
          }
        }
      }
    },
    monkey({
      entry: 'src/main.ts',  // 暂时保持.js,稍后迁移
      userscript: {
        name: 'Emby&豆瓣影视检索增强',
        namespace: 'http://tampermonkey.net/',
        version: pkg.version,
        description: '在豆瓣(Douban)和GYG网页中自动检测Emby服务端库内是否存在当前影视,支持豆瓣详情页/列表页/排行榜/收藏页,以及GYG列表页/详情页。集成TMDB/IMDb评分,提供gyg.si/bt4gprx.com快捷搜索链接。支持缓存机制减少API请求。',
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
          'api.bgm.tv',
          'api.nullbr.eu.org'
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
      server: { mountGmApi: true },
    }),
  ],
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});
