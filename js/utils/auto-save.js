/**
 * auto-save.js — NutriDoc · Sauvegarde automatique des formulaires
 * 
 * Fonctionnalités :
 * - Sauvegarde automatique des formulaires toutes les X secondes
 * - Restauration automatique au chargement
 * - Indicateur visuel de sauvegarde
 * - Gestion multi-formulaires
 * - Détection des modifications
 * - Export/import des brouillons
 * 
 * Version: 1.0.0
 */

// ==================== CONFIGURATION ====================

const AUTO_SAVE_CONFIG = {
  // Intervalle de sauvegarde (millisecondes)
  interval: 30000, // 30 secondes
  
  // Délai après dernier changement (millisecondes)
  debounceDelay: 2000, // 2 secondes
  
  // Préfixe pour les clés localStorage
  storagePrefix: 'nutridoc_auto_save_',
  
  // Durée de conservation des brouillons (jours)
  draftExpiryDays: 7,
  
  // Activer les logs
  debugMode: false,
  
  // Formulaires à surveiller (sélecteurs CSS)
  formSelectors: [
    '#bilanForm',
    '#inscriptionForm',
    '#inscriptionPrescForm',
    '#prescDemandeForm',
    '#editeurForm',
    '#profilForm'
  ],
  
  // Champs à exclure (mots-clés)
  excludeFields: ['password', 'passwordConfirm', 'cgu', 'rcpCheckbox']
};

// ==================== CLASSE PRINCIPALE ====================

class AutoSaveManager {
  constructor() {
    this.forms = new Map();
    this.saveTimers = new Map();
    this.debounceTimers = new Map();
    this.originalData = new Map();
    this.isRestoring = false;
    this.initialized = false;
  }
  
  /**
   * Initialise la sauvegarde automatique pour tous les formulaires
   */
  init() {
    if (this.initialized) return;
    
    this.log('Initialisation de la sauvegarde automatique...');
    
    // Détecter tous les formulaires
    const forms = document.querySelectorAll(AUTO_SAVE_CONFIG.formSelectors.join(','));
    
    for (const form of forms) {
      this.registerForm(form);
    }
    
    // Observer l'apparition de nouveaux formulaires (SPA)
    this.observeNewForms();
    
    this.initialized = true;
    this.log(`✅ ${this.forms.size} formulaire(s) surveillé(s)`);
  }
  
  /**
   * Enregistre un formulaire pour la sauvegarde automatique
   */
  registerForm(form) {
    if (!form || this.forms.has(form)) return;
    
    const formId = this.getFormId(form);
    this.log(`📝 Enregistrement du formulaire: ${formId}`);
    
    // Stocker les données originales
    this.originalData.set(form, this.getFormData(form));
    
    // Écouter les changements
    const handler = this.debounce(() => this.onFormChange(form), AUTO_SAVE_CONFIG.debounceDelay);
    form.addEventListener('input', handler);
    form.addEventListener('change', handler);
    
    // Sauvegarde périodique
    const timer = setInterval(() => this.saveForm(form), AUTO_SAVE_CONFIG.interval);
    this.saveTimers.set(form, timer);
    
    // Restaurer les données sauvegardées
    this.restoreForm(form);
    
    // Ajouter l'indicateur visuel
    this.addSaveIndicator(form);
    
    this.forms.set(form, { formId, handler, lastSave: null });
  }
  
  /**
   * Désenregistre un formulaire
   */
  unregisterForm(form) {
    if (!this.forms.has(form)) return;
    
    const { handler, timer } = this.forms.get(form);
    
    if (handler) form.removeEventListener('input', handler);
    if (timer) clearInterval(timer);
    if (this.debounceTimers.has(form)) clearTimeout(this.debounceTimers.get(form));
    
    this.forms.delete(form);
    this.originalData.delete(form);
    
    this.log(`🗑️ Formulaire désenregistré: ${this.getFormId(form)}`);
  }
  
