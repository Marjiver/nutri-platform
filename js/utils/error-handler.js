/**
 * error-handler.js — NutriDoc · Gestion centralisée des erreurs
 * 
 * Version: 1.0.0
 * 
 * Fonctionnalités :
 * - Affichage de toasts (notifications temporaires)
 * - Gestion des erreurs API
 * - Capture des erreurs non gérées
 * - Logging structuré
 * - Messages d'erreur localisés
 */

// ==================== CONFIGURATION ====================

const ERROR_CONFIG = {
  // Durée d'affichage des toasts (ms)
  toastDuration: {
    success: 3000,
    error: 5000,
    warning: 4000,
    info: 3000
  },
  
  // Types de toasts
  toastTypes: ['success', 'error', 'warning', 'info'],
  
  // Styles des toasts
  toastStyles: {
    success: { bg: '#22c55e', icon: '✓', iconBg: '#16a34a' },
    error: { bg: '#ef4444', icon: '✗', iconBg: '#dc2626' },
    warning: { bg: '#f59e0b', icon: '⚠', iconBg: '#d97706' },
    info: { bg: '#3b82f6', icon: 'ℹ', iconBg: '#2563eb' }
  },
  
  // Activation du logging en console
  enableConsoleLogging: true,
  
  // Activation de l'envoi des erreurs au serveur (désactivé en démo)
  enableRemoteLogging: false,
  
  // URL pour l'envoi des erreurs (à configurer)
  remoteLoggingUrl: '/api/log-error'
};

// ==================== FONCTIONS PRINCIPALES ====================

/**
 * Affiche une notification toast
 * @param {string} message - Le message à afficher
 * @param {string} type - Type de toast ('success', 'error', 'warning', 'info')
 * @param {number} duration - Durée d'affichage personnalisée (optionnel)
 */
