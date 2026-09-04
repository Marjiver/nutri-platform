/**
 * error-handler.js — NutriDoc · Notifications utilisateur
 *
 * Ce fichier était un talon de 8 lignes qui se contentait d'un console.log.
 * Comme il est chargé APRÈS le <script> en ligne sur plusieurs pages (soit
 * plus bas dans le document, soit via `defer`), il écrasait le vrai
 * showToast de ces pages : une cinquantaine de notifications — validations,
 * erreurs, confirmations — partaient en console au lieu de l'écran.
 *
 * Deux corrections :
 *   1. une implémentation réelle, autonome, sans dépendance CSS ;
 *   2. une garde : si la page définit déjà showToast, on n'y touche pas.
 */
(function () {
  'use strict';

  // La page a sa propre implémentation : on la respecte.
  if (typeof window.showToast === 'function') return;

  var ZONE_ID = 'nd-toasts';
  var COULEURS = {
    success: '#0f6e56',
    error:   '#b3261e',
    warning: '#8a5b0b',
    info:    '#0d2018'
  };

  function zone() {
    var z = document.getElementById(ZONE_ID);
    if (z) return z;
    z = document.createElement('div');
    z.id = ZONE_ID;
    z.setAttribute('role', 'status');
    // aria-live : un lecteur d'écran annonce le message sans voler le focus.
    z.setAttribute('aria-live', 'polite');
    z.style.cssText =
      'position:fixed;bottom:1.25rem;left:50%;transform:translateX(-50%);' +
      'z-index:10000;display:flex;flex-direction:column;gap:.5rem;' +
      'align-items:center;pointer-events:none;max-width:min(92vw,420px);';
    document.body.appendChild(z);
    return z;
  }

  /**
   * Affiche une notification.
   * @param {string} message - texte affiché
   * @param {string} [type]  - 'success' (défaut), 'error', 'warning', 'info'
   */
  function showToast(message, type) {
    if (!message) return;
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', function () {
        showToast(message, type);
      });
      return;
    }

    var el = document.createElement('div');
    el.textContent = String(message);
    el.style.cssText =
      'background:' + (COULEURS[type] || COULEURS.success) + ';color:#fff;' +
      'padding:.6rem 1.15rem;border-radius:999px;font-size:.82rem;' +
      'font-family:inherit;line-height:1.45;text-align:center;' +
      'box-shadow:0 8px 28px rgba(0,0,0,.28);opacity:0;' +
      'transition:opacity .25s ease, transform .25s ease;' +
      'transform:translateY(6px);pointer-events:auto;';

    zone().appendChild(el);
    requestAnimationFrame(function () {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });

    // Une erreur reste plus longtemps : elle demande souvent une action.
    var duree = type === 'error' ? 6000 : 3500;
    setTimeout(function () {
      el.style.opacity = '0';
      el.style.transform = 'translateY(6px)';
      setTimeout(function () { el.remove(); }, 260);
    }, duree);
  }

  window.showToast = showToast;
})();
