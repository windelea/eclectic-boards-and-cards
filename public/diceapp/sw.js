// Cache-first service worker: the whole app works offline after first visit.
// Bump VERSION whenever any shipped file changes.

// Keep in sync with BUILD in js/app.js — the app compares them and shows a
// MISMATCH warning in Settings if a stale asset gets cached.
const VERSION = 'ebc-dice-v13';
const ASSETS = [
  './',
  './index.html',
  './css/app.css',
  './js/app.js',
  './js/state.js',
  './js/dice.js',
  './js/interactions.js',
  './js/clusters.js',
  './js/ui.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('message', (e) => {
  if (e.data === 'GET_VERSION') {
    e.source.postMessage({ type: 'VERSION', version: VERSION });
  }
});

self.addEventListener('install', (e) => {
  // cache: 'reload' bypasses the HTTP cache. Without it addAll can re-cache a
  // stale app.js from Safari's cache, producing a "new" service worker serving
  // old code — which is exactly what hid two rounds of fixes on iOS.
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => {
        if (e.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
