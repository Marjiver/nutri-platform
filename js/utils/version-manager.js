/**
 * version-manager.js - NutriDoc
 * Gestion des versions et migrations
 */
const VERSION_MANAGER = {
  version: '1.0.0',
  showInfo: function() { console.log('[Version] NutriDoc v' + this.version); },
  showLog: function() { console.log('[Migration] Aucune migration en attente'); },
  exportData: function() { console.log('[Backup] Export des données'); return {}; },
  getBackups: function() { return []; },
  restoreBackup: async function(id) { console.log('[Restore]', id); return true; }
};
window.versionManager = VERSION_MANAGER;
