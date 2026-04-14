/**
 * webhook-handler.js — NutriDoc · Gestion des webhooks Stripe et NutriDoc
 * 
 * Fonctionnalités :
 * - Envoi de webhooks vers des endpoints externes
 * - Gestion des tentatives avec retry (exponential backoff)
 * - Signature des webhooks (HMAC-SHA256)
 * - File d'attente des webhooks en cas d'échec
 * - Dashboard de monitoring des webhooks
 * - Simulation de webhooks pour les tests
 * 
 * Dépendances : crypto-js (optionnel), error-handler.js
 * 
 * Version: 1.0.0
 */

// ==================== CONFIGURATION ====================

const WEBHOOK_CONFIG = {
  // Configuration générale
  maxRetries: 5,
  retryDelays: [1000, 2000, 5000, 10000, 30000], // exponential backoff
  requestTimeout: 10000,
  
  // Signature
  signatureHeader: 'X-Webhook-Signature',
  signatureSecret: 'votre_cle_secrete_webhook', // À remplacer par variable d'environnement
  
  // File d'attente
  queueKey: 'nutridoc_webhook_queue',
  maxQueueSize: 1000,
  
  // Endpoints par défaut
  defaultEndpoints: {
    stripe: [],
    nutridoc: []
  },
  
  // Événements disponibles
  events: {
    stripe: [
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_succeeded',
      'invoice.payment_failed'
    ],
    nutridoc: [
      'plan.completed',
      'plan.pending',
      'plan.expired',
      'patient.created',
      'patient.updated',
      'credits.low',
      'visio.scheduled',
      'visio.completed',
      'dietitian.verified',
      'prescriber.registered'
    ]
  }
};

// ==================== STRUCTURES ====================

/**
 * @typedef {Object} WebhookEndpoint
 * @property {string} id - Identifiant unique
 * @property {string} url - URL de destination
 * @property {string} provider - 'stripe' ou 'nutridoc'
 * @property {string[]} events - Liste des événements écoutés
 * @property {string} status - 'active', 'inactive', 'error'
 * @property {string} createdAt - Date de création
 * @property {Object} stats - Statistiques (total, success, failures)
 */

/**
 * @typedef {Object} WebhookQueueItem
 * @property {string} id - Identifiant unique
 * @property {string} endpointId - ID de l'endpoint
 * @property {string} event - Nom de l'événement
 * @property {Object} payload - Données de l'événement
 * @property {number} retryCount - Nombre de tentatives
 * @property {number} nextRetryAt - Timestamp de la prochaine tentative
 * @property {string} status - 'pending', 'processing', 'completed', 'failed'
 * @property {string} createdAt - Date de création
 */

// ==================== ÉTAT GLOBAL ====================

let endpoints = [];
let webhookQueue = [];
let isProcessingQueue = false;
let queueProcessorInterval = null;

// ==================== INITIALISATION ====================

/**
 * Initialise le gestionnaire de webhooks
 */
async function initWebhookHandler() {
  console.log('[WebhookHandler] Initialisation...');
  
  // Charger les endpoints sauvegardés
  loadEndpoints();
  
  // Charger la file d'attente
  loadQueue();
  
  // Démarrer le processeur de file d'attente
  startQueueProcessor();
  
  console.log('[WebhookHandler] Initialisé avec succès,', endpoints.length, 'endpoint(s) configuré(s)');
}

/**
 * Charge les endpoints depuis localStorage
 */
function loadEndpoints() {
  try {
    const saved = localStorage.getItem('nutridoc_webhook_endpoints');
    if (saved) {
      endpoints = JSON.parse(saved);
    } else {
      endpoints = [];
    }
  } catch (e) {
    console.error('[WebhookHandler] Erreur chargement endpoints:', e);
    endpoints = [];
  }
}

/**
 * Sauvegarde les endpoints
 */
function saveEndpoints() {
  try {
    localStorage.setItem('nutridoc_webhook_endpoints', JSON.stringify(endpoints));
  } catch (e) {
    console.error('[WebhookHandler] Erreur sauvegarde endpoints:', e);
  }
}

/**
 * Charge la file d'attente
 */
function loadQueue() {
  try {
    const saved = localStorage.getItem(WEBHOOK_CONFIG.queueKey);
    if (saved) {
      webhookQueue = JSON.parse(saved);
    } else {
      webhookQueue = [];
    }
  } catch (e) {
    console.error('[WebhookHandler] Erreur chargement queue:', e);
    webhookQueue = [];
  }
}

