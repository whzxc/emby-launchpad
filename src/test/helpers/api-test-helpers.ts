export function hasValidApiKeys() {
  return {
    tmdb: !!process.env.TMDB_API_KEY,
    emby: !!(process.env.EMBY_SERVER && process.env.EMBY_API_KEY),
    bangumi: !!process.env.BANGUMI_TOKEN,
    imdb: true // IMDB 不需要 API Key
  };
}

export function skipIfNoApiKey(service: keyof ReturnType<typeof hasValidApiKeys>): boolean {
  const keys = hasValidApiKeys();
  return !keys[service];
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function randomString(length: number = 8): string {
  return Math.random().toString(36).substring(2, 2 + length);
}
