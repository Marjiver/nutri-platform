/**
 * pwa.js — NutriDoc · Gestionnaire PWA
 * Installation, mise à jour, notifications push
 */

const PWA_CONFIG = {
  swUrl: '/sw.js',
  manifestUrl: '/manifest.json',
  enablePushNotifications: true,
  vapidPublicKey: 'VOTRE_CLE_VAPID_PUBLIQUE' // À remplacer par votre clé
};

let deferredPrompt = null;
let swRegistration = null;

// ── Vérifier si le navigateur supporte les PWA ──────────────
function isPwaSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

// ── Enregistrement du Service Worker ─────────────────────────
async function registerServiceWorker() {
  if (!isPwaSupported()) {
    console.warn('[PWA] Service Worker non supporté');
    return false;
  }
  
  try {
    const registration = await navigator.serviceWorker.register(PWA_CONFIG.swUrl);
    swRegistration = registration;
    console.log('[PWA] Service Worker enregistré avec succès');
    
    // Vérifier les mises à jour
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      console.log('[PWA] Nouvelle version du Service Worker trouvée');
      
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateNotification();
        }
      });
    });
    
    // Écouter les messages du Service Worker
    navigator.serviceWorker.addEventListener('message', handleSWMessage);
    
    return true;
  } catch (error) {
    console.error('[PWA] Erreur d\'enregistrement du Service Worker:', error);
    return false;
  }
}

// ── Gestion des messages du Service Worker ───────────────────
function handleSWMessage(event) {
  const data = event.data;
  
  switch (data.type) {
    case 'SW_ACTIVATED':
      console.log('[PWA] Service Worker activé, version:', data.version);
      break;
    default:
      console.log('[PWA] Message du SW:', data);
  }
}

// ── Notification de mise à jour ─────────────────────────────
function showUpdateNotification() {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: #0d2018;
    color: white;
    padding: 12px 20px;
    border-radius: 999px;
    font-size: 14px;
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    cursor: pointer;
  `;
  toast.innerHTML = `
    <span>🔄 Nouvelle version disponible</span>
    <button style="background:#1D9E75;border:none;color:white;padding:6px 12px;border-radius:999px;cursor:pointer;">Mettre à jour</button>
  `;
  
  toast.querySelector('button').addEventListener('click', () => {
    toast.remove();
    window.location.reload();
  });
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    if (toast.parentElement) toast.remove();
  }, 10000);
}

// ── Installation de l'application (Add to Home Screen) ──────
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  // Afficher un bouton d'installation personnalisé
  showInstallButton();
});

function showInstallButton() {
  // Vérifier si le bouton existe déjà
  if (document.getElementById('pwa-install-btn')) return;
  
  const btn = document.createElement('button');
  btn.id = 'pwa-install-btn';
  btn.innerHTML = '📱 Installer l\'application';
  btn.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    background: #1D9E75;
    color: white;
    border: none;
    padding: 10px 18px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: inherit;
  `;
  
  btn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] Installation ${outcome}`);
    deferredPrompt = null;
    btn.remove();
  });
  
  document.body.appendChild(btn);
}

// ── Notifications push ───────────────────────────────────────
async function requestNotificationPermission() {
  if (!PWA_CONFIG.enablePushNotifications) return false;
  if (!('Notification' in window)) return false;
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

async function subscribeToPush() {
  if (!swRegistration) return null;
  if (!PWA_CONFIG.enablePushNotifications) return null;
  
  const permissionGranted = await requestNotificationPermission();
  if (!permissionGranted) return null;
  
  try {
    const subscription = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: PWA_CONFIG.vapidPublicKey
    });
    
    // Envoyer la subscription au serveur
    await fetch('/api/push-subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    });
    
    console.log('[PWA] Push subscription réussie');
    return subscription;
  } catch (error) {
    console.error('[PWA] Erreur push subscription:', error);
    return null;
  }
}

// ── Vérifier le statut hors ligne ───────────────────────────
function initOfflineDetection() {
  window.addEventListener('online', () => {
    console.log('[PWA] Connexion rétablie');
    showToast('Connexion rétablie ✓', 'success');
  });
  
  window.addEventListener('offline', () => {
    console.log('[PWA] Connexion perdue');
    showToast('Connexion perdue. Mode hors ligne activé.', 'warning');
  });
}

// ── Cache les données importantes pour le mode hors ligne ────
async function cacheImportantData() {
  try {
    // Sauvegarder le bilan en cache
    const bilan = localStorage.getItem('nutridoc_bilan');
    if (bilan) {
      const cache = await caches.open('nutridoc-data-v1');
      const response = new Response(bilan, {
        headers: { 'Content-Type': 'application/json' }
      });
      await cache.put('/api/cached-bilan', response);
    }
    
    console.log('[PWA] Données importantes mises en cache');
  } catch (error) {
    console.warn('[PWA] Erreur cache données:', error);
  }
}

// ── Synchronisation des données au retour de connexion ──────
async function syncDataOnReconnect() {
  window.addEventListener('online', async () => {
    // Synchroniser les données en attente
    const pendingData = localStorage.getItem('nutridoc_pending_sync');
    if (pendingData) {
      try {
        const data = JSON.parse(pendingData);
        // Envoyer les données au serveur
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: pendingData
        });
        localStorage.removeItem('nutridoc_pending_sync');
        showToast('Données synchronisées ✓', 'success');
      } catch (error) {
        console.error('[PWA] Erreur synchronisation:', error);
      }
    }
  });
}

// ── Initialisation de la PWA ─────────────────────────────────
async function initPWA() {
  console.log('[PWA] Initialisation...');
  
  if (!isPwaSupported()) {
    console.warn('[PWA] Navigateur non compatible');
    return;
  }
  
  await registerServiceWorker();
  initOfflineDetection();
  await cacheImportantData();
  syncDataOnReconnect();
  
  // Optionnel : demander les notifications après interaction
  document.body.addEventListener('click', () => {
    if (!localStorage.getItem('notifications_asked')) {
      setTimeout(() => {
        subscribeToPush();
        localStorage.setItem('notifications_asked', 'true');
      }, 5000);
    }
  }, { once: true });
  
  console.log('[PWA] Initialisé avec succès');
}

// Démarrer l'initialisation au chargement
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPWA);
} else {
  initPWA();
}

// Exports globaux
window.initPWA = initPWA;
window.subscribeToPush = subscribeToPush;
window.requestNotificationPermission = requestNotificationPermission;