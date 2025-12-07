// Service Worker
const CACHE_VERSION = 'v1';
const CACHE_NAME = `travel-checklist-${CACHE_VERSION}`;

// 需要快取的靜態資源
const STATIC_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/css/app.css',
  '/assets/js/storage.js',
  '/assets/js/user.js',
  '/assets/js/checklist.js',
  '/assets/js/app.js',
  '/data/default-checklist.json',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js'
];

// 安裝事件 - 預快取所有靜態資源
self.addEventListener('install', (event) => {
  console.log('[SW] 安裝中...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] 快取靜態資源');
        return cache.addAll(STATIC_CACHE);
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

// 攔截請求 - Cache First 策略
self.addEventListener('fetch', (event) => {
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
            return caches.match('/index.html');
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
