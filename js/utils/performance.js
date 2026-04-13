/**
 * performance.js — NutriDoc · Analyse des performances
 * 
 * Fonctionnalités :
 * - Mesure des temps de chargement
 * - Monitoring des métriques Web Vitals (LCP, FID, CLS)
 * - Détection des ralentissements
 * - Rapports de performance
 * - Mode détaillé pour débogage
 * 
 * Version: 1.0.0
 */

// ==================== CONFIGURATION ====================

const PERF_CONFIG = {
  // Seuils d'alerte (en millisecondes)
  thresholds: {
    lcp: 2500,      // Largest Contentful Paint
    fid: 100,       // First Input Delay
    cls: 0.1,       // Cumulative Layout Shift
    ttfb: 600,      // Time To First Byte
    fcp: 1800,      // First Contentful Paint
    si: 2400,       // Speed Index
    tti: 3800       // Time To Interactive
  },
  
  // Activer les logs en console
  enableConsoleLogging: true,
  
  // Envoyer les métriques au serveur
  enableRemoteReporting: false,
  
  // URL d'envoi des métriques
  reportingUrl: '/api/performance',
  
  // Échantillonnage (1 sur N visites)
  samplingRate: 10,
  
  // Mode debug (plus de détails)
  debugMode: false
};

// ==================== MÉTRIQUES DE BASE ====================

/**
 * Mesure le temps de chargement de la page
 */
function measurePageLoadTime() {
  if (!window.performance) {
    console.warn('[Perf] Performance API non supportée');
    return null;
  }
  
  const perfData = performance.getEntriesByType('navigation')[0];
  if (!perfData) return null;
  
  const metrics = {
    // Temps DNS
    dns: perfData.domainLookupEnd - perfData.domainLookupStart,
    
    // Temps de connexion TCP
    tcp: perfData.connectEnd - perfData.connectStart,
    
    // Temps de requête SSL
    ssl: perfData.secureConnectionStart ? 
         (perfData.connectEnd - perfData.secureConnectionStart) : 0,
    
    // Time To First Byte
    ttfb: perfData.responseStart - perfData.requestStart,
    
    // Téléchargement du document
    download: perfData.responseEnd - perfData.responseStart,
    
    // Parsing DOM
    domParsing: perfData.domInteractive - perfData.responseEnd,
    
    // Chargement des ressources
    resources: perfData.loadEventStart - perfData.domContentLoadedEventEnd,
    
    // Temps total
    total: perfData.loadEventEnd - perfData.startTime,
    
    // Métriques détaillées
    domContentLoaded: perfData.domContentLoadedEventEnd - perfData.startTime,
    domInteractive: perfData.domInteractive - perfData.startTime,
    loadEvent: perfData.loadEventEnd - perfData.startTime
  };
  
  // Ajouter des libellés lisibles
  metrics.labels = {
    dns: 'Résolution DNS',
    tcp: 'Connexion TCP',
    ssl: 'Handshake SSL',
    ttfb: 'Time To First Byte',
    download: 'Téléchargement',
    domParsing: 'Parsing DOM',
    resources: 'Chargement ressources',
    total: 'Chargement total',
    domContentLoaded: 'DOM Content Loaded',
    domInteractive: 'DOM Interactif',
    loadEvent: 'Load Event'
  };
  
  return metrics;
}

/**
 * Affiche les métriques en console
 */
function logPerformanceMetrics(metrics) {
  if (!PERF_CONFIG.enableConsoleLogging) return;
  
  console.group('📊 Performance NutriDoc');
  
  // Temps total
  console.log(`⏱️  Chargement total: ${metrics.total.toFixed(0)} ms`);
  
  // Détail par étape
  console.group('Détail');
  for (const [key, value] of Object.entries(metrics)) {
    if (key !== 'labels' && typeof value === 'number') {
      const label = metrics.labels[key] || key;
      const color = getMetricColor(key, value);
      console.log(`  ${label}: %c${value.toFixed(0)} ms`, `color: ${color}`);
    }
  }
  console.groupEnd();
  
  // Vérification des seuils
  checkThresholds(metrics);
  
  console.groupEnd();
}

/**
 * Vérifie les seuils de performance
 */
