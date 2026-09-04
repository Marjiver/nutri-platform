/**
 * cookies.js — NutriDoc · Bandeau consentement RGPD
 *
 * Le choix de l'utilisateur était écrit dans localStorage (nd_consent) mais
 * le test « a-t-on déjà demandé ? » lisait sessionStorage : la clé durable
 * n'était jamais relue. Le bandeau réapparaissait donc à chaque nouvelle
 * session, y compris après un refus explicite — ce qui revient à redemander
 * un consentement déjà exprimé.
 *
 * Le choix est désormais relu depuis localStorage et vaut 6 mois, durée
 * recommandée par la CNIL avant de solliciter à nouveau la personne.
 */

var ND_CONSENT_KEY = 'nd_consent';
var ND_CONSENT_MS  = 182 * 24 * 3600 * 1000;   // ~6 mois

/** Renvoie le consentement encore valide, ou null s'il faut redemander. */
function ndConsentActuel() {
  try {
    var brut = localStorage.getItem(ND_CONSENT_KEY);
    if (!brut) return null;
    var c = JSON.parse(brut);
    if (!c || !c.date) return null;
    if (Date.now() - new Date(c.date).getTime() > ND_CONSENT_MS) return null;
    return c;
  } catch (e) { return null; }
}

/** true si la personne a accepté la mesure d'audience. */
function ndAnalytiqueAutorise() {
  var c = ndConsentActuel();
  return !!(c && c.analytics);
}

function ndEnregistrerConsentement(analytics) {
  try {
    localStorage.setItem(ND_CONSENT_KEY, JSON.stringify({
      essential: true,
      analytics: !!analytics,
      date: new Date().toISOString(),
      version: '1.1'
    }));
  } catch (e) { /* stockage bloqué : on ne peut pas mémoriser le choix */ }
  // Conservé pour ne pas re-afficher le bandeau dans l'onglet courant même
  // si l'écriture durable a échoué (navigation privée).
  try { sessionStorage.setItem('nd_cookies_ok', '1'); } catch (e) {}
}

document.addEventListener("DOMContentLoaded", function() {
  if (ndConsentActuel()) return;
  if (sessionStorage.getItem('nd_cookies_ok')) return;

  const banner = document.createElement('div');
  banner.id = 'cookieBanner';
  banner.innerHTML = `
    <div class="cookie-inner">
      <div class="cookie-text">
        <strong>🍪 Cookies & confidentialité</strong>
        <p>NutriDoc utilise des cookies essentiels au fonctionnement (session, sécurité) et, avec votre accord, des cookies de mesure d'audience anonymes. Aucune donnée de santé n'est transmise à des tiers.</p>
        <a href="politique-confidentialite.html" target="_blank" style="color:var(--green3,#5DCAA5);font-size:.78rem;">En savoir plus →</a>
      </div>
      <div class="cookie-actions">
        <button class="cookie-btn-refuse" onclick="window.cookieRefuse()">Refuser</button>
        <button class="cookie-btn-accept" onclick="window.cookieAccept()">Accepter</button>
      </div>
    </div>`;

  const style = document.createElement('style');
  style.textContent = `
    #cookieBanner {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999;
      background: #0d2018; border-top: 1px solid rgba(29,158,117,.25);
      padding: 1rem 1.5rem; animation: cookieSlide .4s ease;
    }
    @keyframes cookieSlide { from { transform: translateY(100%); } to { transform: none; } }
    .cookie-inner {
      max-width: 1100px; margin: 0 auto;
      display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap;
    }
    .cookie-text { flex: 1; min-width: 240px; }
    .cookie-text strong { color: #fff; font-size: .9rem; display: block; margin-bottom: .25rem; }
    .cookie-text p { color: rgba(255,255,255,.6); font-size: .8rem; line-height: 1.6; margin: 0; }
    .cookie-actions { display: flex; gap: .75rem; flex-shrink: 0; }
    .cookie-btn-refuse {
      background: transparent; border: 1px solid rgba(255,255,255,.2);
      color: rgba(255,255,255,.65); padding: .5rem 1.1rem; border-radius: 999px;
      font-size: .82rem; cursor: pointer; font-family: inherit; transition: all .2s;
    }
    .cookie-btn-refuse:hover { border-color: rgba(255,255,255,.5); color: #fff; }
    .cookie-btn-accept {
      /* #12795a et non #1D9E75 : le blanc sur le vert de marque ne donne
         que 3,39:1, sous le seuil AA de 4,5:1. */
      background: #12795a; color: #fff; border: none;
      padding: .5rem 1.25rem; border-radius: 999px;
      font-size: .82rem; cursor: pointer; font-family: inherit;
      font-weight: 500; transition: background .2s;
    }
    .cookie-btn-accept:hover { background: #0f6e56; }
    @media (max-width: 480px) {
      .cookie-inner { flex-direction: column; gap: .75rem; }
      .cookie-actions { width: 100%; justify-content: flex-end; }
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(banner);

  // Le bandeau est en position:fixed : sans compensation il recouvre le bas
  // de la page. Sur le tunnel de bilan, il masquait le bouton « Continuer »,
  // qui devenait inatteignable sans faire defiler. On reserve donc sa
  // hauteur reelle en bas du document tant qu'il est affiche.
  function reserverEspace() {
    var b = document.getElementById('cookieBanner');
    if (!b) {
      document.body.style.paddingBottom = '';
      document.documentElement.style.setProperty('--nd-banner-h', '0px');
      return;
    }
    var h = Math.ceil(b.getBoundingClientRect().height);
    document.body.style.paddingBottom = h + 'px';
    // Publiee pour que les mises en page qui se calent sur la hauteur de la
    // fenetre puissent en retrancher le bandeau (voir bilan.html).
    document.documentElement.style.setProperty('--nd-banner-h', h + 'px');
  }
  requestAnimationFrame(reserverEspace);
  window.addEventListener('resize', reserverEspace, { passive: true });
});

function cookieAccept() {
  ndEnregistrerConsentement(true);
  hideCookieBanner();
}

function cookieRefuse() {
  ndEnregistrerConsentement(false);
  // Le refus doit aussi effacer ce qui avait pu être posé auparavant.
  try { localStorage.removeItem('nd_analytics_id'); } catch (e) {}
  hideCookieBanner();
}

function hideCookieBanner() {
  document.body.style.paddingBottom = '';
  document.documentElement.style.setProperty('--nd-banner-h', '0px');
  const b = document.getElementById('cookieBanner');
  if (b) {
    b.style.transform = 'translateY(100%)';
    b.style.transition = 'transform .3s ease';
    setTimeout(() => b.remove(), 320);
  }
}

// ⭐ Exports globaux
window.cookieAccept = cookieAccept;
window.cookieRefuse = cookieRefuse;
// Exposées pour que les scripts de mesure d'audience puissent vérifier le
// consentement avant de se déclencher.
window.ndConsentActuel      = ndConsentActuel;
window.ndAnalytiqueAutorise = ndAnalytiqueAutorise;