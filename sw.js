// sw.js - Service Worker pour NutriDoc
const CACHE_NAME = 'nutridoc-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/dark-mode.css',
  '/js/auth.js',
  '/js/ciqual-data.js',
  '/js/constants.js',
  '/js/validation.js',
  '/js/error-handler.js',
  '/js/email.js',
  '/js/stripe.js',
  '/js/cookies.js',
  '/js/performance.js',
  '/js/auto-save.js',
  '/js/chatbot-widget.js',
  '/js/theme-selector.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