function checkThresholds(metrics) {
  const warnings = [];
  const thresholds = PERF_CONFIG.thresholds;
  
  if (metrics.ttfb > thresholds.ttfb) {
    warnings.push(`TTFB élevé (${metrics.ttfb}ms > ${thresholds.ttfb}ms)`);
  }
  
  if (metrics.total > thresholds.tti) {
    warnings.push(`Temps de chargement élevé (${metrics.total}ms > ${thresholds.tti}ms)`);
  }
  
  if (warnings.length > 0) {
    console.warn('⚠️ Alertes performance:', warnings.join(', '));
  } else {
    console.log('✅ Toutes les métriques sont dans les seuils acceptables');
  }
}

/**
 * Couleur selon la métrique
 */
function getMetricColor(metric, value) {
  const thresholds = PERF_CONFIG.thresholds;
  const ttfbThreshold = thresholds.ttfb;
  const totalThreshold = thresholds.tti;
  
  if (metric === 'ttfb' && value > ttfbThreshold) return '#ef4444';
  if (metric === 'total' && value > totalThreshold) return '#ef4444';
  if (metric === 'ttfb' && value > ttfbThreshold * 0.7) return '#f59e0b';
  if (metric === 'total' && value > totalThreshold * 0.7) return '#f59e0b';
  return '#22c55e';
}

// ==================== WEB VITALS ====================

/**
 * Mesure le Largest Contentful Paint (LCP)
 */
function measureLCP() {
  if (!window.PerformanceObserver) {
    console.warn('[Perf] PerformanceObserver non supporté');
    return;
  }
  
  let lcpValue = 0;
  const observer = new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    const lastEntry = entries[entries.length - 1];
    lcpValue = lastEntry.renderTime || lastEntry.loadTime;
    
    if (PERF_CONFIG.enableConsoleLogging) {
      const color = lcpValue > PERF_CONFIG.thresholds.lcp ? '#ef4444' : '#22c55e';
      console.log(`🖼️  LCP: %c${lcpValue.toFixed(0)} ms`, `color: ${color}`);
    }
    
    // Envoyer au serveur
    sendMetric('lcp', lcpValue);
  });
  
  observer.observe({ type: 'largest-contentful-paint', buffered: true });
  
  return lcpValue;
}

/**
 * Mesure le First Input Delay (FID)
 */
function measureFID() {
  if (!window.PerformanceObserver) return;
  
  let fidValue = 0;
  const observer = new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    const firstInput = entries[0];
    fidValue = firstInput.processingStart - firstInput.startTime;
    
    if (PERF_CONFIG.enableConsoleLogging) {
      const color = fidValue > PERF_CONFIG.thresholds.fid ? '#ef4444' : '#22c55e';
      console.log(`👆 FID: %c${fidValue.toFixed(0)} ms`, `color: ${color}`);
    }
    
    sendMetric('fid', fidValue);
    observer.disconnect();
  });
  
  observer.observe({ type: 'first-input', buffered: true });
}

/**
 * Mesure le Cumulative Layout Shift (CLS)
 */
function measureCLS() {
  if (!window.PerformanceObserver) return;
  
  let clsValue = 0;
  const observer = new PerformanceObserver((entryList) => {
    for (const entry of entryList.getEntries()) {
      if (!entry.hadRecentInput) {
        clsValue += entry.value;
      }
    }
    
    if (PERF_CONFIG.enableConsoleLogging) {
      const color = clsValue > PERF_CONFIG.thresholds.cls ? '#ef4444' : '#22c55e';
      console.log(`📐 CLS: %c${clsValue.toFixed(3)}`, `color: ${color}`);
    }
    
    sendMetric('cls', clsValue);
  });
  
  observer.observe({ type: 'layout-shift', buffered: true });
}

/**
 * Mesure le First Contentful Paint (FCP)
 */
function measureFCP() {
  if (!window.PerformanceObserver) return;
  
  const observer = new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    const fcp = entries[0]?.startTime || 0;
    
    if (PERF_CONFIG.enableConsoleLogging) {
      const color = fcp > PERF_CONFIG.thresholds.fcp ? '#ef4444' : '#22c55e';
      console.log(`🎨 FCP: %c${fcp.toFixed(0)} ms`, `color: ${color}`);
    }
    
    sendMetric('fcp', fcp);
    observer.disconnect();
  });
  
  observer.observe({ type: 'paint', buffered: true });
}