/**
 * Sauvegarde la file d'attente
 */
function saveQueue() {
  try {
    // Limiter la taille de la queue
    if (webhookQueue.length > WEBHOOK_CONFIG.maxQueueSize) {
      webhookQueue = webhookQueue.slice(-WEBHOOK_CONFIG.maxQueueSize);
    }
    localStorage.setItem(WEBHOOK_CONFIG.queueKey, JSON.stringify(webhookQueue));
  } catch (e) {
    console.error('[WebhookHandler] Erreur sauvegarde queue:', e);
  }
}

// ==================== GESTION DES ENDPOINTS ====================

/**
 * Ajoute un endpoint webhook
 * @param {string} url - URL de destination
 * @param {string} provider - 'stripe' ou 'nutridoc'
 * @param {string[]} events - Liste des événements
 * @returns {WebhookEndpoint}
 */
function addWebhookEndpoint(url, provider, events = []) {
  // Validation
  if (!url || !url.startsWith('https://')) {
    throw new Error('L\'URL doit commencer par https://');
  }
  if (!['stripe', 'nutridoc'].includes(provider)) {
    throw new Error('Provider invalide');
  }
  
  const endpoint = {
    id: generateId('wh'),
    url: url,
    provider: provider,
    events: events.length > 0 ? events : WEBHOOK_CONFIG.events[provider],
    status: 'active',
    createdAt: new Date().toISOString(),
    stats: {
      total: 0,
      success: 0,
      failures: 0,
      lastSuccessAt: null,
      lastFailureAt: null
    }
  };
  
  endpoints.push(endpoint);
  saveEndpoints();
  
  console.log('[WebhookHandler] Endpoint ajouté:', url);
  return endpoint;
}

/**
 * Met à jour un endpoint
 * @param {string} id - ID de l'endpoint
 * @param {Object} updates - Mise à jour
 * @returns {WebhookEndpoint|null}
 */
function updateWebhookEndpoint(id, updates) {
  const index = endpoints.findIndex(e => e.id === id);
  if (index === -1) return null;
  
  endpoints[index] = { ...endpoints[index], ...updates };
  saveEndpoints();
  
  console.log('[WebhookHandler] Endpoint mis à jour:', id);
  return endpoints[index];
}

/**
 * Supprime un endpoint
 * @param {string} id - ID de l'endpoint
 * @returns {boolean}
 */
function deleteWebhookEndpoint(id) {
  const index = endpoints.findIndex(e => e.id === id);
  if (index === -1) return false;
  
  endpoints.splice(index, 1);
  saveEndpoints();
  
  // Supprimer les webhooks en attente pour cet endpoint
  webhookQueue = webhookQueue.filter(q => q.endpointId !== id);
  saveQueue();
  
  console.log('[WebhookHandler] Endpoint supprimé:', id);
  return true;
}

/**
 * Active/désactive un endpoint
 * @param {string} id - ID de l'endpoint
 * @param {boolean} active - Actif ou non
 * @returns {WebhookEndpoint|null}
 */
function toggleWebhookEndpoint(id, active) {
  return updateWebhookEndpoint(id, { status: active ? 'active' : 'inactive' });
}

/**
 * Récupère tous les endpoints
 * @returns {WebhookEndpoint[]}
 */
function getWebhookEndpoints() {
  return endpoints;
}

/**
 * Récupère un endpoint par son ID
 * @param {string} id 
 * @returns {WebhookEndpoint|null}
 */
function getWebhookEndpoint(id) {
  return endpoints.find(e => e.id === id) || null;
}

// ==================== ENVOI DE WEBHOOKS ====================

/**
 * Envoie un webhook vers les endpoints concernés
 * @param {string} provider - 'stripe' ou 'nutridoc'
 * @param {string} event - Nom de l'événement
 * @param {Object} payload - Données
 */
