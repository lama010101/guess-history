// Build-aware service worker for Guess History
const swUrl = new URL(self.location.href);
const BUILD_ID = swUrl.searchParams.get('build') || 'dev';
const CACHE_NAME = `gh-static-${BUILD_ID}`;
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => void 0)
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('gh-static-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients?.claim?.())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING' && self.skipWaiting) {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(async () => (await caches.open(CACHE_NAME)).match('/index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});