  /**
   * Sauvegarde un formulaire
   */
  saveForm(form, immediate = false) {
    if (this.isRestoring) return;
    
    const formId = this.getFormId(form);
    const formData = this.getFormData(form);
    
    // Vérifier si des modifications ont eu lieu
    const original = this.originalData.get(form);
    if (original && this.isEqual(original, formData) && !immediate) {
      return;
    }
    
    // Mettre à jour les données originales
    this.originalData.set(form, formData);
    
    // Sauvegarder
    const draft = {
      data: formData,
      timestamp: Date.now(),
      url: window.location.href,
      formId: formId
    };
    
    try {
      localStorage.setItem(AUTO_SAVE_CONFIG.storagePrefix + formId, JSON.stringify(draft));
      this.updateSaveIndicator(form, 'saved');
      this.log(`💾 Sauvegarde auto: ${formId}`, formData);
    } catch (error) {
      console.error('[AutoSave] Erreur sauvegarde:', error);
      this.updateSaveIndicator(form, 'error');
    }
  }
  
  /**
   * Restaure un formulaire à partir du brouillon sauvegardé
   */
  restoreForm(form) {
    const formId = this.getFormId(form);
    const stored = localStorage.getItem(AUTO_SAVE_CONFIG.storagePrefix + formId);
    
    if (!stored) return;
    
    try {
      const draft = JSON.parse(stored);
      
      // Vérifier si le brouillon n'est pas expiré
      const age = Date.now() - draft.timestamp;
      const maxAge = AUTO_SAVE_CONFIG.draftExpiryDays * 24 * 60 * 60 * 1000;
      
      if (age > maxAge) {
        this.clearDraft(form);
        this.log(`🗑️ Brouillon expiré supprimé: ${formId}`);
        return;
      }
      
      // Vérifier si on est sur la même page
      if (draft.url !== window.location.href) {
        return;
      }
      
      // Proposer la restauration à l'utilisateur
      this.promptRestore(form, draft);
      
    } catch (error) {
      console.error('[AutoSave] Erreur restauration:', error);
    }
  }
  
  /**
   * Demande à l'utilisateur s'il veut restaurer le brouillon
   */
  promptRestore(form, draft) {
    const ageMinutes = Math.round((Date.now() - draft.timestamp) / 60000);
    const ageText = ageMinutes < 1 ? 'quelques secondes' : 
                    ageMinutes < 60 ? `${ageMinutes} minutes` :
                    `${Math.round(ageMinutes / 60)} heures`;
    
    const message = `📝 Un brouillon non sauvegardé datant de ${ageText} a été trouvé.\n\nVoulez-vous le restaurer ?`;
    
    if (confirm(message)) {
      this.isRestoring = true;
      this.populateForm(form, draft.data);
      this.isRestoring = false;
      
      // Sauvegarder immédiatement après restauration
      this.saveForm(form, true);
      
      this.showToast('Brouillon restauré avec succès', 'success');
      this.log(`🔄 Brouillon restauré: ${this.getFormId(form)}`);
    } else {
      this.clearDraft(form);
    }
  }
  