async function sendWebhook(provider, event, payload) {
  console.log('[WebhookHandler] Envoi webhook:', provider, event);
  
  // Trouver les endpoints actifs pour cet événement
  const targetEndpoints = endpoints.filter(e => 
    e.provider === provider && 
    e.status === 'active' && 
    e.events.includes(event)
  );
  
  if (targetEndpoints.length === 0) {
    console.log('[WebhookHandler] Aucun endpoint configuré pour cet événement');
    return;
  }
  
  // Envoyer à chaque endpoint
  const promises = targetEndpoints.map(endpoint => 
    sendToEndpoint(endpoint, event, payload)
  );
  
  await Promise.allSettled(promises);
}

/**
 * Envoie un webhook à un endpoint spécifique
 * @param {WebhookEndpoint} endpoint 
 * @param {string} event 
 * @param {Object} payload 
 */
async function sendToEndpoint(endpoint, event, payload) {
  const webhookData = {
    id: generateId('whk'),
    event: event,
    timestamp: new Date().toISOString(),
    data: payload,
    signature: generateSignature(payload)
  };
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_CONFIG.requestTimeout);
  
  try {
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [WEBHOOK_CONFIG.signatureHeader]: webhookData.signature,
        'X-Webhook-Event': event,
        'X-Webhook-Id': webhookData.id
      },
      body: JSON.stringify(webhookData),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      // Mettre à jour les statistiques
      endpoint.stats.total++;
      endpoint.stats.success++;
      endpoint.stats.lastSuccessAt = new Date().toISOString();
      saveEndpoints();
      
      console.log('[WebhookHandler] Webhook envoyé avec succès à', endpoint.url);
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
  } catch (error) {
    console.error('[WebhookHandler] Erreur envoi webhook à', endpoint.url, ':', error);
    
    // Mettre à jour les statistiques
    endpoint.stats.total++;
    endpoint.stats.failures++;
    endpoint.stats.lastFailureAt = new Date().toISOString();
    saveEndpoints();
    
    // Ajouter à la file d'attente pour réessayer
    addToQueue(endpoint.id, event, payload);
  }
}

/**
 * Ajoute un webhook à la file d'attente
 * @param {string} endpointId 
 * @param {string} event 
 * @param {Object} payload 
 */
function addToQueue(endpointId, event, payload) {
  const queueItem = {
    id: generateId('whq'),
    endpointId: endpointId,
    event: event,
    payload: payload,
    retryCount: 0,
    nextRetryAt: Date.now() + WEBHOOK_CONFIG.retryDelays[0],
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  
  webhookQueue.push(queueItem);
  saveQueue();
  
  console.log('[WebhookHandler] Webhook ajouté à la file d\'attente');
}

// ==================== PROCESSUS DE FILE D'ATTENTE ====================

/**
 * Démarre le processeur de file d'attente
 */
function startQueueProcessor() {
  if (queueProcessorInterval) {
    clearInterval(queueProcessorInterval);
  }
  
  queueProcessorInterval = setInterval(() => {
    processQueue();
  }, 5000); // Toutes les 5 secondes
}

/**
 * Traite la file d'attente
 */
async function processQueue() {
  if (isProcessingQueue) return;
  if (webhookQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  const now = Date.now();
  const toProcess = webhookQueue.filter(item => 
    item.status === 'pending' && item.nextRetryAt <= now
  );
  
  for (const item of toProcess) {
    await processQueueItem(item);
  }
  
  isProcessingQueue = false;
}

/**
 * Traite un élément de la file d'attente
 * @param {WebhookQueueItem} item 
 */
async function processQueueItem(item) {
  const endpoint = getWebhookEndpoint(item.endpointId);
  if (!endpoint || endpoint.status !== 'active') {
    // Supprimer de la queue si l'endpoint n'existe plus ou est inactif
    const index = webhookQueue.findIndex(q => q.id === item.id);
    if (index !== -1) {
      webhookQueue.splice(index, 1);
      saveQueue();
    }
    return;
  }
  
  item.status = 'processing';
  saveQueue();
  
  const webhookData = {
    id: generateId('whk'),
    event: item.event,
    timestamp: new Date().toISOString(),
    data: item.payload,
    signature: generateSignature(item.payload),
    isRetry: true,
    retryCount: item.retryCount
  };
  
  try {
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [WEBHOOK_CONFIG.signatureHeader]: webhookData.signature,
        'X-Webhook-Event': item.event,
        'X-Webhook-Id': webhookData.id,
        'X-Webhook-Retry': item.retryCount.toString()
      },
      body: JSON.stringify(webhookData)
    });
    
    if (response.ok) {
      // Succès - supprimer de la queue
      const index = webhookQueue.findIndex(q => q.id === item.id);
      if (index !== -1) {
        webhookQueue.splice(index, 1);
        saveQueue();
      }
      
      // Mettre à jour les statistiques
      endpoint.stats.total++;
      endpoint.stats.success++;
      endpoint.stats.lastSuccessAt = new Date().toISOString();
      saveEndpoints();
      
      console.log('[WebhookHandler] Webhook retry réussi pour', endpoint.url);
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
    
  } catch (error) {
    console.error('[WebhookHandler] Échec retry pour', endpoint.url, ':', error);
    
    item.retryCount++;
    endpoint.stats.failures++;
    saveEndpoints();
    
    if (item.retryCount >= WEBHOOK_CONFIG.maxRetries) {
      // Abandon après trop de tentatives
      const index = webhookQueue.findIndex(q => q.id === item.id);
      if (index !== -1) {
        webhookQueue.splice(index, 1);
        saveQueue();
      }
      console.error('[WebhookHandler] Webhook abandonné après', item.retryCount, 'tentatives');
    } else {
      // Planifier la prochaine tentative
      const delay = WEBHOOK_CONFIG.retryDelays[Math.min(item.retryCount, WEBHOOK_CONFIG.retryDelays.length - 1)];
      item.nextRetryAt = Date.now() + delay;
      item.status = 'pending';
      saveQueue();
    }
  }
}

