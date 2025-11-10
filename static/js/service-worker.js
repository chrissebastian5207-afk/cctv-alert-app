// =========================================
// static/js/service-worker.js (Final)
// =========================================

const CACHE_NAME = 'cctv-alert-cache-v2';
const ASSETS = [
  '/',
  '/static/css/style.css',
  '/static/js/socket.js',
  '/static/js/ping.js',
  '/static/icons/icon-192.png',
  '/static/icons/icon-512.png',
  '/templates/admin_dashboard.html'
];

// ✅ Cache assets during install
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  console.log('[ServiceWorker] Installed and cached assets');
  self.skipWaiting(); // Activate immediately after install
});

// ✅ Activate new version and remove old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  console.log('[ServiceWorker] Activated and old caches cleared');
  self.clients.claim(); // Take control of open clients
});

// ✅ Serve from cache, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response; // Return from cache
      }
      return fetch(event.request).then(networkResponse => {
        // Optionally update cache dynamically
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse.clone()));
        return networkResponse;
      });
    })
  );
});
