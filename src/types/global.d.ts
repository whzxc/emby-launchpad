
interface Window {
  GM_getValue: typeof GM_getValue;
  GM_setValue: typeof GM_setValue;
  GM_listValues: typeof GM_listValues;
  GM_deleteValue: typeof GM_deleteValue;
  GM_xmlhttpRequest: typeof GM_xmlhttpRequest;
  GM_addStyle: typeof GM_addStyle;
  GM_setClipboard: typeof GM_setClipboard;
  GM_registerMenuCommand: typeof GM_registerMenuCommand;
  _us_log_stash?: Record<number, string>;
}

interface ImportMetaEnv {
  readonly VITE_TMDB_API_KEY: string;
  readonly VITE_EMBY_SERVER: string;
  readonly VITE_EMBY_API_KEY: string;
  readonly VITE_BANGUMI_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const GM_getValue: (key: string, defaultValue?: any) => any;
declare const GM_setValue: (key: string, value: any) => void;
declare const GM_listValues: () => string[];
declare const GM_deleteValue: (key: string) => void;
declare const GM_addStyle: (css: string) => void;
declare const GM_setClipboard: (text: string) => void;
declare const GM_registerMenuCommand: (caption: string, commandFunc: () => void) => void;
declare const GM_xmlhttpRequest: (details: any) => void;