function showToast(message, type = 'success', duration = null) {
  if (!message) return;
  
  // Validation du type
  if (!ERROR_CONFIG.toastTypes.includes(type)) {
    type = 'info';
  }
  
  const style = ERROR_CONFIG.toastStyles[type];
  const toastDuration = duration || ERROR_CONFIG.toastDuration[type];
  
  // Création de l'élément toast
  const toast = document.createElement('div');
  toast.className = 'nutridoc-toast';
  toast.setAttribute('data-type', type);
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 12px;
    background: ${style.bg};
    color: white;
    padding: 12px 20px;
    border-radius: 12px;
    font-size: 0.875rem;
    font-family: 'Outfit', system-ui, sans-serif;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    transform: translateX(400px);
    transition: transform 0.3s ease;
    cursor: pointer;
    max-width: 400px;
    min-width: 280px;
  `;
  
  toast.innerHTML = `
    <div style="
      width: 24px;
      height: 24px;
      background: ${style.iconBg};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 14px;
    ">${style.icon}</div>
    <div style="flex: 1; line-height: 1.4;">${message}</div>
    <button style="
      background: none;
      border: none;
      color: rgba(255,255,255,0.7);
      cursor: pointer;
      font-size: 16px;
      padding: 0 4px;
    " onclick="this.parentElement.remove()">×</button>
  `;
  
  // Ajout au DOM
  document.body.appendChild(toast);
  
  // Animation d'entrée
  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
  }, 10);
  
  // Auto-suppression
  setTimeout(() => {
    if (toast && toast.parentElement) {
      toast.style.transform = 'translateX(400px)';
      setTimeout(() => {
        if (toast && toast.parentElement) toast.remove();
      }, 300);
    }
  }, toastDuration);
  
  // Fermeture au clic
  toast.addEventListener('click', (e) => {
    if (e.target !== toast.querySelector('button')) {
      toast.style.transform = 'translateX(400px)';
      setTimeout(() => toast.remove(), 300);
    }
  });
  
  return toast;
}

/**
 * Gère une erreur API de manière centralisée
 * @param {Error|Object} error - L'erreur à gérer
 * @param {string} context - Contexte de l'erreur (ex: 'inscription', 'paiement')
 * @param {Object} options - Options supplémentaires
 * @returns {string} Message d'erreur affiché
 */
function handleApiError(error, context = 'general', options = {}) {
  const { showUserMessage = true, logToConsole = true, rethrow = false } = options;
  
  // Extraction du message d'erreur
  let errorMessage = 'Une erreur est survenue. Veuillez réessayer.';
  let errorCode = null;
  let errorDetails = null;
  
  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error instanceof Error) {
    errorMessage = error.message;
    errorDetails = error.stack;
  } else if (error && error.message) {
    errorMessage = error.message;
    errorCode = error.code;
  } else if (error && error.error) {
    errorMessage = error.error;
  }
  
  // Personnalisation du message selon le contexte
  const contextualMessage = getContextualErrorMessage(errorMessage, context, errorCode);
  
  // Log en console
  if (logToConsole && ERROR_CONFIG.enableConsoleLogging) {
    console.group(`[Erreur] ${context.toUpperCase()}`);
    console.error('Message:', errorMessage);
    if (errorCode) console.error('Code:', errorCode);
    if (errorDetails) console.error('Stack:', errorDetails);
    console.groupEnd();
  }
  
  // Envoi au serveur (optionnel)
  if (ERROR_CONFIG.enableRemoteLogging) {
    sendErrorToServer(error, context).catch(e => console.warn('[Log] Échec envoi erreur:', e));
  }
  
  // Affichage à l'utilisateur
  if (showUserMessage) {
    showToast(contextualMessage, 'error');
  }
  
  // Re-lancer l'erreur si demandé
  if (rethrow) {
    throw new Error(contextualMessage);
  }
  
  return contextualMessage;
}

/**
 * Retourne un message d'erreur contextualisé
 * @param {string} originalMessage - Message original
 * @param {string} context - Contexte
 * @param {string} errorCode - Code d'erreur
 * @returns {string} Message personnalisé
 */
function getContextualErrorMessage(originalMessage, context, errorCode) {
  // Messages par contexte
  const contextMessages = {
    inscription: {
      default: 'Erreur lors de l\'inscription. Vérifiez vos informations.',
      email_exists: 'Cet email est déjà utilisé.',
      invalid_email: 'Email invalide.',
      weak_password: 'Le mot de passe est trop faible.',
      rpps_invalid: 'Numéro RPPS invalide (11 chiffres requis).',
      siret_invalid: 'Numéro SIRET invalide (14 chiffres requis).'
    },
    connexion: {
      default: 'Email ou mot de passe incorrect.',
      invalid_credentials: 'Email ou mot de passe incorrect.',
      user_not_found: 'Aucun compte associé à cet email.'
    },
    paiement: {
      default: 'Erreur lors du paiement. Vérifiez vos coordonnées bancaires.',
      card_declined: 'Carte refusée. Vérifiez vos informations.',
      insufficient_funds: 'Fonds insuffisants.',
      expired_card: 'Carte expirée.'
    },
    plan: {
      default: 'Erreur lors de la génération du plan.',
      not_found: 'Plan introuvable.',
      already_validated: 'Ce plan a déjà été validé.'
    },
    network: {
      default: 'Problème de connexion. Vérifiez votre réseau.',
      timeout: 'Délai d\'attente dépassé. Réessayez.'
    },
    general: {
      default: 'Une erreur est survenue. Réessayez plus tard.'
    }
  };
  
  // Recherche par code d'erreur
  const ctx = contextMessages[context] || contextMessages.general;
  
  if (errorCode && ctx[errorCode]) {
    return ctx[errorCode];
  }
  
  // Recherche par mot-clé dans le message original
  const lowerMsg = originalMessage.toLowerCase();
  if (lowerMsg.includes('email') && lowerMsg.includes('existe')) return ctx.email_exists || ctx.default;
  if (lowerMsg.includes('rpps')) return ctx.rpps_invalid || ctx.default;
  if (lowerMsg.includes('siret')) return ctx.siret_invalid || ctx.default;
  if (lowerMsg.includes('mot de passe') || lowerMsg.includes('password')) return ctx.weak_password || ctx.default;
  if (lowerMsg.includes('carte') || lowerMsg.includes('card')) return ctx.card_declined || ctx.default;
  if (lowerMsg.includes('network') || lowerMsg.includes('connexion')) return ctx.default;
  
  return ctx.default;
}

/**
 * Envoie une erreur au serveur pour logging
 * @param {Error} error - L'erreur
 * @param {string} context - Contexte
 */
async function sendErrorToServer(error, context) {
  if (!ERROR_CONFIG.enableRemoteLogging) return;
  
  try {
    const errorData = {
      message: error.message || String(error),
      stack: error.stack,
      context: context,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      userId: getCurrentUserId()
    };
    
    await fetch(ERROR_CONFIG.remoteLoggingUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorData)
    });
  } catch (e) {
    console.warn('[ErrorHandler] Impossible d\'envoyer l\'erreur au serveur:', e);
  }
}

/**
 * Récupère l'ID de l'utilisateur courant
 * @returns {string|null}
 */
function getCurrentUserId() {
  try {
    const bilan = JSON.parse(localStorage.getItem('nutridoc_bilan') || '{}');
    if (bilan.id) return bilan.id;
    const diet = JSON.parse(localStorage.getItem('nutridoc_dieteticien') || '{}');
    if (diet.id) return diet.id;
    const presc = JSON.parse(localStorage.getItem('nutridoc_prescripteur') || '{}');
    if (presc.id) return presc.id;
  } catch (e) {
    return null;
  }
  return null;
}

/**
 * Capture les erreurs non gérées (window.onerror)
 * @param {string} message - Message d'erreur
 * @param {string} source - Fichier source
 * @param {number} lineno - Ligne
 * @param {number} colno - Colonne
 * @param {Error} error - Objet erreur
 */
function captureUnhandledError(message, source, lineno, colno, error) {
  if (!ERROR_CONFIG.enableConsoleLogging) return;
  
  console.error('[Unhandled Error]', {
    message, source, lineno, colno,
    error: error ? error.stack : null
  });
  
  // En mode production, on peut afficher un toast discret
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    showToast('Une erreur technique est survenue. Rafraîchissez la page.', 'warning', 4000);
  }
}

/**
 * Capture les promesses rejetées non gérées
 * @param {PromiseRejectionEvent} event
 */
function captureUnhandledRejection(event) {
  if (!ERROR_CONFIG.enableConsoleLogging) return;
  
  console.error('[Unhandled Rejection]', event.reason);
}

/**
 * Valide les données d'un formulaire avec gestion d'erreur
 * @param {Object} data - Données à valider
 * @param {Object} rules - Règles de validation
 * @returns {Object} { isValid, errors }
 */
function validateWithErrors(data, rules) {
  const errors = [];
  
  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field];
    
    if (rule.required && (!value || String(value).trim() === '')) {
      errors.push(rule.requiredMessage || `Le champ ${field} est requis.`);
      continue;
    }
    
    if (value && rule.pattern && !rule.pattern.test(String(value))) {
      errors.push(rule.patternMessage || `Le champ ${field} est invalide.`);
    }
    
    if (value && rule.minLength && String(value).length < rule.minLength) {
      errors.push(rule.minLengthMessage || `Le champ ${field} doit contenir au moins ${rule.minLength} caractères.`);
    }
    
    if (value && rule.maxLength && String(value).length > rule.maxLength) {
      errors.push(rule.maxLengthMessage || `Le champ ${field} ne peut pas dépasser ${rule.maxLength} caractères.`);
    }
    
    if (value && rule.custom && !rule.custom(value)) {
      errors.push(rule.customMessage || `Le champ ${field} est invalide.`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Affiche un message de chargement global
 * @param {boolean} show - Afficher ou masquer
 * @param {string} message - Message personnalisé
 */
function showGlobalLoading(show, message = 'Chargement...') {
  let loader = document.getElementById('global-loader');
  
  if (show) {
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'global-loader';
      loader.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(13, 32, 24, 0.7);
        backdrop-filter: blur(4px);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 16px;
      `;
      loader.innerHTML = `
        <div style="
          width: 48px;
          height: 48px;
          border: 3px solid rgba(29, 158, 117, 0.3);
          border-top-color: #1D9E75;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        "></div>
        <div style="color: white; font-size: 0.875rem;">${message}</div>
        <style>
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
      `;
      document.body.appendChild(loader);
    } else {
      const msgEl = loader.querySelector('div:last-child');
      if (msgEl) msgEl.textContent = message;
      loader.style.display = 'flex';
    }
  } else {
    if (loader) {
      loader.style.display = 'none';
    }
  }
}

