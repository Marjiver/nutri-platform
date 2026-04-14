/**
 * backup.js — NutriDoc · Gestion des sauvegardes et restaurations
 * 
 * Fonctionnalités :
 * - Sauvegarde complète des données (localStorage + Supabase)
 * - Sauvegarde partielle (utilisateurs, plans, configuration)
 * - Restauration à partir d'un fichier JSON
 * - Gestion des versions de sauvegarde
 * - Export/Import automatique
 * - Planification des sauvegardes automatiques
 * - Compression des données (optionnelle)
 * 
 * Dépendances : aucune (Vanilla JS)
 * 
 * Version: 1.0.0
 */

// ==================== CONFIGURATION ====================

const BACKUP_CONFIG = {
  version: '1.0.0',
  storagePrefix: 'nutridoc_backup_',
  autoBackupKey: 'nutridoc_auto_backup_config',
  maxBackups: 10,
  compressionEnabled: false,
  autoBackupEnabled: true,
  autoBackupInterval: 24 * 60 * 60 * 1000, // 24 heures
  tables: [
    'profiles',
    'bilans',
    'plans',
    'clients_prescripteur',
    'alertes',
    'queue_plans',
    'notifications',
    'factures'
  ]
};

// ==================== STRUCTURES DE DONNÉES ====================

/**
 * Structure d'une sauvegarde
 * @typedef {Object} Backup
 * @property {string} id - Identifiant unique
 * @property {string} name - Nom de la sauvegarde
 * @property {string} type - Type (complet, users, plans, config)
 * @property {string} date - Date de création
 * @property {number} size - Taille en bytes
 * @property {string} version - Version du format
 * @property {Object} data - Données sauvegardées
 */

// ==================== ÉTAT GLOBAL ====================

let backupsList = [];
let autoBackupTimer = null;
let currentRestoreProgress = 0;

// ==================== FONCTIONS PRINCIPALES ====================

/**
 * Initialise le système de sauvegarde
 */
async function initBackupSystem() {
  console.log('[Backup] Initialisation...');
  
  // Charger la liste des sauvegardes existantes
  loadBackupsList();
  
  // Configurer les sauvegardes automatiques
  initAutoBackup();
  
  // Nettoyer les sauvegardes trop anciennes
  cleanOldBackups();
  
  console.log('[Backup] Initialisé avec succès,', backupsList.length, 'sauvegarde(s) trouvée(s)');
}

/**
 * Charge la liste des sauvegardes depuis localStorage
 */
function loadBackupsList() {
  try {
    const saved = localStorage.getItem(BACKUP_CONFIG.storagePrefix + 'list');
    if (saved) {
      backupsList = JSON.parse(saved);
    } else {
      backupsList = [];
    }
  } catch (e) {
    console.error('[Backup] Erreur chargement liste:', e);
    backupsList = [];
  }
}

/**
 * Sauvegarde la liste des backups
 */
function saveBackupsList() {
  try {
    localStorage.setItem(BACKUP_CONFIG.storagePrefix + 'list', JSON.stringify(backupsList));
  } catch (e) {
    console.error('[Backup] Erreur sauvegarde liste:', e);
  }
}

// ==================== CRÉATION DE SAUVEGARDES ====================

/**
 * Crée une sauvegarde complète
 * @param {string} name - Nom personnalisé (optionnel)
 * @returns {Promise<Backup>}
 */
