// CACHE and ASSETS below are GENERATED — run `npm run build:sw` after changing
// any shipped file. The cache name is a hash of the assets' contents, so it can't
// go stale; test/build.test.js fails if this file drifts from the filesystem.
const CACHE = 'wordle-ef620502';

const ASSETS = [
  './',
  './css/styles.css',
  './fonts/rubik-latin-var.woff2',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './index.html',
  './js/config.js',
  './js/data/words-data.js',
  './js/game.js',
  './js/main.js',
  './js/settings.js',
  './js/storage.js',
  './js/ui/board.js',
  './js/ui/focus-trap.js',
  './js/ui/intro.js',
  './js/ui/keyboard.js',
  './js/ui/modal.js',
  './js/ui/settings-modal.js',
  './js/ui/toast.js',
  './js/words.js',
  './manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // `cache: 'reload'` bypasses the HTTP cache. Without it a plain addAll can
      // re-cache a stale copy of an asset and pin it there until the next bump.
      .then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first: the whole app is static, and offline play is the point.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request)
        .then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => (request.mode === 'navigate' ? caches.match('./index.html') : undefined));
    })
  );
});
