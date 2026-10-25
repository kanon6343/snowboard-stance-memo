/* Release shell: bump RELEASE and every versioned index.html asset together. */
const RELEASE = '1045';
const BASE = new URL('./', self.registration.scope);
const CACHE_PREFIX = `snowboard-stance-haru-detail:${BASE.href}:`;
const CACHE_NAME = `${CACHE_PREFIX}${RELEASE}`;
const SHELL = [
  'index.html', `style.css?v=${RELEASE}`, `outdoor.css?v=${RELEASE}`,
  `theme.css?v=${RELEASE}`, `theme.js?v=${RELEASE}`, `script.js?v=${RELEASE}`,
  `pwa.css?v=${RELEASE}`, `pwa.js?v=${RELEASE}`, 'manifest.webmanifest',
  `board-suggestions.css?v=${RELEASE}`, `board-suggestions.js?v=${RELEASE}`,
  `detail.css?v=${RELEASE}`, `detail.js?v=${RELEASE}`,
  `history-views.css?v=${RELEASE}`, `history-views.js?v=${RELEASE}`,
  `ui-consistency.css?v=${RELEASE}`,
  `menu-ui.css?v=${RELEASE}`, `menu-ui.js?v=${RELEASE}`,
  `board-shape-history.js?v=${RELEASE}`,
  `history-stats.js?v=${RELEASE}`,
  'icons/icon-trial-192.png', 'icons/icon-trial-512.png',
  'icons/icon-trial-maskable-512.png', 'icons/apple-touch-icon-trial.png',
].map(path => new URL(path, BASE).href);
const SHELL_URLS = new Set(SHELL);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== BASE.origin || !url.pathname.startsWith(BASE.pathname)) return;
  const navigation = request.mode === 'navigate' && (url.pathname === BASE.pathname || url.pathname === new URL('index.html', BASE).pathname);
  if (!navigation && !SHELL_URLS.has(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(navigation ? new URL('index.html', BASE).href : request);
    if (cached) return cached;
    try { return await fetch(request); }
    catch (error) {
      if (!navigation) throw error;
      return new Response('<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>スタンスメモ</title><h1>通信を確認してください</h1><p>アプリの準備がまだ完了していません。通信できる状態で一度開いてください。履歴データを削除する必要はありません。</p></html>', {status: 503, headers: {'Content-Type': 'text/html; charset=utf-8'}});
    }
  })());
});
