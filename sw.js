// Bump CACHE when any asset below changes so clients pick up the new build.
const CACHE = 'wordle-v7';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './fonts/rubik-latin-var.woff2',
  './js/main.js',
  './js/config.js',
  './js/game.js',
  './js/words.js',
  './js/data/words-data.js',
  './js/storage.js',
  './js/share.js',
  './js/ui/board.js',
  './js/ui/keyboard.js',
  './js/ui/modal.js',
  './js/ui/toast.js',
  './js/ui/intro.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
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
