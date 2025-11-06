// static/service-worker.js — minimal caching
const CACHE_NAME = 'cctv-cache-v1';
const ASSETS = ['/', '/static/css/style.css'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});
