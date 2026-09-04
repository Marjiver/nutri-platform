/**
 * auto-save.js — NutriDoc · Brouillons de formulaire
 *
 * Ce fichier était un talon qui écrivait « [AutoSave] Initialisé » et rien
 * d'autre. Les trois boutons « Sauvegarder maintenant / Restaurer brouillon /
 * Effacer brouillon » — placés en tête du tunnel de bilan et sur la page de
 * profil — appelaient donc des fonctions inexistantes et levaient une
 * ReferenceError au clic.
 *
 * Fonctions exposées (toutes prennent l'id du <form>) :
 *   initAutoSave(formId)      — sauvegarde automatique à la saisie
 *   manualSave(formId)        — sauvegarde immédiate
 *   restoreLastDraft(formId)  — recharge le dernier brouillon
 *   clearCurrentDraft(formId) — supprime le brouillon
 *
 * ⚠ DONNÉES DE SANTÉ — le brouillon du bilan contient taille, poids,
 * pathologies et allergies. Il reste dans le navigateur du visiteur, en
 * clair, et n'est jamais transmis. Il est effacé à l'envoi du formulaire et
 * expire automatiquement au bout de 7 jours.
 */
(function () {
  'use strict';

  var PREFIXE = 'nutridoc_brouillon_';
  var EXPIRATION_MS = 7 * 24 * 3600 * 1000;   // 7 jours
  var DELAI_SAISIE  = 800;                     // anti-rebond

  function cle(formId) {
    // Un même id de formulaire peut exister sur deux pages : on isole par page.
    var page = window.location.pathname.split('/').pop() || 'index';
    return PREFIXE + page + '_' + (formId || 'form');
  }

  function formulaire(formId) {
    var f = document.getElementById(formId);
    if (!f) console.warn('[AutoSave] formulaire introuvable :', formId);
    return f;
  }

  function notifier(msg, type) {
    if (typeof window.showToast === 'function') window.showToast(msg, type);
  }

  /** Champs à ne jamais écrire sur le disque du visiteur. */
  function exclu(champ) {
    return champ.type === 'password' ||
           champ.type === 'file' ||
           champ.type === 'hidden' ||
           champ.autocomplete === 'off' ||
           champ.dataset.noSave !== undefined;
  }

  function lireChamps(form) {
    var data = {};
    form.querySelectorAll('input, select, textarea').forEach(function (c) {
      if (exclu(c) || !(c.name || c.id)) return;
      var k = c.name || c.id;
      if (c.type === 'checkbox') {
        // Plusieurs cases peuvent partager un name : on stocke une liste.
        if (!Array.isArray(data[k])) data[k] = [];
        if (c.checked) data[k].push(c.value || 'on');
      } else if (c.type === 'radio') {
        if (c.checked) data[k] = c.value;
      } else {
        data[k] = c.value;
      }
    });
    return data;
  }

  function ecrireChamps(form, data) {
    var n = 0;
    form.querySelectorAll('input, select, textarea').forEach(function (c) {
      if (exclu(c)) return;
      var k = c.name || c.id;
      if (!(k in data)) return;
      var v = data[k];
      if (c.type === 'checkbox') {
        c.checked = Array.isArray(v) && v.indexOf(c.value || 'on') !== -1;
      } else if (c.type === 'radio') {
        c.checked = (c.value === v);
      } else {
        c.value = v;
      }
      // Les pages écoutent input/change pour recalculer (IMC, validations…).
      c.dispatchEvent(new Event('input',  { bubbles: true }));
      c.dispatchEvent(new Event('change', { bubbles: true }));
      n++;
    });
    return n;
  }

  function sauver(formId, silencieux) {
    var form = formulaire(formId);
    if (!form) return false;
    try {
      localStorage.setItem(cle(formId), JSON.stringify({
        date: Date.now(),
        champs: lireChamps(form)
      }));
      if (!silencieux) notifier('Brouillon enregistré.', 'success');
      return true;
    } catch (e) {
      // Quota dépassé, ou stockage bloqué (navigation privée).
      console.warn('[AutoSave]', e.message);
      if (!silencieux) notifier("Impossible d'enregistrer le brouillon sur cet appareil.", 'error');
      return false;
    }
  }

  function lireBrouillon(formId) {
    try {
      var brut = localStorage.getItem(cle(formId));
      if (!brut) return null;
      var d = JSON.parse(brut);
      if (!d || !d.champs) return null;
      if (Date.now() - (d.date || 0) > EXPIRATION_MS) {
        localStorage.removeItem(cle(formId));
        return null;
      }
      return d;
    } catch (e) { return null; }
  }

  function manualSave(formId)  { sauver(formId, false); }

  function restoreLastDraft(formId) {
    var form = formulaire(formId);
    if (!form) return;
    var d = lireBrouillon(formId);
    if (!d) { notifier('Aucun brouillon enregistré.', 'info'); return; }
    var n = ecrireChamps(form, d.champs);
    var quand = new Date(d.date).toLocaleString('fr-FR',
      { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    notifier(n + ' champ(s) restauré(s) — brouillon du ' + quand + '.', 'success');
  }

  function clearCurrentDraft(formId) {
    try { localStorage.removeItem(cle(formId)); } catch (e) {}
    notifier('Brouillon effacé.', 'info');
  }

  /** Sauvegarde automatique à la saisie, avec anti-rebond. */
  function initAutoSave(formId) {
    // Sans argument : on prend le premier formulaire portant un id.
    if (!formId) {
      var f = document.querySelector('form[id]');
      if (!f) return;
      formId = f.id;
    }
    var form = formulaire(formId);
    if (!form) return;
    var minuteur;
    form.addEventListener('input', function () {
      clearTimeout(minuteur);
      minuteur = setTimeout(function () { sauver(formId, true); }, DELAI_SAISIE);
    });
    form.addEventListener('submit', function () { clearCurrentDraft(formId); });
  }

  window.initAutoSave      = initAutoSave;
  window.manualSave        = manualSave;
  window.restoreLastDraft  = restoreLastDraft;
  window.clearCurrentDraft = clearCurrentDraft;
  window.hasDraft          = function (formId) { return !!lireBrouillon(formId); };
})();
