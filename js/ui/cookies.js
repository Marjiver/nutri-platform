/**
 * cookies.js — NutriDoc · Bandeau consentement RGPD
 */

document.addEventListener("DOMContentLoaded", function() {
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
      background: #1D9E75; color: #fff; border: none;
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
});

function cookieAccept() {
  sessionStorage.setItem('nd_cookies_ok', '1');
  localStorage.setItem('nd_consent', JSON.stringify({
    essential: true,
    analytics: true,
    date: new Date().toISOString(),
    version: '1.0'
  }));
  hideCookieBanner();
}

function cookieRefuse() {
  sessionStorage.setItem('nd_cookies_ok', '1');
  localStorage.setItem('nd_consent', JSON.stringify({
    essential: true,
    analytics: false,
    date: new Date().toISOString(),
    version: '1.0'
  }));
  localStorage.removeItem('nd_analytics_id');
  hideCookieBanner();
}

function hideCookieBanner() {
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