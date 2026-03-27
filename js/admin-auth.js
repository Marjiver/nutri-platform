/**
 * admin-auth.js — Protection de la page admin par mot de passe
 * Seul l'administrateur CaliDoc Santé peut accéder à admin.html
 */
(function() {
  const ADMIN_KEY   = 'nutridoc_admin_ok';
  const SESSION_TTL = 8 * 3600000; // 8h

  // Vérifier si déjà authentifié
  const stored = sessionStorage.getItem(ADMIN_KEY);
  if (stored) {
    const { ts } = JSON.parse(stored);
    if (Date.now() - ts < SESSION_TTL) return; // OK
    sessionStorage.removeItem(ADMIN_KEY);
  }

  // Masquer le contenu pendant la vérification
  document.documentElement.style.visibility = 'hidden';

  // Créer la modale de connexion
  const overlay = document.createElement('div');
  overlay.innerHTML = `
    <div style="
      position:fixed;inset:0;background:#0d2018;
      display:flex;align-items:center;justify-content:center;
      z-index:99999;font-family:'DM Sans',system-ui,sans-serif;">
      <div style="background:#fff;border-radius:16px;padding:2.5rem;width:340px;box-shadow:0 24px 64px rgba(0,0,0,.4);">
        <div style="font-family:'DM Serif Display',Georgia,serif;font-size:1.5rem;color:#0d2018;margin-bottom:.25rem;">
          Nutri<em style="font-style:italic;color:#1D9E75;">Doc</em>
        </div>
        <div style="font-size:.75rem;color:#6b7b74;margin-bottom:1.5rem;text-transform:uppercase;letter-spacing:.08em;">
          Administration · Accès restreint
        </div>
        <div style="margin-bottom:1rem;">
          <label style="font-size:.78rem;color:#6b7b74;display:block;margin-bottom:.3rem;">Identifiant</label>
          <input id="adminUser" type="text" placeholder="admin"
            style="width:100%;border:1px solid #e8edeb;border-radius:8px;padding:.6rem .8rem;font-size:.9rem;font-family:inherit;"/>
        </div>
        <div style="margin-bottom:1.25rem;">
          <label style="font-size:.78rem;color:#6b7b74;display:block;margin-bottom:.3rem;">Mot de passe</label>
          <input id="adminPwd" type="password" placeholder="••••••••"
            style="width:100%;border:1px solid #e8edeb;border-radius:8px;padding:.6rem .8rem;font-size:.9rem;font-family:inherit;"
            onkeydown="if(event.key==='Enter') document.getElementById('adminLoginBtn').click()"/>
        </div>
        <div id="adminErr" style="color:#ef4444;font-size:.78rem;margin-bottom:.75rem;display:none;">
          Identifiants incorrects.
        </div>
        <button id="adminLoginBtn"
          style="width:100%;background:#1D9E75;color:#fff;border:none;border-radius:999px;padding:.7rem;font-size:.875rem;font-weight:500;cursor:pointer;font-family:inherit;">
          Connexion
        </button>
        <div style="text-align:center;margin-top:.75rem;">
          <a href="index.html" style="font-size:.75rem;color:#6b7b74;">← Retour à l'accueil</a>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.documentElement.style.visibility = 'visible';

  setTimeout(() => document.getElementById('adminUser')?.focus(), 100);

  document.getElementById('adminLoginBtn').onclick = function() {
    const user = document.getElementById('adminUser').value.trim();
    const pwd  = document.getElementById('adminPwd').value;

    // ⚠ En production : remplacer par une vérification via Supabase Auth
    // Identifiants par défaut — À CHANGER avant mise en ligne
    const ADMIN_USER = 'calidoc';
    const ADMIN_PASS = 'NutriDoc2025!';

    if (user === ADMIN_USER && pwd === ADMIN_PASS) {
      sessionStorage.setItem(ADMIN_KEY, JSON.stringify({ ts: Date.now() }));
      overlay.remove();
    } else {
      document.getElementById('adminErr').style.display = 'block';
      document.getElementById('adminPwd').value = '';
      document.getElementById('adminPwd').focus();
    }
  };
})();
