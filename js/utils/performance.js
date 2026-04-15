/**
 * performance.js - NutriDoc
 * Monitoring des performances
 */
(function() {
  if (window.performance && performance.timing) {
    window.addEventListener('load', function() {
      setTimeout(function() {
        const timing = performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        console.log('[Performance] Page chargée en ' + loadTime + 'ms');
      }, 0);
    });
  }
})();
