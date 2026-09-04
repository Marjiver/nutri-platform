/**
 * escape.js — NutriDoc · Échappement des sorties HTML
 *
 * Le dépôt contenait bien une fonction escapeHtml() dans js/core/validation.js,
 * mais ce fichier n'était chargé que par une seule page et la fonction n'était
 * appelée nulle part — alors que plus de trois cents affectations innerHTML
 * réinjectent des champs saisis par les utilisateurs (nom, ville, cabinet,
 * allergies, commentaires…).
 *
 * Scénario concret : un diététicien renseigne « <img src=x onerror=…> » dans
 * son cabinet ; l'administrateur ouvre la liste des diététiciens et le code
 * s'exécute dans sa session — avec ses droits.
 *
 * Ce module expose l'échappement globalement, sans dépendance, et doit être
 * chargé AVANT les scripts qui construisent du HTML.
 */
(function () {
  'use strict';

  var TABLE = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '`': '&#96;'
  };

  /**
   * Rend une valeur sûre pour une insertion dans du HTML.
   * null et undefined donnent une chaîne vide plutôt que « null ».
   * @param {*} v
   * @returns {string}
   */
  function escapeHtml(v) {
    if (v === null || v === undefined) return '';
    return String(v).replace(/[&<>"'`]/g, function (c) { return TABLE[c]; });
  }

  /**
   * Variante pour une valeur placée dans un attribut entre apostrophes,
   * par exemple onclick="f('${escapeAttr(id)}')".
   */
  function escapeAttr(v) {
    return escapeHtml(v).replace(/\r?\n/g, ' ');
  }

  window.escapeHtml = escapeHtml;
  window.escapeAttr = escapeAttr;
  // Alias court : plusieurs pages utilisaient déjà un esc() local.
  if (typeof window.esc !== 'function') window.esc = escapeHtml;
})();
