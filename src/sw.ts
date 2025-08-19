// Minimal service worker for installability and basic offline shell
// Note: Kept intentionally simple for robustness.

const CACHE_NAME = 'gh-static-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event: any) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => void 0)
  );
  // Activate immediately on first load
  // @ts-ignore
  self.skipWaiting && self.skipWaiting();
});

self.addEventListener('activate', (event: any) => {
  event.waitUntil(
    // @ts-ignore
    self.clients && self.clients.claim ? self.clients.claim() : Promise.resolve()
  );
});

// Optional: network-first for navigation requests with offline fallback
self.addEventListener('fetch', (event: any) => {
  const req = event.request as Request;
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match('/index.html');
        return cached ?? Response.error();
      })
    );
  }
});
