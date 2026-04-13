/* admin-auth.js — NutriDoc · Protection page admin */
(function () {
  const SESSION_KEY = 'nd_admin';
  const SESSION_TTL = 8 * 60 * 60 * 1000; // 8h

  /* ── Vérifier si déjà authentifié ──────────────────────── */
  function estConnecte() {
    try {
      var s = sessionStorage.getItem(SESSION_KEY);
      if (!s) return false;
      return (Date.now() - JSON.parse(s).ts) < SESSION_TTL;
    } catch (e) { return false; }
  }

  if (estConnecte()) return; // rien à faire

  /* ── Masquer le contenu admin ───────────────────────────── */
  var style = document.createElement('style');
  style.id = 'nd-admin-hide';
  style.textContent = '.admin-layout { display: none !important; } .sidebar { display: none !important; } .main-content { display: none !important; }';
  document.head.appendChild(style);

  /* ── Créer la modale de connexion ───────────────────────── */
  function creerModale() {
    var overlay = document.createElement('div');
    overlay.id = 'nd-admin-login';
    overlay.style.cssText = 'position:fixed;inset:0;background:#0d2018;display:flex;align-items:center;justify-content:center;z-index:99999;';

    var box = document.createElement('div');
    box.style.cssText = 'background:#ffffff;border-radius:16px;padding:40px;width:360px;max-width:90vw;box-shadow:0 32px 80px rgba(0,0,0,.6);';

    /* Logo */
    var logo = document.createElement('div');
    logo.style.cssText = 'font-size:22px;font-weight:700;color:#0d2018;margin-bottom:4px;';
    logo.innerHTML = 'Nutri<span style="color:#1D9E75;font-style:italic;">Doc</span>';

    var sousTitre = document.createElement('div');
    sousTitre.style.cssText = 'font-size:11px;color:#6b7b74;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:28px;';
    sousTitre.textContent = 'Administration · Accès restreint';

    /* Champ identifiant */
    var labelUser = document.createElement('label');
    labelUser.style.cssText = 'display:block;font-size:12px;color:#6b7b74;margin-bottom:5px;';
    labelUser.textContent = 'Identifiant';

    var inputUser = document.createElement('input');
    inputUser.type = 'text';
    inputUser.autocomplete = 'username';
    inputUser.placeholder = 'admin';
    inputUser.style.cssText = 'display:block;width:100%;box-sizing:border-box;border:1px solid #e8edeb;border-radius:8px;padding:10px 14px;font-size:15px;margin-bottom:16px;outline:none;font-family:inherit;';

    /* Champ mot de passe */
    var labelPwd = document.createElement('label');
    labelPwd.style.cssText = 'display:block;font-size:12px;color:#6b7b74;margin-bottom:5px;';
    labelPwd.textContent = 'Mot de passe';

    var inputPwd = document.createElement('input');
    inputPwd.type = 'password';
    inputPwd.autocomplete = 'current-password';
    inputPwd.placeholder = '••••••••';
    inputPwd.style.cssText = 'display:block;width:100%;box-sizing:border-box;border:1px solid #e8edeb;border-radius:8px;padding:10px 14px;font-size:15px;margin-bottom:8px;outline:none;font-family:inherit;';

    /* Message erreur */
    var errMsg = document.createElement('div');
    errMsg.style.cssText = 'font-size:12px;color:#ef4444;margin-bottom:14px;min-height:18px;';
    errMsg.textContent = '';

    /* Bouton connexion */
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Se connecter';
    btn.style.cssText = 'display:block;width:100%;background:#1D9E75;color:#fff;border:none;border-radius:999px;padding:12px;font-size:15px;font-weight:500;cursor:pointer;font-family:inherit;margin-bottom:16px;';

    /* Lien retour */
    var retour = document.createElement('div');
    retour.style.cssText = 'text-align:center;';
    var lienRetour = document.createElement('a');
    lienRetour.href = 'index.html';
    lienRetour.textContent = '← Retour à l\'accueil';
    lienRetour.style.cssText = 'font-size:12px;color:#6b7b74;text-decoration:none;';
    retour.appendChild(lienRetour);

    /* Assembler */
    box.appendChild(logo);
    box.appendChild(sousTitre);
    box.appendChild(labelUser);
    box.appendChild(inputUser);
    box.appendChild(labelPwd);
    box.appendChild(inputPwd);
    box.appendChild(errMsg);
    box.appendChild(btn);
    box.appendChild(retour);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    /* Focus */
    setTimeout(function () { inputUser.focus(); }, 100);

    /* ── Logique de connexion ──────────────────────────────── */
    // ⚠ À REMPLACER par vérification Supabase Auth en production
    var ADMIN_USER = 'calidoc';
    var ADMIN_PASS = 'NutriDoc2025!';

    function tenterConnexion() {
      var user = inputUser.value.trim();
      var pass = inputPwd.value;

      if (user === ADMIN_USER && pass === ADMIN_PASS) {
        /* Succès */
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ts: Date.now() }));
        overlay.remove();
        var hide = document.getElementById('nd-admin-hide');
        if (hide) hide.remove();
      } else {
        /* Échec */
        errMsg.textContent = 'Identifiants incorrects. Réessayez.';
        inputPwd.value = '';
        inputPwd.style.borderColor = '#ef4444';
        inputUser.style.borderColor = '#ef4444';
        setTimeout(function () {
          inputPwd.style.borderColor = '#e8edeb';
          inputUser.style.borderColor = '#e8edeb';
        }, 1500);
        inputPwd.focus();
      }
    }

    btn.addEventListener('click', tenterConnexion);
    inputPwd.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') tenterConnexion();
    });
    inputUser.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') inputPwd.focus();
    });
    inputUser.addEventListener('focus', function () {
      this.style.borderColor = '#1D9E75';
    });
    inputUser.addEventListener('blur', function () {
      this.style.borderColor = '#e8edeb';
    });
    inputPwd.addEventListener('focus', function () {
      this.style.borderColor = '#1D9E75';
    });
    inputPwd.addEventListener('blur', function () {
      this.style.borderColor = '#e8edeb';
    });
  }

  /* ── Lancer quand le DOM est prêt ───────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', creerModale);
  } else {
    creerModale();
  }

})();
