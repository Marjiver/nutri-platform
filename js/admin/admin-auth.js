/* ═══════════════════════════════════════════════════════════════
   admin-auth.js — NutriDoc · Protection de la page d'administration

   ⚠️ SÉCURITÉ — Ce fichier remplace l'ancienne version qui contenait
   un identifiant et un mot de passe ÉCRITS EN CLAIR dans le code.
   N'importe quel visiteur pouvait les lire dans le code source de la
   page et accéder au back-office. Cette faille est corrigée.

   Fonctionnement : l'accès repose désormais sur le vrai compte
   Supabase de l'utilisateur, et exige le rôle « admin » enregistré
   en base de données. Aucun mot de passe n'est stocké côté site.

   Prérequis dans la page : charger, AVANT ce fichier,
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="js/core/auth.js"></script>
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // 1. On masque le contenu tant que l'identité n'est pas confirmée
  var style = document.createElement('style');
  style.id = 'nd-admin-hide';
  style.textContent = '.admin-layout{display:none !important;}';
  (document.head || document.documentElement).appendChild(style);

  function afficherContenu() {
    var h = document.getElementById('nd-admin-hide');
    if (h) h.remove();
  }

  function ecran(titre, message, lien, libelleLien) {
    var o = document.createElement('div');
    o.style.cssText = 'position:fixed;inset:0;background:#0d2018;display:flex;' +
      'align-items:center;justify-content:center;z-index:99999;padding:1rem;' +
      'font-family:Outfit,system-ui,sans-serif;';
    var b = document.createElement('div');
    b.style.cssText = 'background:#fff;border-radius:16px;padding:2.5rem;max-width:420px;' +
      'width:100%;text-align:center;box-shadow:0 32px 80px rgba(0,0,0,.6);';

    var logo = document.createElement('div');
    logo.style.cssText = 'font-size:22px;font-weight:700;color:#0d2018;margin-bottom:.25rem;';
    logo.innerHTML = 'Nutri<span style="color:#1D9E75;font-style:italic;">Doc</span>';

    var st = document.createElement('div');
    st.style.cssText = 'font-size:11px;color:#6b7b74;text-transform:uppercase;' +
      'letter-spacing:.08em;margin-bottom:1.75rem;';
    st.textContent = 'Administration · Accès restreint';

    var t = document.createElement('div');
    t.style.cssText = 'font-size:1.05rem;font-weight:600;color:#0d2018;margin-bottom:.5rem;';
    t.textContent = titre;

    var m = document.createElement('div');
    m.style.cssText = 'font-size:.85rem;color:#4b5563;line-height:1.6;margin-bottom:1.5rem;';
    m.textContent = message;

    var a = document.createElement('a');
    a.href = lien;
    a.textContent = libelleLien;
    a.style.cssText = 'display:inline-block;background:#1D9E75;color:#fff;border-radius:999px;' +
      'padding:.7rem 1.75rem;font-size:.85rem;font-weight:600;text-decoration:none;';

    b.appendChild(logo); b.appendChild(st); b.appendChild(t); b.appendChild(m); b.appendChild(a);
    o.appendChild(b);
    document.body.appendChild(o);
  }

  // 2. Attente de l'initialisation de Supabase (auth.js)
  function attendreSupabase(essais) {
    if (window._supa && typeof window.getProfile === 'function') return controler();
    if (essais <= 0) {
      return ecran(
        'Service indisponible',
        "La connexion sécurisée n'a pas pu être établie. Rechargez la page ; si le problème persiste, contactez le support.",
        'index.html', "Retour à l'accueil"
      );
    }
    setTimeout(function () { attendreSupabase(essais - 1); }, 200);
  }

  // 3. Contrôle : compte connecté + rôle administrateur en base
  async function controler() {
    try {
      var res = await window._supa.auth.getUser();
      var user = res && res.data ? res.data.user : null;

      if (!user) {
        return ecran(
          'Connexion requise',
          "Cette page est réservée à l'administration de NutriDoc. Connectez-vous avec votre compte administrateur.",
          'login.html', 'Se connecter'
        );
      }

      var profil = await window.getProfile();
      if (!profil || profil.role !== 'admin') {
        return ecran(
          'Accès non autorisé',
          "Votre compte ne dispose pas des droits d'administration.",
          'index.html', "Retour à l'accueil"
        );
      }

      afficherContenu();
      window.ND_ADMIN = profil;
      document.dispatchEvent(new CustomEvent('nd-admin-pret', { detail: profil }));
    } catch (e) {
      ecran(
        'Erreur de vérification',
        "Impossible de vérifier vos droits d'accès. Rechargez la page.",
        'index.html', "Retour à l'accueil"
      );
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { attendreSupabase(40); });
  } else {
    attendreSupabase(40);
  }
})();
