// sw.js - Service Worker NutriDoc v2
// Chemins RELATIFS : compatibles GitHub Pages (/nutri-platform/) ET domaine OVH (racine)
const CACHE_NAME = 'nutridoc-v2';
const urlsToCache = [
  './',
  './index.html',
  './offline.html',
  './css/style.css',
  './css/home.css',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      // allSettled : un fichier manquant ne bloque plus toute l'installation
      Promise.allSettled(urlsToCache.map(u => cache.add(u)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(response =>
      response || fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') return caches.match('./offline.html');
      })
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.map(n => { if (n !== CACHE_NAME) return caches.delete(n); }))
    ).then(() => self.clients.claim())
  );
});