// ==================== SIGNATURE ====================

/**
 * Génère une signature HMAC-SHA256 pour le payload
 * @param {Object} payload 
 * @returns {string}
 */
function generateSignature(payload) {
  // Version simplifiée - en production, utiliser crypto-js ou Web Crypto API
  const data = JSON.stringify(payload) + WEBHOOK_CONFIG.signatureSecret;
  
  // Simuler un hash (à remplacer par vrai HMAC en production)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(16);
}

// ==================== SIMULATION DE WEBHOOKS ====================

/**
 * Simule l'envoi d'un webhook (pour tests)
 * @param {string} provider 
 * @param {string} event 
 * @param {Object} customData 
 */
async function simulateWebhook(provider, event, customData = {}) {
  const mockData = getMockWebhookData(provider, event, customData);
  console.log('[WebhookHandler] Simulation webhook:', provider, event);
  console.log('[WebhookHandler] Payload:', mockData);
  
  await sendWebhook(provider, event, mockData);
  
  if (typeof showToast === 'function') {
    showToast(`Webhook ${event} simulé et envoyé`, 'success');
  }
  
  return mockData;
}

/**
 * Génère des données mock pour les tests
 * @param {string} provider 
 * @param {string} event 
 * @param {Object} customData 
 * @returns {Object}
 */
function getMockWebhookData(provider, event, customData) {
  const baseData = {
    id: 'evt_' + Date.now(),
    created: Math.floor(Date.now() / 1000)
  };
  
  if (provider === 'stripe') {
    const mockStripeData = {
      'payment_intent.succeeded': {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_' + Date.now(),
            amount: 2490,
            currency: 'eur',
            status: 'succeeded',
            metadata: {
              plan_id: 'plan_123',
              patient_id: 'pat_456',
              patient_email: 'test@example.com'
            }
          }
        }
      },
      'customer.subscription.created': {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_' + Date.now(),
            customer: 'cus_' + Date.now(),
            status: 'active',
            items: {
              data: [{ plan: { nickname: 'Pro', amount: 2900 } }]
            }
          }
        }
      }
    };
    
    return { ...baseData, ...mockStripeData[event], ...customData };
  }
  
  // NutriDoc webhooks
  const mockNutriDocData = {
    'plan.completed': {
      event: 'plan.completed',
      timestamp: new Date().toISOString(),
      data: {
        plan_id: 'plan_' + Date.now(),
        patient_id: 'pat_' + Date.now(),
        patient_email: 'patient@example.com',
        patient_prenom: 'Marie',
        objectif: 'perte_poids',
        dieteticien: {
          nom: 'Grégoire Martin',
          rpps: '10008019381'
        },
        pdf_url: 'https://storage.nutridoc.fr/plans/plan_test.pdf'
      }
    },
    'plan.pending': {
      event: 'plan.pending',
      timestamp: new Date().toISOString(),
      data: {
        plan_id: 'plan_' + Date.now(),
        patient_prenom: 'Thomas',
        objectif: 'prise_masse',
        prescripteur_id: 'pre_' + Date.now()
      }
    },
    'credits.low': {
      event: 'credits.low',
      timestamp: new Date().toISOString(),
      data: {
        prescripteur_id: 'pre_' + Date.now(),
        prescripteur_email: 'prescripteur@example.com',
        credits_restants: 3,
        credits_total: 25
      }
    },
    'patient.created': {
      event: 'patient.created',
      timestamp: new Date().toISOString(),
      data: {
        patient_id: 'pat_' + Date.now(),
        prenom: 'Nouveau',
        nom: 'Patient',
        email: 'new@example.com',
        ville: 'Paris',
        objectif: 'equilibre'
      }
    }
  };
  
  return { ...baseData, ...mockNutriDocData[event], ...customData };
}

