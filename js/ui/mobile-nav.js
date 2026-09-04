/**
 * mobile-nav.js — NutriDoc · Menu de navigation mobile
 *
 * Douze pages masquaient leur barre de liens sous 768 ou 900px
 * (`.nd-nav{display:none}`) sans proposer la moindre alternative : sur
 * téléphone, la navigation disparaissait purement et simplement.
 *
 * Ce module ajoute un bouton ☰ dans l'en-tête et un panneau dépliant
 * reprenant les liens existants. Il ne remplace rien : il clone ce que la
 * page déclare déjà, donc chaque page garde ses propres entrées.
 *
 * Il ne devine aucun point de rupture : le bouton apparaît quand `.nd-nav`
 * est réellement masquée par le CSS de la page, et disparaît sinon. Les
 * pages qui coupent à 768px et celles qui coupent à 900px fonctionnent donc
 * toutes les deux sans réglage.
 */
(function () {
  'use strict';

  var STYLE_ID  = 'nd-mnav-style';
  var BOUTON_ID = 'nd-mnav-btn';
  var PANNEAU_ID = 'nd-mnav-panel';

  function injecterStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = [
      '#' + BOUTON_ID + '{display:none;align-items:center;justify-content:center;',
      '  width:38px;height:38px;flex-shrink:0;border-radius:10px;cursor:pointer;',
      '  background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);',
      '  color:#fff;font-size:1.05rem;line-height:1;font-family:inherit;}',
      '#' + BOUTON_ID + ':hover{background:rgba(255,255,255,.16);}',
      '#' + BOUTON_ID + ':focus-visible{outline:2px solid #5DCAA5;outline-offset:2px;}',
      '#' + BOUTON_ID + '.nd-mnav-visible{display:flex;}',

      '#' + PANNEAU_ID + '{position:fixed;left:0;right:0;z-index:99;',
      '  background:#0d2018;border-bottom:1px solid rgba(29,158,117,.25);',
      '  box-shadow:0 18px 40px rgba(0,0,0,.45);',
      '  display:none;flex-direction:column;padding:.5rem 0 .75rem;',
      '  max-height:calc(100vh - 60px);overflow-y:auto;}',
      '#' + PANNEAU_ID + '.open{display:flex;}',
      '#' + PANNEAU_ID + ' a{display:block;padding:.7rem 1.5rem;',
      '  color:rgba(255,255,255,.82);text-decoration:none;font-size:.9rem;}',
      '#' + PANNEAU_ID + ' a:hover,#' + PANNEAU_ID + ' a:focus-visible{',
      '  background:rgba(29,158,117,.16);color:#fff;}',
      '#' + PANNEAU_ID + ' .nd-mnav-sep{height:1px;background:rgba(255,255,255,.09);',
      '  margin:.45rem 1.5rem;}',
      '#' + PANNEAU_ID + ' .nd-mnav-cta{margin:.5rem 1.5rem .25rem;padding:.7rem 1rem;',
      '  background:#0f6e56;color:#fff;border-radius:999px;text-align:center;',
      '  font-weight:600;}',
      '#' + PANNEAU_ID + ' .nd-mnav-cta:hover{background:#0b5442;}',
      // Sur mobile l'en-tête doit tenir sur une ligne : les actions passent
      // dans le panneau, sinon la barre montait à 110-141px et recouvrait le
      // contenu (le padding-top des pages n'en réserve que 96).
      // Trois conventions de nommage coexistent dans le site.
      '.nd-mnav-compact .header-actions > *:not(#' + BOUTON_ID + '),',
      '.nd-mnav-compact .h-right > *:not(#' + BOUTON_ID + '),',
      '.nd-mnav-compact .ha > *:not(#' + BOUTON_ID + '){display:none !important;}',
      '@media (prefers-reduced-motion:reduce){#' + PANNEAU_ID + '{transition:none;}}'
    ].join('');
    document.head.appendChild(st);
  }

  function construire() {
    var header = document.querySelector('.nd-header');
    var nav    = document.querySelector('.nd-nav');
    if (!header || !nav) return;                 // page sans cette structure
    if (document.getElementById(BOUTON_ID)) return;

    injecterStyles();

    var btn = document.createElement('button');
    btn.id = BOUTON_ID;
    btn.type = 'button';
    btn.innerHTML = '☰';
    btn.setAttribute('aria-label', 'Ouvrir le menu de navigation');
    btn.setAttribute('aria-controls', PANNEAU_ID);
    btn.setAttribute('aria-expanded', 'false');

    var panneau = document.createElement('nav');
    panneau.id = PANNEAU_ID;
    panneau.setAttribute('aria-label', 'Navigation mobile');

    // On reprend les liens de la page — jamais une liste écrite en dur, qui
    // se désynchroniserait du menu de bureau à la première modification.
    nav.querySelectorAll('a').forEach(function (a) {
      var c = a.cloneNode(true);
      c.removeAttribute('class');
      panneau.appendChild(c);
    });

    // Liens du menu « compte » s'il existe sur la page.
    var compte = document.querySelectorAll('.nd-conn-menu a, .nd-conn-item');
    if (compte.length) {
      var sep = document.createElement('div');
      sep.className = 'nd-mnav-sep';
      panneau.appendChild(sep);
      compte.forEach(function (a) {
        if (a.tagName !== 'A') return;
        var c = a.cloneNode(true);
        c.removeAttribute('class');
        panneau.appendChild(c);
      });
    }

    // L'appel à l'action de l'en-tête est repris en bas du panneau : il est
    // masqué sur mobile pour garder la barre sur une seule ligne, mais il ne
    // doit pas devenir inatteignable pour autant.
    var cta = header.querySelector('.nd-btn-primary, .nd-cta, .btn-primary, a[href*="bilan"].nd-btn, .header-actions a[class*="primary"]');
    if (cta && cta.tagName === 'A') {
      var sep2 = document.createElement('div');
      sep2.className = 'nd-mnav-sep';
      panneau.appendChild(sep2);
      var cc = cta.cloneNode(true);
      cc.className = 'nd-mnav-cta';
      panneau.appendChild(cc);
    }

    if (!panneau.children.length) return;        // rien à proposer

    // Le bouton se place à la fin de la zone d'actions de l'en-tête si elle
    // existe, sinon directement dans l'en-tête. Le site utilise trois
    // conventions selon l'époque de la page : .header-actions, .h-right, .ha.
    (header.querySelector('.header-actions, .h-right, .ha, .nd-header-right') || header)
      .appendChild(btn);
    document.body.appendChild(panneau);

    function positionner() {
      var r = header.getBoundingClientRect();
      panneau.style.top = Math.max(0, r.bottom) + 'px';
      panneau.style.maxHeight = 'calc(100vh - ' + Math.max(0, r.bottom) + 'px)';
    }

    function ouvrir(oui) {
      if (oui) positionner();
      panneau.classList.toggle('open', oui);
      btn.setAttribute('aria-expanded', String(oui));
      btn.setAttribute('aria-label', oui ? 'Fermer le menu de navigation'
                                         : 'Ouvrir le menu de navigation');
      btn.innerHTML = oui ? '✕' : '☰';
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      ouvrir(!panneau.classList.contains('open'));
    });
    panneau.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') ouvrir(false);
    });
    document.addEventListener('click', function (e) {
      if (!panneau.contains(e.target) && e.target !== btn) ouvrir(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') ouvrir(false);
    });

    // Le bouton n'apparaît que lorsque la barre de liens est effectivement
    // masquée : on lit le CSS appliqué plutôt que de supposer un seuil.
    function ajuster() {
      var cachee = getComputedStyle(nav).display === 'none';
      btn.classList.toggle('nd-mnav-visible', cachee);
      // En mode compact, les autres actions de l'en-tête sont masquées :
      // elles restent accessibles depuis le panneau.
      document.documentElement.classList.toggle('nd-mnav-compact', cachee);
      if (!cachee) ouvrir(false);
      else if (panneau.classList.contains('open')) positionner();
    }
    ajuster();
    window.addEventListener('resize', ajuster, { passive: true });
    window.addEventListener('orientationchange', ajuster);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', construire);
  } else {
    construire();
  }
})();
