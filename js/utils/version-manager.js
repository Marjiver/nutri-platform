// Afficher les infos de version
versionManager.showInfo();

// Afficher le journal des migrations
versionManager.showLog();

// Exporter toutes les données (backup)
versionManager.exportData();

// Voir les sauvegardes disponibles
console.log(versionManager.getBackups());

// Restaurer une sauvegarde (si nécessaire)
await versionManager.restoreBackup('nutridoc_backup_1.0.0_1737123456789');