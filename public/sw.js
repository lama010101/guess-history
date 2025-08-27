// Minimal service worker for Guess History
const CACHE_NAME = 'gh-static-v2';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest'];
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => void 0)
  );
  self.skipWaiting && self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients && self.clients.claim ? self.clients.claim() : Promise.resolve());
});
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(async () => (await caches.open(CACHE_NAME)).match('/index.html'))
    );
  }
});