// ==================== MÉTRIQUES RESSOURCES ====================

/**
 * Analyse les ressources chargées
 */
function analyzeResources() {
  if (!window.performance) return;
  
  const resources = performance.getEntriesByType('resource');
  const stats = {
    total: resources.length,
    byType: {},
    totalSize: 0,
    slowest: [],
    failed: []
  };
  
  for (const resource of resources) {
    // Type de ressource
    const type = resource.initiatorType || 'other';
    stats.byType[type] = (stats.byType[type] || 0) + 1;
    
    // Taille (si disponible)
    if (resource.transferSize) {
      stats.totalSize += resource.transferSize;
    }
    
    // Ressources lentes (> 500ms)
    if (resource.duration > 500) {
      stats.slowest.push({
        name: resource.name.split('/').pop(),
        duration: resource.duration,
        type: type
      });
    }
    
    // Ressources en échec
    if (resource.transferSize === 0 && resource.name) {
      stats.failed.push(resource.name.split('/').pop());
    }
  }
  
  // Trier les plus lentes
  stats.slowest.sort((a, b) => b.duration - a.duration);
  stats.slowest = stats.slowest.slice(0, 5);
  
  if (PERF_CONFIG.enableConsoleLogging) {
    console.group('📦 Ressources chargées');
    console.log(`Total: ${stats.total} ressources`);
    console.log(`Taille totale: ${formatBytes(stats.totalSize)}`);
    console.log('Par type:', stats.byType);
    
    if (stats.slowest.length) {
      console.warn('⏱️ Ressources les plus lentes:', stats.slowest);
    }
    
    if (stats.failed.length) {
      console.error('❌ Ressources en échec:', stats.failed);
    }
    console.groupEnd();
  }
  
  return stats;
}

/**
 * Formate les bytes en unité lisible
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ==================== MÉTRIQUES PERSONNALISÉES ====================

/**
 * Mesure le temps d'exécution d'une fonction
 */
function measureFunction(name, fn, context = null) {
  const start = performance.now();
  const result = fn.call(context);
  const duration = performance.now() - start;
  
  if (PERF_CONFIG.enableConsoleLogging && duration > 50) {
    console.warn(`⏱️ [${name}] a pris ${duration.toFixed(2)} ms`);
  }
  
  return result;
}

/**
 * Marque le début d'une opération
 */
function markStart(name) {
  if (!PERF_CONFIG.debugMode) return;
  performance.mark(`${name}-start`);
}

/**
 * Marque la fin d'une opération et mesure la durée
 */
function markEnd(name) {
  if (!PERF_CONFIG.debugMode) return;
  
  performance.mark(`${name}-end`);
  performance.measure(name, `${name}-start`, `${name}-end`);
  
  const measures = performance.getEntriesByName(name);
  if (measures.length > 0 && PERF_CONFIG.enableConsoleLogging) {
    console.log(`📏 [${name}] ${measures[0].duration.toFixed(2)} ms`);
  }
  
  performance.clearMarks(`${name}-start`);
  performance.clearMarks(`${name}-end`);
  performance.clearMeasures(name);
}

// ==================== ENVOI AU SERVEUR ====================

/**
 * Envoie une métrique au serveur
 */
async function sendMetric(name, value, metadata = {}) {
  if (!PERF_CONFIG.enableRemoteReporting) return;
  
  // Échantillonnage
  if (Math.random() > 1 / PERF_CONFIG.samplingRate) return;
  
  try {
    const payload = {
      name,
      value,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      ...metadata
    };
    
    // Envoi non bloquant
    if (navigator.sendBeacon) {
      navigator.sendBeacon(PERF_CONFIG.reportingUrl, JSON.stringify(payload));
    } else {
      await fetch(PERF_CONFIG.reportingUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      });
    }
  } catch (error) {
    console.warn('[Perf] Erreur envoi métrique:', error);
  }
}

// ==================== RAPPORT COMPLET ====================

/**
 * Génère un rapport complet de performance
 */