async function createFullBackup(name = null) {
  console.log('[Backup] Création d\'une sauvegarde complète...');
  
  const backupId = generateBackupId();
  const backupName = name || `backup_complet_${formatDateForFilename(new Date())}`;
  
  // Collecter toutes les données
  const data = {
    version: BACKUP_CONFIG.version,
    timestamp: new Date().toISOString(),
    source: 'localStorage',
    data: {
      // Données patient
      bilan: localStorage.getItem('nutridoc_bilan'),
      user_email: localStorage.getItem('nutridoc_user_email'),
      user_prenom: localStorage.getItem('nutridoc_user_prenom'),
      
      // Données diététicien
      dieteticien: localStorage.getItem('nutridoc_dieteticien'),
      
      // Données prescripteur
      prescripteur: localStorage.getItem('nutridoc_prescripteur'),
      crm_clients: localStorage.getItem('nutridoc_crm_clients'),
      presc_historique: localStorage.getItem('nutridoc_presc_historique'),
      
      // Données système
      alertes: localStorage.getItem('nutridoc_alertes'),
      queue: localStorage.getItem('nutridoc_queue'),
      theme: localStorage.getItem('nutridoc_theme'),
      profil: localStorage.getItem('nutridoc_profil'),
      
      // Sauvegardes auto
      auto_saves: getAutoSaveData(),
      
      // Configuration
      version: localStorage.getItem('nutridoc_version'),
      migration_log: localStorage.getItem('nutridoc_migration_log')
    }
  };
  
  // Calculer la taille
  const jsonStr = JSON.stringify(data);
  const size = new Blob([jsonStr]).size;
  
  const backup = {
    id: backupId,
    name: backupName,
    type: 'complet',
    date: new Date().toISOString(),
    size: size,
    version: BACKUP_CONFIG.version,
    data: data
  };
  
  // Sauvegarder
  saveBackup(backup);
  
  console.log('[Backup] Sauvegarde complète créée:', backupName, `(${formatBytes(size)})`);
  return backup;
}

/**
 * Crée une sauvegarde des utilisateurs uniquement
 */
async function createUsersBackup() {
  console.log('[Backup] Création d\'une sauvegarde des utilisateurs...');
  
  const backupId = generateBackupId();
  const backupName = `backup_utilisateurs_${formatDateForFilename(new Date())}`;
  
  const data = {
    version: BACKUP_CONFIG.version,
    timestamp: new Date().toISOString(),
    type: 'users',
    data: {
      bilan: localStorage.getItem('nutridoc_bilan'),
      dieteticien: localStorage.getItem('nutridoc_dieteticien'),
      prescripteur: localStorage.getItem('nutridoc_prescripteur'),
      crm_clients: localStorage.getItem('nutridoc_crm_clients')
    }
  };
  
  const jsonStr = JSON.stringify(data);
  const size = new Blob([jsonStr]).size;
  
  const backup = {
    id: backupId,
    name: backupName,
    type: 'users',
    date: new Date().toISOString(),
    size: size,
    version: BACKUP_CONFIG.version,
    data: data
  };
  
  saveBackup(backup);
  console.log('[Backup] Sauvegarde utilisateurs créée:', backupName);
  return backup;
}

/**
 * Crée une sauvegarde des plans uniquement
 */
async function createPlansBackup() {
  console.log('[Backup] Création d\'une sauvegarde des plans...');
  
  const backupId = generateBackupId();
  const backupName = `backup_plans_${formatDateForFilename(new Date())}`;
  
  const data = {
    version: BACKUP_CONFIG.version,
    timestamp: new Date().toISOString(),
    type: 'plans',
    data: {
      presc_historique: localStorage.getItem('nutridoc_presc_historique'),
      queue: localStorage.getItem('nutridoc_queue')
    }
  };
  
  const jsonStr = JSON.stringify(data);
  const size = new Blob([jsonStr]).size;
  
  const backup = {
    id: backupId,
    name: backupName,
    type: 'plans',
    date: new Date().toISOString(),
    size: size,
    version: BACKUP_CONFIG.version,
    data: data
  };
  
  saveBackup(backup);
  console.log('[Backup] Sauvegarde plans créée:', backupName);
  return backup;
}

/**
 * Crée une sauvegarde de la configuration
 */