/**
 * Wrapper pour les appels fetch avec gestion d'erreur automatique
 * @param {string} url - URL de l'appel
 * @param {Object} options - Options fetch
 * @param {string} context - Contexte pour l'erreur
 * @returns {Promise<Object>} Réponse JSON
 */
async function safeFetch(url, options = {}, context = 'api') {
  showGlobalLoading(true, 'Chargement...');
  
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || data.error || `Erreur HTTP ${response.status}`);
    }
    
    showGlobalLoading(false);
    return { success: true, data };
    
  } catch (error) {
    showGlobalLoading(false);
    const errorMessage = handleApiError(error, context, { showUserMessage: true });
    return { success: false, error: errorMessage };
  }
}

// ==================== INITIALISATION ====================

/**
 * Initialise le gestionnaire d'erreurs
 */
function initErrorHandler() {
  // Capture des erreurs non gérées
  window.addEventListener('error', captureUnhandledError);
  window.addEventListener('unhandledrejection', captureUnhandledRejection);
  
  console.log('[ErrorHandler] Initialisé avec succès');
}

// Auto-initialisation si le DOM est prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initErrorHandler);
} else {
  initErrorHandler();
}

// ==================== EXPORTS GLOBAUX ====================
window.showToast = showToast;
window.handleApiError = handleApiError;
window.validateWithErrors = validateWithErrors;
window.showGlobalLoading = showGlobalLoading;
window.safeFetch = safeFetch;
window.ERROR_CONFIG = ERROR_CONFIG;

console.log('[error-handler.js] ✅ Chargé avec succès');