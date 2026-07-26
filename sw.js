// Service Worker
const CACHE_VERSION = 'v8';
const CACHE_NAME = `travel-checklist-${CACHE_VERSION}`;

// 以 Service Worker 所在位置為基準，避免 GitHub Pages 子目錄部署時路徑錯誤
const BASE = new URL('./', self.location).pathname;

// 本站資源（必須全部成功，否則離線功能不完整）
const LOCAL_CACHE = [
  BASE,
  BASE + 'index.html',
  BASE + 'manifest.json',
  BASE + 'assets/css/app.css',
  BASE + 'assets/js/users.js',
  BASE + 'assets/js/storage.js',
  BASE + 'assets/js/checklist.js',
  BASE + 'assets/js/app.js',
  BASE + 'data/default-checklist.json'
];

// 外部 CDN 資源（可能因跨網域限制無法快取，允許個別失敗，不可中斷安裝）
const CDN_CACHE = [
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js'
];

// 安裝事件 - 預快取靜態資源
self.addEventListener('install', (event) => {
  console.log('[SW] 安裝中...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        // 本站資源：全部一起快取，任一失敗代表部署有問題
        await cache.addAll(LOCAL_CACHE);

        // CDN 資源：逐一嘗試，用 no-cors 避免跨網域錯誤，失敗就跳過
        await Promise.all(CDN_CACHE.map(async (url) => {
          try {
            const resp = await fetch(url, { mode: 'no-cors' });
            await cache.put(url, resp);
          } catch (e) {
            console.warn('[SW] CDN 快取略過:', url);
          }
        }));
      })
      .then(() => self.skipWaiting())
  );
});

// 啟動事件 - 清除舊版本快取
self.addEventListener('activate', (event) => {
  console.log('[SW] 啟動中...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] 刪除舊快取:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 攔截請求
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  // 導覽請求（開啟頁面）走 Network First，
  // 確保 index.html 內的 ?v= 版本號更新後手機能立即取得新版程式
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request)
            .then((cached) => cached || caches.match(BASE + 'index.html'));
        })
    );
    return;
  }

  // 其他靜態資源走 Cache First（網址帶版本號，改版時自然換新網址）
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // 如果快取中有，直接返回
        if (cachedResponse) {
          return cachedResponse;
        }

        // 否則發送網路請求
        return fetch(event.request)
          .then((response) => {
            // 檢查是否為有效回應
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            // 複製回應並快取
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // 網路失敗時，返回離線頁面（如果有的話）
            return caches.match(BASE + 'index.html');
          });
      })
  );
});

// 訊息監聽 - 用於強制更新快取
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});
