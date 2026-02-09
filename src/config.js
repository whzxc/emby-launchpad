export const CONFIG = {
  get tmdb() {
    return {
      apiKey: GM_getValue('tmdb_api_key', ''),
      baseUrl: 'https://api.themoviedb.org/3',
    };
  },
  get emby() {
    return {
      server: GM_getValue('emby_server', ''),
      apiKey: GM_getValue('emby_api_key', '')
    };
  },
  gyg: {
    baseUrl: 'https://www.gyg.si'
  },
  get bangumi() {
    return {
      token: GM_getValue('bangumi_token', '')
    };
  },
  get state() {
    return {
      dotPosition: GM_getValue('us_dot_position', 'auto')
    };
  }
};