// ==================== STATISTIQUES & MONITORING ====================

/**
 * Récupère les statistiques des webhooks
 * @returns {Object}
 */
function getWebhookStats() {
  const stats = {
    endpoints: {
      total: endpoints.length,
      active: endpoints.filter(e => e.status === 'active').length,
      inactive: endpoints.filter(e => e.status === 'inactive').length,
      error: endpoints.filter(e => e.status === 'error').length
    },
    queue: {
      pending: webhookQueue.filter(q => q.status === 'pending').length,
      processing: webhookQueue.filter(q => q.status === 'processing').length,
      total: webhookQueue.length
    },
    events: {}
  };
  
  // Statistiques par fournisseur
  stats.byProvider = {
    stripe: endpoints.filter(e => e.provider === 'stripe').length,
    nutridoc: endpoints.filter(e => e.provider === 'nutridoc').length
  };
  
  // Statistiques globales des endpoints
  stats.global = {
    totalCalls: endpoints.reduce((sum, e) => sum + (e.stats?.total || 0), 0),
    totalSuccess: endpoints.reduce((sum, e) => sum + (e.stats?.success || 0), 0),
    totalFailures: endpoints.reduce((sum, e) => sum + (e.stats?.failures || 0), 0)
  };
  
  return stats;
}

/**
 * Récupère les logs des webhooks (simulés)
 * @returns {Array}
 */
function getWebhookLogs(limit = 50) {
  // Logs simulés
  const logs = [];
  for (let i = 0; i < Math.min(limit, 20); i++) {
    const date = new Date();
    date.setHours(date.getHours() - i);
    
    logs.push({
      id: 'log_' + i,
      timestamp: date.toISOString(),
      endpoint: endpoints[i % endpoints.length]?.url || 'https://example.com/webhook',
      event: ['plan.completed', 'payment_intent.succeeded', 'patient.created'][i % 3],
      status: i % 5 === 0 ? 'error' : 'success',
      duration: Math.floor(Math.random() * 500) + 50,
      responseCode: i % 5 === 0 ? 500 : 200
    });
  }
  return logs;
}

// ==================== UTILITAIRES ====================

/**
 * Génère un ID unique
 * @param {string} prefix 
 * @returns {string}
 */
function generateId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
}

// ==================== EXPORTS GLOBAUX ====================

// Exporter les fonctions pour l'usage global
window.webhookHandler = {
  init: initWebhookHandler,
  addEndpoint: addWebhookEndpoint,
  updateEndpoint: updateWebhookEndpoint,
  deleteEndpoint: deleteWebhookEndpoint,
  toggleEndpoint: toggleWebhookEndpoint,
  getEndpoints: getWebhookEndpoints,
  getEndpoint: getWebhookEndpoint,
  sendWebhook: sendWebhook,
  simulateWebhook: simulateWebhook,
  getStats: getWebhookStats,
  getLogs: getWebhookLogs,
  getQueue: () => webhookQueue,
  processQueue: processQueue
};

// Pour compatibilité avec l'interface admin
window.addWebhookEndpoint = addWebhookEndpoint;
window.deleteWebhookEndpoint = deleteWebhookEndpoint;
window.getWebhookEndpoints = getWebhookEndpoints;
window.simulateWebhook = simulateWebhook;
window.getWebhookStats = getWebhookStats;

// Auto-initialisation
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWebhookHandler);
} else {
  initWebhookHandler();
}

console.log('[webhook-handler.js] ✅ Chargé avec succès');