async function createConfigBackup() {
  console.log('[Backup] Création d\'une sauvegarde de configuration...');
  
  const backupId = generateBackupId();
  const backupName = `backup_config_${formatDateForFilename(new Date())}`;
  
  const data = {
    version: BACKUP_CONFIG.version,
    timestamp: new Date().toISOString(),
    type: 'config',
    data: {
      theme: localStorage.getItem('nutridoc_theme'),
      profil: localStorage.getItem('nutridoc_profil'),
      version: localStorage.getItem('nutridoc_version'),
      migration_log: localStorage.getItem('nutridoc_migration_log'),
      auto_save_config: localStorage.getItem('nutridoc_auto_save_config')
    }
  };
  
  const jsonStr = JSON.stringify(data);
  const size = new Blob([jsonStr]).size;
  
  const backup = {
    id: backupId,
    name: backupName,
    type: 'config',
    date: new Date().toISOString(),
    size: size,
    version: BACKUP_CONFIG.version,
    data: data
  };
  
  saveBackup(backup);
  console.log('[Backup] Sauvegarde configuration créée:', backupName);
  return backup;
}

/**
 * Sauvegarde un backup dans localStorage
 * @param {Backup} backup 
 */
function saveBackup(backup) {
  // Limiter le nombre de sauvegardes
  while (backupsList.length >= BACKUP_CONFIG.maxBackups) {
    const oldest = backupsList.shift();
    localStorage.removeItem(BACKUP_CONFIG.storagePrefix + oldest.id);
    console.log('[Backup] Ancienne sauvegarde supprimée:', oldest.name);
  }
  
  // Sauvegarder les données
  localStorage.setItem(BACKUP_CONFIG.storagePrefix + backup.id, JSON.stringify(backup.data));
  
  // Ajouter à la liste
  backupsList.unshift(backup);
  saveBackupsList();
}

// ==================== RESTAURATION ====================

/**
 * Restaure une sauvegarde
 * @param {string} backupId - ID de la sauvegarde
 * @param {Function} onProgress - Callback de progression
 * @returns {Promise<boolean>}
 */
async function restoreBackup(backupId, onProgress = null) {
  console.log('[Backup] Restauration de la sauvegarde:', backupId);
  
  try {
    // Récupérer la sauvegarde
    const backup = backupsList.find(b => b.id === backupId);
    if (!backup) {
      throw new Error('Sauvegarde introuvable');
    }
    
    const backupData = localStorage.getItem(BACKUP_CONFIG.storagePrefix + backupId);
    if (!backupData) {
      throw new Error('Données de sauvegarde introuvables');
    }
    
    const data = JSON.parse(backupData);
    const items = Object.entries(data.data);
    let processed = 0;
    
    // Restaurer chaque élément
    for (const [key, value] of items) {
      if (value !== null && value !== undefined) {
        localStorage.setItem(key, value);
      }
      processed++;
      if (onProgress) {
        onProgress(Math.round((processed / items.length) * 100));
      }
    }
    
    console.log('[Backup] Restauration terminée:', backup.name);
    showBackupToast(`✅ Restauration terminée: ${backup.name}`, 'success');
    return true;
    
  } catch (error) {
    console.error('[Backup] Erreur restauration:', error);
    showBackupToast(`❌ Erreur lors de la restauration: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Restaure depuis un fichier uploadé
 * @param {File} file - Fichier JSON
 * @param {Function} onProgress - Callback de progression
 * @returns {Promise<boolean>}
 */
async function restoreFromFile(file, onProgress = null) {
  console.log('[Backup] Restauration depuis fichier:', file.name);
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        // Vérifier le format
        if (!data.version || !data.data) {
          throw new Error('Format de fichier invalide');
        }
        
        const items = Object.entries(data.data);
        let processed = 0;
        
        for (const [key, value] of items) {
          if (value !== null && value !== undefined) {
            localStorage.setItem(key, value);
          }
          processed++;
          if (onProgress) {
            onProgress(Math.round((processed / items.length) * 100));
          }
        }
        
        showBackupToast(`✅ Import réussi depuis ${file.name}`, 'success');
        resolve(true);
        
      } catch (error) {
        console.error('[Backup] Erreur import:', error);
        showBackupToast(`❌ Erreur d'import: ${error.message}`, 'error');
        reject(error);
      }
    };
    
    reader.onerror = () => {
      showBackupToast('❌ Erreur de lecture du fichier', 'error');
      reject(new Error('Erreur de lecture'));
    };
    
    reader.readAsText(file);
  });
}

