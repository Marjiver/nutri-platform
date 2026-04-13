/**
 * sw.js — NutriDoc · Service Worker pour PWA
 * Gestion du cache et du mode hors ligne
 * 
 * Version: 1.0.0
 */

const CACHE_NAME = 'nutridoc-v1.0.0';
const OFFLINE_URL = '/offline.html';

// Fichiers à mettre en cache (core)
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/bilan.html',
  '/dashboard.html',
  '/dietitian.html',
  '/prescripteur-dashboard.html',
  '/prescripteur-crm.html',
  '/faq.html',
  '/login.html',
  '/inscription-dieteticien.html',
  '/inscription-prescripteur.html',
  '/css/home.css',
  '/css/dashboard.css',
  '/css/dietitian.css',
  '/css/prescripteur.css',
  '/css/forms.css',
  '/css/components.css',
  
  // JavaScript Core
  '/js/core/ciqual-data.js',
  '/js/core/auth.js',
  '/js/core/constants.js',
  '/js/core/validation.js',
  
  // JavaScript Modules
  '/js/modules/dashboard.js',
  '/js/modules/dietitian.js',
  '/js/modules/bilan.js',
  '/js/modules/prescripteur-dashboard.js',
  '/js/modules/prescripteur-crm.js',
  
  // JavaScript UI
  '/js/ui/nav.js',
  '/js/ui/cookies.js',
  '/js/ui/support.js',
  '/js/ui/quiz.js',
  '/js/ui/home.js',
  '/js/ui/chatbot-widget.js',
  
  // JavaScript Utils
  '/js/utils/email.js',
  '/js/utils/pdf-plan.js',
  '/js/utils/queue.js',
  '/js/utils/error-handler.js',
  
  // JavaScript Payments
  '/js/payments/stripe.js',
  
  // JavaScript Forms
  '/js/forms/inscription-dieteticien.js',
  '/js/forms/inscription-prescripteur.js',
  
  // Librairies tierces
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Outfit:wght@300;400;500;600;700&display=swap'
];

// Fichiers API à ne pas mettre en cache (dynamiques)
const EXCLUDED_PATTERNS = [
  /\/api\//,
  /\/functions\//,
  /\/auth\//,
  /\.json$/,
  /\/stripe\//
];

// ── Installation du Service Worker ──────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installation...');
  
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      console.log('[SW] Mise en cache des fichiers statiques');
      
      // Cache des fichiers statiques avec gestion d'erreur
      const cachePromises = STATIC_CACHE_URLS.map(async (url) => {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response);
          } else {
            console.warn(`[SW] Impossible de cacher ${url}: ${response.status}`);
          }
        } catch (error) {
          console.warn(`[SW] Erreur de cache pour ${url}:`, error);
        }
      });
      
      await Promise.all(cachePromises);
      
      // Cache de la page hors ligne
      const offlineResponse = await fetch(OFFLINE_URL);
      if (offlineResponse.ok) {
        await cache.put(OFFLINE_URL, offlineResponse);
      }
      
      await self.skipWaiting();
    })()
  );
});

// ── Activation du Service Worker ────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation...');
  
  event.waitUntil(
    (async () => {
      // Nettoyer les anciens caches
      const cacheNames = await caches.keys();
      const oldCaches = cacheNames.filter(name => name !== CACHE_NAME);
      
      await Promise.all(
        oldCaches.map(name => {
          console.log(`[SW] Suppression de l'ancien cache: ${name}`);
          return caches.delete(name);
        })
      );
      
      // Prendre le contrôle de toutes les pages
      await self.clients.claim();
      
      // Notifier la page que le SW est actif
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'SW_ACTIVATED',
          version: CACHE_NAME
        });
      });
    })()
  );
});

// ── Stratégie de cache : Stale-While-Revalidate ─────────────
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then(async (networkResponse) => {
    if (networkResponse && networkResponse.status === 200) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch((error) => {
    console.warn(`[SW] Erreur réseau pour ${request.url}:`, error);
    return null;
  });
  
  return cachedResponse || fetchPromise;
}

// ── Stratégie de cache : Cache First (pour les assets) ──────
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.warn(`[SW] Erreur pour ${request.url}:`, error);
    return new Response('Resource not available offline', {
      status: 404,
      statusText: 'Not Found'
    });
  }
}

// ── Stratégie de cache : Network First (pour les API) ───────
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.warn(`[SW] Hors ligne, tentative de cache pour ${request.url}`);
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Retourner une réponse hors ligne personnalisée
    if (request.destination === 'document') {
      return caches.match(OFFLINE_URL);
    }
    
    return new Response('Offline - Content not available', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// ── Interception des requêtes ───────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Exclure certaines requêtes du cache
  const isExcluded = EXCLUDED_PATTERNS.some(pattern => pattern.test(url.pathname));
  if (isExcluded) {
    return;
  }
  
  // Stratégie différente selon le type de requête
  let strategy;
  
  // API calls → Network First
  if (url.pathname.includes('/api/') || url.pathname.includes('/functions/')) {
    strategy = networkFirst(event.request);
  }
  // Assets statiques (images, fonts, CSS, JS) → Cache First
  else if (/\.(css|js|png|jpg|jpeg|svg|webp|woff2?|ttf)$/i.test(url.pathname)) {
    strategy = cacheFirst(event.request);
  }
  // Pages HTML → Stale While Revalidate
  else if (event.request.destination === 'document') {
    strategy = staleWhileRevalidate(event.request);
  }
  // Tout le reste → Network First avec fallback
  else {
    strategy = networkFirst(event.request);
  }
  
  event.respondWith(strategy);
});

// ── Gestion des messages du client ──────────────────────────
self.addEventListener('message', (event) => {
  const data = event.data;
  
  switch (data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CLEAR_CACHE':
      (async () => {
        await caches.delete(CACHE_NAME);
        event.ports[0].postMessage({ success: true });
      })();
      break;
      
    case 'GET_CACHE_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
      
    default:
      console.log('[SW] Message non traité:', data.type);
  }
});

// ── Synchronisation en arrière-plan (Background Sync) ───────
self.addEventListener('sync', (event) => {
  console.log('[SW] Synchronisation en arrière-plan:', event.tag);
  
  if (event.tag === 'sync-bilan') {
    event.waitUntil(syncBilanData());
  }
  
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

async function syncBilanData() {
  console.log('[SW] Synchronisation des bilans en attente...');
  // Implémentation de la synchronisation des données hors ligne
  // À compléter selon vos besoins
}

async function syncMessages() {
  console.log('[SW] Synchronisation des messages...');
}

// ── Notifications push ──────────────────────────────────────
self.addEventListener('push', (event) => {
  console.log('[SW] Notification push reçue:', event);
  
  let data = {
    title: 'NutriDoc',
    body: 'Nouvelle notification',
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/badge-72x72.png'
  };
  
  if (event.data) {
    try {
      data = JSON.parse(event.data.text());
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});