function generatePerformanceReport() {
  const loadMetrics = measurePageLoadTime();
  const resourceStats = analyzeResources();
  
  const report = {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    loadMetrics: loadMetrics,
    resourceStats: resourceStats,
    memory: null,
    connection: null
  };
  
  // Mémoire (si disponible)
  if (performance.memory) {
    report.memory = {
      usedJSHeapSize: formatBytes(performance.memory.usedJSHeapSize),
      totalJSHeapSize: formatBytes(performance.memory.totalJSHeapSize),
      jsHeapSizeLimit: formatBytes(performance.memory.jsHeapSizeLimit)
    };
  }
  
  // Connexion (si disponible)
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (connection) {
    report.connection = {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink ? `${connection.downlink} Mbps` : null,
      rtt: connection.rtt ? `${connection.rtt} ms` : null,
      saveData: connection.saveData
    };
  }
  
  if (PERF_CONFIG.enableConsoleLogging) {
    console.group('📈 Rapport de performance');
    console.log(report);
    console.groupEnd();
  }
  
  return report;
}

// ==================== DÉTECTION DES RALENTISSEMENTS ====================

/**
 * Détecte les longues tâches (blocking UI)
 */
function detectLongTasks() {
  if (!window.PerformanceObserver) return;
  
  const observer = new PerformanceObserver((entryList) => {
    for (const entry of entryList.getEntries()) {
      if (entry.duration > 50) {
        console.warn(`⚠️ Longue tâche détectée: ${entry.duration.toFixed(0)} ms`);
        
        if (PERF_CONFIG.enableRemoteReporting) {
          sendMetric('long_task', entry.duration, {
            name: entry.name,
            startTime: entry.startTime
          });
        }
      }
    }
  });
  
  observer.observe({ type: 'longtask', buffered: true });
}

// ==================== MÉTRIQUES PERSONNALISÉES NUTRIDOC ====================

/**
 * Mesure le temps de chargement des modules spécifiques
 */
function measureNutriDocModules() {
  // Mesure du chargement de CIQUAL
  markStart('ciqual-load');
  if (typeof CIQUAL !== 'undefined') {
    markEnd('ciqual-load');
  }
  
  // Mesure du rendu du dashboard
  const dashboardObserver = new MutationObserver(() => {
    const dashboard = document.getElementById('recoGrid');
    if (dashboard && dashboard.children.length > 0) {
      markEnd('dashboard-render');
      dashboardObserver.disconnect();
    }
  });
  
  if (document.getElementById('recoGrid')) {
    markStart('dashboard-render');
    dashboardObserver.observe(document.body, { childList: true, subtree: true });
  }
  
  // Mesure du premier affichage des résultats de bilan
  const bilanObserver = new MutationObserver(() => {
    const resultat = document.getElementById('resultat');
    if (resultat && resultat.style.display !== 'none') {
      markEnd('bilan-result-display');
      bilanObserver.disconnect();
    }
  });
  
  if (document.getElementById('bilanForm')) {
    markStart('bilan-result-display');
    bilanObserver.observe(document.body, { childList: true, subtree: true });
  }
}

// ==================== INITIALISATION ====================

/**
 * Initialise toutes les mesures de performance
 */
function initPerformanceMonitoring() {
  console.log('[Perf] Initialisation du monitoring...');
  
  // Mesures au chargement
  window.addEventListener('load', () => {
    // Attendre que tout soit chargé
    setTimeout(() => {
      const metrics = measurePageLoadTime();
      if (metrics) {
        logPerformanceMetrics(metrics);
        sendMetric('page_load', metrics.total);
      }
      
      analyzeResources();
      generatePerformanceReport();
    }, 100);
  });
  
  // Web Vitals
  measureLCP();
  measureFID();
  measureCLS();
  measureFCP();
  
  // Détection des longues tâches
  detectLongTasks();
  
  // Métriques spécifiques NutriDoc
  measureNutriDocModules();
  
  // Écouter la visibilité de la page
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      sendMetric('page_visible', Date.now());
    }
  });
  
  console.log('[Perf] Monitoring initialisé');
}

// ==================== API PUBLIQUE ====================

// Démarrer automatiquement
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPerformanceMonitoring);
} else {
  initPerformanceMonitoring();
}

// Exports globaux
window.performanceMetrics = {
  measurePageLoadTime,
  analyzeResources,
  generatePerformanceReport,
  measureFunction,
  markStart,
  markEnd,
  sendMetric
};

// Export pour débogage (en mode debug uniquement)
if (PERF_CONFIG.debugMode) {
  window.__perf = window.performanceMetrics;
}

console.log('[performance.js] ✅ Chargé avec succès');