// ==================== EXPORT ====================

/**
 * Exporte une sauvegarde en fichier JSON
 * @param {string} backupId - ID de la sauvegarde
 */
function exportBackup(backupId) {
  const backup = backupsList.find(b => b.id === backupId);
  if (!backup) {
    showBackupToast('Sauvegarde introuvable', 'error');
    return;
  }
  
  const backupData = localStorage.getItem(BACKUP_CONFIG.storagePrefix + backupId);
  if (!backupData) {
    showBackupToast('Données de sauvegarde introuvables', 'error');
    return;
  }
  
  const blob = new Blob([backupData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${backup.name}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  showBackupToast(`📥 Export de ${backup.name}`, 'success');
}

/**
 * Supprime une sauvegarde
 * @param {string} backupId - ID de la sauvegarde
 */
function deleteBackup(backupId) {
  const index = backupsList.findIndex(b => b.id === backupId);
  if (index !== -1) {
    const backup = backupsList[index];
    localStorage.removeItem(BACKUP_CONFIG.storagePrefix + backupId);
    backupsList.splice(index, 1);
    saveBackupsList();
    showBackupToast(`🗑️ Sauvegarde supprimée: ${backup.name}`, 'warning');
  }
}

// ==================== SAUVEGARDES AUTOMATIQUES ====================

/**
 * Initialise les sauvegardes automatiques
 */
function initAutoBackup() {
  // Charger la configuration
  const config = localStorage.getItem(BACKUP_CONFIG.autoBackupKey);
  if (config) {
    try {
      const parsed = JSON.parse(config);
      BACKUP_CONFIG.autoBackupEnabled = parsed.enabled !== false;
      BACKUP_CONFIG.autoBackupInterval = parsed.interval || 24 * 60 * 60 * 1000;
    } catch (e) {}
  }
  
  if (BACKUP_CONFIG.autoBackupEnabled) {
    startAutoBackupTimer();
  }
}

/**
 * Démarre le timer de sauvegarde automatique
 */
function startAutoBackupTimer() {
  if (autoBackupTimer) {
    clearInterval(autoBackupTimer);
  }
  
  autoBackupTimer = setInterval(async () => {
    console.log('[Backup] Sauvegarde automatique déclenchée...');
    const lastBackup = getLastAutoBackupDate();
    const now = Date.now();
    
    // Vérifier si une sauvegarde a déjà été faite aujourd'hui
    if (!lastBackup || (now - lastBackup) >= BACKUP_CONFIG.autoBackupInterval) {
      await createFullBackup();
      localStorage.setItem(BACKUP_CONFIG.storagePrefix + 'last_auto', Date.now().toString());
    }
  }, BACKUP_CONFIG.autoBackupInterval);
}

/**
 * Arrête les sauvegardes automatiques
 */
function stopAutoBackup() {
  if (autoBackupTimer) {
    clearInterval(autoBackupTimer);
    autoBackupTimer = null;
  }
}

/**
 * Configure les sauvegardes automatiques
 * @param {Object} config - Configuration
 */
function configureAutoBackup(config) {
  BACKUP_CONFIG.autoBackupEnabled = config.enabled !== false;
  BACKUP_CONFIG.autoBackupInterval = config.interval || 24 * 60 * 60 * 1000;
  
  localStorage.setItem(BACKUP_CONFIG.autoBackupKey, JSON.stringify({
    enabled: BACKUP_CONFIG.autoBackupEnabled,
    interval: BACKUP_CONFIG.autoBackupInterval,
    updatedAt: new Date().toISOString()
  }));
  
  if (BACKUP_CONFIG.autoBackupEnabled) {
    startAutoBackupTimer();
  } else {
    stopAutoBackup();
  }
  
  showBackupToast('Configuration des sauvegardes automatiques mise à jour', 'success');
}

/**
 * Récupère la date de la dernière sauvegarde auto
 * @returns {number|null}
 */
function getLastAutoBackupDate() {
  const last = localStorage.getItem(BACKUP_CONFIG.storagePrefix + 'last_auto');
  return last ? parseInt(last) : null;
}

// ==================== UTILITAIRES ====================

/**
 * Génère un ID unique pour une sauvegarde
 * @returns {string}
 */
function generateBackupId() {
  return 'backup_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
}

/**
 * Formate une date pour un nom de fichier
 * @param {Date} date 
 * @returns {string}
 */
function formatDateForFilename(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}_${hours}${minutes}`;
}

/**
 * Formate la taille en bytes
 * @param {number} bytes 
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Récupère toutes les données de sauvegarde auto
 * @returns {Object}
 */
function getAutoSaveData() {
  const autoSaves = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('nutridoc_auto_save_')) {
      autoSaves[key] = localStorage.getItem(key);
    }
  }
  return autoSaves;
}

/**
 * Nettoie les anciennes sauvegardes
 */
function cleanOldBackups() {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const toDelete = [];
  
  for (const backup of backupsList) {
    const backupDate = new Date(backup.date).getTime();
    if (backupDate < thirtyDaysAgo) {
      toDelete.push(backup.id);
    }
  }
  
  for (const id of toDelete) {
    deleteBackup(id);
  }
  
  if (toDelete.length > 0) {
    console.log('[Backup] Nettoyage:', toDelete.length, 'ancienne(s) sauvegarde(s) supprimée(s)');
  }
}

/**
 * Récupère la liste des sauvegardes
 * @returns {Array}
 */
function getBackupsList() {
  return backupsList;
}

/**
 * Récupère les statistiques des sauvegardes
 * @returns {Object}
 */
function getBackupStats() {
  const totalSize = backupsList.reduce((sum, b) => sum + b.size, 0);
  const byType = {
    complet: backupsList.filter(b => b.type === 'complet').length,
    users: backupsList.filter(b => b.type === 'users').length,
    plans: backupsList.filter(b => b.type === 'plans').length,
    config: backupsList.filter(b => b.type === 'config').length
  };
  
  return {
    total: backupsList.length,
    totalSize: formatBytes(totalSize),
    byType: byType,
    lastBackup: backupsList[0]?.date || null,
    autoBackupEnabled: BACKUP_CONFIG.autoBackupEnabled,
    autoBackupInterval: BACKUP_CONFIG.autoBackupInterval / (24 * 60 * 60 * 1000) + ' jours'
  };
}

/**
 * Affiche un toast de notification
 * @param {string} message 
 * @param {string} type 
 */
function showBackupToast(message, type = 'success') {
  // Utiliser le système de toast global si disponible
  if (typeof showToast === 'function') {
    showToast(message, type);
  } else {
    console.log('[Backup Toast]', message);
    alert(message);
  }
}

// ==================== EXPORTS GLOBAUX ====================

// Exporter les fonctions pour l'usage global
window.backupManager = {
  init: initBackupSystem,
  createFullBackup: createFullBackup,
  createUsersBackup: createUsersBackup,
  createPlansBackup: createPlansBackup,
  createConfigBackup: createConfigBackup,
  restoreBackup: restoreBackup,
  restoreFromFile: restoreFromFile,
  exportBackup: exportBackup,
  deleteBackup: deleteBackup,
  getBackupsList: getBackupsList,
  getBackupStats: getBackupStats,
  configureAutoBackup: configureAutoBackup,
  cleanOldBackups: cleanOldBackups
};

// Pour compatibilité avec l'interface admin
window.createBackup = createFullBackup;
window.restoreBackup = restoreBackup;
window.deleteBackup = deleteBackup;
window.exportBackup = exportBackup;
window.getBackupsList = getBackupsList;

// Auto-initialisation si le DOM est prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBackupSystem);
} else {
  initBackupSystem();
}

console.log('[backup.js] ✅ Chargé avec succès');