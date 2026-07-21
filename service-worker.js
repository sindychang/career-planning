// 職涯轉職規劃 — 離線快取（v1）
const CACHE = 'career-app-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
  // 只預快取 manifest，不預快取 HTML（HTML 由 fetch 事件按需快取）
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./manifest.json']).catch(() => {})));
});

self.addEventListener('activate', e => {
  // 清除所有舊版快取
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  // Firebase、外部 API 一律直接走網路，不攔截
  if (u.origin !== location.origin) return;

  const isHTML =
    e.request.headers.get('accept')?.includes('text/html') ||
    u.pathname.endsWith('.html') ||
    u.pathname === '/' ||
    u.pathname.endsWith('/');

  if (isHTML) {
    // HTML 檔案 → 網路優先：一定先拿最新版，更新後立即生效
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // 其他靜態資源（manifest 等）→ 快取優先，節省流量
    e.respondWith(
      caches.match(e.request).then(cached =>
        cached || fetch(e.request).then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return res;
        }).catch(() => cached)
      )
    );
  }
});
