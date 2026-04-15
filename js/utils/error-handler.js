/**
 * error-handler.js - NutriDoc
 * Gestion centralisée des erreurs
 */
function showToast(message, type) {
  console.log('[Toast]', message, type);
}
window.showToast = showToast;