  /**
   * Remplit un formulaire avec des données
   */
  populateForm(form, data) {
    for (const [name, value] of Object.entries(data)) {
      const field = form.querySelector(`[name="${name}"]`);
      if (!field) continue;
      
      // Exclure les champs de mot de passe
      if (AUTO_SAVE_CONFIG.excludeFields.some(ex => name.toLowerCase().includes(ex))) {
        continue;
      }
      
      if (field.type === 'checkbox' || field.type === 'radio') {
        const checkbox = form.querySelector(`[name="${name}"][value="${value}"]`);
        if (checkbox) checkbox.checked = true;
      } else if (field.tagName === 'SELECT') {
        field.value = value;
      } else {
        field.value = value;
      }
      
      // Déclencher un événement change pour les validateurs
      field.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
  
  /**
   * Récupère les données d'un formulaire
   */
  getFormData(form) {
    const formData = new FormData(form);
    const data = {};
    
    for (const [key, value] of formData.entries()) {
      // Ignorer les champs exclus
      if (AUTO_SAVE_CONFIG.excludeFields.some(ex => key.toLowerCase().includes(ex))) {
        continue;
      }
      data[key] = value;
    }
    
    return data;
  }
  
  /**
   * Supprime le brouillon d'un formulaire
   */
  clearDraft(form) {
    const formId = this.getFormId(form);
    localStorage.removeItem(AUTO_SAVE_CONFIG.storagePrefix + formId);
    this.log(`🗑️ Brouillon supprimé: ${formId}`);
  }
  
  /**
   * Supprime tous les brouillons
   */
  clearAllDrafts() {
    const keys = Object.keys(localStorage);
    let count = 0;
    
    for (const key of keys) {
      if (key.startsWith(AUTO_SAVE_CONFIG.storagePrefix)) {
        localStorage.removeItem(key);
        count++;
      }
    }
    
    this.log(`🗑️ ${count} brouillon(s) supprimé(s)`);
    this.showToast(`${count} brouillon(s) supprimé(s)`, 'info');
  }
  
  /**
   * Exporte tous les brouillons
   */
  exportDrafts() {
    const drafts = {};
    const keys = Object.keys(localStorage);
    
    for (const key of keys) {
      if (key.startsWith(AUTO_SAVE_CONFIG.storagePrefix)) {
        try {
          drafts[key] = JSON.parse(localStorage.getItem(key));
        } catch (e) {
          drafts[key] = localStorage.getItem(key);
        }
      }
    }
    
    const dataStr = JSON.stringify(drafts, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nutridoc_drafts_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    this.showToast('Brouillons exportés', 'success');
  }
  
  /**
   * Importe des brouillons
   */
  importDrafts(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const drafts = JSON.parse(e.target.result);
        let count = 0;
        
        for (const [key, value] of Object.entries(drafts)) {
          if (key.startsWith(AUTO_SAVE_CONFIG.storagePrefix)) {
            localStorage.setItem(key, JSON.stringify(value));
            count++;
          }
        }
        
        this.showToast(`${count} brouillon(s) importé(s)`, 'success');
        this.log(`📥 ${count} brouillon(s) importé(s)`);
        
        // Recharger la page pour appliquer
        if (confirm('Les brouillons ont été importés. Voulez-vous recharger la page ?')) {
          window.location.reload();
        }
      } catch (error) {
        console.error('[AutoSave] Erreur import:', error);
        this.showToast('Erreur lors de l\'import', 'error');
      }
    };
    
    reader.readAsText(file);
  }
  
  /**
   * Événement déclenché lors d'une modification
   */
  onFormChange(form) {
    this.updateSaveIndicator(form, 'typing');
    
    // Sauvegarde immédiate après le délai de debounce
    if (this.debounceTimers.has(form)) {
      clearTimeout(this.debounceTimers.get(form));
    }
    
    const timer = setTimeout(() => {
      this.saveForm(form);
      this.debounceTimers.delete(form);
    }, AUTO_SAVE_CONFIG.debounceDelay);
    
    this.debounceTimers.set(form, timer);
  }
  
  /**
   * Ajoute un indicateur visuel de sauvegarde
   */
  addSaveIndicator(form) {
    const indicator = document.createElement('div');
    indicator.className = 'auto-save-indicator';
    indicator.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 4px;
      background: #eef4ee;
      color: #6b7b74;
      transition: all 0.2s;
      pointer-events: none;
      opacity: 0;
    `;
    indicator.innerHTML = '💾 Sauvegarde...';
    
    // S'assurer que le formulaire a une position relative
    if (getComputedStyle(form).position === 'static') {
      form.style.position = 'relative';
    }
    
    form.appendChild(indicator);
    form._saveIndicator = indicator;
  }
  
  /**
   * Met à jour l'indicateur de sauvegarde
   */
  updateSaveIndicator(form, status) {
    const indicator = form._saveIndicator;
    if (!indicator) return;
    
    indicator.style.opacity = '1';
    
    switch (status) {
      case 'typing':
        indicator.style.background = '#fef3c7';
        indicator.style.color = '#d97706';
        indicator.innerHTML = '✏️ Modification...';
        break;
      case 'saved':
        indicator.style.background = '#dcfce7';
        indicator.style.color = '#16a34a';
        indicator.innerHTML = '✓ Sauvegardé';
        setTimeout(() => {
          indicator.style.opacity = '0';
        }, 1500);
        break;
      case 'error':
        indicator.style.background = '#fee2e2';
        indicator.style.color = '#dc2626';
        indicator.innerHTML = '❌ Erreur';
        setTimeout(() => {
          indicator.style.opacity = '0';
        }, 2000);
        break;
    }
  }
  
  /**
   * Retourne un identifiant unique pour un formulaire
   */
  getFormId(form) {
    return form.id || `form_${Array.from(this.forms.keys()).indexOf(form)}`;
  }
  
  /**
   * Compare deux objets
   */
  isEqual(obj1, obj2) {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  }
  
  /**
   * Debounce une fonction
   */
  debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }
  
  /**
   * Observe l'apparition de nouveaux formulaires
   */
  observeNewForms() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) { // Element
            const forms = node.querySelectorAll ? node.querySelectorAll('form') : [];
            for (const form of forms) {
              if (!this.forms.has(form)) {
                this.registerForm(form);
              }
            }
          }
        }
      }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
  }
  
  /**
   * Affiche un message dans la console (mode debug)
   */
  log(...args) {
    if (AUTO_SAVE_CONFIG.debugMode) {
      console.log('[AutoSave]', ...args);
    }
  }
  
  /**
   * Affiche une notification toast
   */
  showToast(message, type = 'success') {
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
    } else {
      // Fallback
      alert(message);
    }
  }
}

// ==================== INSTANCE GLOBALE ====================

const autoSaveManager = new AutoSaveManager();

// ==================== FONCTIONS D'INTERFACE ====================

/**
 * Initialise la sauvegarde automatique
 */
function initAutoSave() {
  autoSaveManager.init();
}

/**
 * Sauvegarde manuelle d'un formulaire
 */
function manualSave(formId) {
  const form = document.getElementById(formId);
  if (form) {
    autoSaveManager.saveForm(form, true);
    autoSaveManager.showToast('Formulaire sauvegardé', 'success');
  }
}

/**
 * Restaure le dernier brouillon
 */
function restoreLastDraft(formId) {
  const form = document.getElementById(formId);
  if (form) {
    autoSaveManager.restoreForm(form);
  }
}

/**
 * Supprime le brouillon courant
 */
function clearCurrentDraft(formId) {
  const form = document.getElementById(formId);
  if (form && confirm('Supprimer ce brouillon ?')) {
    autoSaveManager.clearDraft(form);
    autoSaveManager.showToast('Brouillon supprimé', 'info');
  }
}

/**
 * Supprime tous les brouillons
 */
function clearAllDrafts() {
  if (confirm('⚠️ Supprimer TOUS les brouillons ? Cette action est irréversible.')) {
    autoSaveManager.clearAllDrafts();
  }
}

/**
 * Exporte tous les brouillons
 */
function exportAllDrafts() {
  autoSaveManager.exportDrafts();
}

/**
 * Importe des brouillons
 */
function importDrafts() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    if (e.target.files[0]) {
      autoSaveManager.importDrafts(e.target.files[0]);
    }
  };
  input.click();
}

// ==================== INITIALISATION ====================

// Démarrer au chargement de la page
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAutoSave);
} else {
  initAutoSave();
}

// Sauvegarde avant de quitter la page
window.addEventListener('beforeunload', () => {
  for (const [form] of autoSaveManager.forms) {
    autoSaveManager.saveForm(form, true);
  }
});

// ==================== EXPORTS GLOBAUX ====================

window.autoSaveManager = autoSaveManager;
window.initAutoSave = initAutoSave;
window.manualSave = manualSave;
window.restoreLastDraft = restoreLastDraft;
window.clearCurrentDraft = clearCurrentDraft;
window.clearAllDrafts = clearAllDrafts;
window.exportAllDrafts = exportAllDrafts;
window.importDrafts = importDrafts;

// ==================== STYLES INTÉGRÉS ====================

const style = document.createElement('style');
style.textContent = `
  .auto-save-indicator {
    position: absolute;
    top: 10px;
    right: 10px;
    font-size: 12px;
    padding: 4px 10px;
    border-radius: 20px;
    background: #eef4ee;
    color: #6b7b74;
    transition: all 0.2s ease;
    pointer-events: none;
    z-index: 10;
    font-family: 'Outfit', system-ui, sans-serif;
    font-weight: 500;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }
  
  form {
    position: relative;
  }
  
  /* Animation d'entrée */
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .auto-save-indicator {
    animation: slideIn 0.2s ease;
  }
`;
document.head.appendChild(style);

console.log('[auto-save.js] ✅ Chargé avec succès');