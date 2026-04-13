/**
 * nav.js — NutriDoc · Navigation universelle
 * Injecte automatiquement le header avec mega-menu selon le profil détecté
 */

const NAV_CONFIG = {
  patient: {
    color: '#1D9E75',
    label: 'Mon espace',
    links: [
      { href:'dashboard.html',    icon:'🏠', label:'Mon tableau de bord' },
      { href:'bilan.html',        icon:'📋', label:'Mon bilan' },
      { href:'faq.html',          icon:'❓', label:'FAQ' },
    ]
  },
  dietitian: {
    color: '#1D9E75',
    label: 'Espace diét.',
    links: [
      { href:'dietitian.html',         icon:'📂', label:'Dossiers patients' },
      { href:'agenda-dieteticien.html', icon:'📅', label:'Agenda visios' },
      { href:'compta-dieteticien.html', icon:'💶', label:'Comptabilité' },
      { href:'faq.html',               icon:'❓', label:'FAQ' },
    ]
  },
  prescriber: {
    color: '#1a3a6b',
    label: 'Espace pro',
    links: [
      { href:'prescripteur-dashboard.html', icon:'🏠', label:'Tableau de bord' },
      { href:'prescripteur-crm.html',       icon:'👥', label:'Mes clients' },
      { href:'compta-prescripteur.html',    icon:'💶', label:'Comptabilité' },
      { href:'faq.html',                    icon:'❓', label:'FAQ' },
    ]
  },
  public: {
    color: '#1D9E75',
    label: null,
    links: []
  }
};

// Détecte le profil depuis localStorage ou URL
function detectRole() {
  const bilan = localStorage.getItem('nutridoc_bilan');
  const diet  = localStorage.getItem('nutridoc_dieteticien');
  const presc = localStorage.getItem('nutridoc_prescripteur');
  const page  = window.location.pathname.split('/').pop();
  if (diet  || page.includes('dietitian')  || page.includes('agenda-diet') || page.includes('compta-diet')) return 'dietitian';
  if (presc || page.includes('prescripteur')) return 'prescriber';
  if (bilan || page.includes('dashboard') || page.includes('bilan')) return 'patient';
  return 'public';
}

function buildUniversalNav() {
  const role   = detectRole();
  const config = NAV_CONFIG[role] || NAV_CONFIG.public;
  const page   = window.location.pathname.split('/').pop() || 'index.html';

  // Ne pas injecter si une nav existe déjà dans la page (header personnalisé)
  if (document.querySelector('.nd-header')) {
    // Sur les pages avec header personnalisé, on ne fait qu'ajouter le scroll-top
    addScrollTopButton();
    return;
  }
  
  // Ne pas injecter si déjà présent
  if (document.getElementById('universalNav')) return;
  if (window._skipUniversalNav) return;

  // Sélecteur de vue pour publics non connectés
  const publicMenu = role === 'public' ? `
    <div class="unav-conn-wrap" id="unavConnWrap">
      <button class="unav-conn-btn" onclick="unavToggleConn()">
        Se connecter <span class="unav-chevron">▾</span>
      </button>
      <div class="unav-conn-dropdown" id="unavConnDropdown">
        <div class="unav-conn-section">Connexion</div>
        <a href="login.html?role=patient"    class="unav-conn-item"><div class="unav-av" style="background:rgba(29,158,117,.2);color:#1D9E75;">P</div><div><div class="unav-conn-title">Patient</div><div class="unav-conn-sub">Accéder à mon bilan</div></div></a>
        <a href="login.html?role=dietitian"  class="unav-conn-item"><div class="unav-av" style="background:rgba(93,202,165,.2);color:#0f6e56;">D</div><div><div class="unav-conn-title">Diététicien</div><div class="unav-conn-sub">Espace de validation</div></div></a>
        <a href="login.html?role=prescriber" class="unav-conn-item"><div class="unav-av" style="background:rgba(26,58,107,.2);color:#1a3a6b;">Pro</div><div><div class="unav-conn-title">Prescripteur</div><div class="unav-conn-sub">Médecin, kiné, coach…</div></div></a>
        <div class="unav-conn-divider"></div>
        <div class="unav-conn-footer">
          <a href="inscription-dieteticien.html"  class="unav-conn-footer-link">Inscription diététicien →</a>
          <a href="inscription-prescripteur.html" class="unav-conn-footer-link">Inscription prescripteur →</a>
        </div>
      </div>
    </div>` : '';

  // Menu outils si connecté
  const toolsMenu = config.links.length > 0 ? `
    <div class="unav-tools-wrap" id="unavToolsWrap">
      <button class="unav-tools-btn" onclick="unavToggleTools()" style="--accent:${config.color}">
        <div class="unav-tools-grid-icon">
          <span></span><span></span><span></span>
          <span></span><span></span><span></span>
          <span></span><span></span><span></span>
        </div>
        Outils
      </button>
      <div class="unav-tools-dropdown" id="unavToolsDropdown">
        <div class="unav-conn-section">${config.label}</div>
        ${config.links.map(l => `
          <a href="${l.href}" class="unav-tools-item ${page===l.href?'active':''}">
            <span class="unav-tools-icon">${l.icon}</span>
            <span>${l.label}</span>
          </a>`).join('')}
        <div class="unav-conn-divider"></div>
        <a href="index.html" class="unav-tools-item"><span class="unav-tools-icon">🏡</span><span>Accueil</span></a>
        <a href="#" onclick="unavDeconnect()" class="unav-tools-item" style="color:#ef4444;"><span class="unav-tools-icon">↩</span><span>Se déconnecter</span></a>
      </div>
    </div>` : '';

  const navHtml = `
<nav class="unav" id="universalNav">
  <a href="index.html" class="unav-logo">Nutri<em>Doc</em></a>

  <div class="unav-links" id="unavLinks">
    <a href="index.html"   class="unav-link ${page==='index.html'?'active':''}">Accueil</a>
    <a href="bilan.html"   class="unav-link ${page==='bilan.html'?'active':''}">Bilan gratuit</a>
    <a href="faq.html"     class="unav-link ${page==='faq.html'?'active':''}">FAQ</a>
    ${role !== 'public' ? `<a href="${config.links[0]?.href||'dashboard.html'}" class="unav-link" style="color:${config.color};">Mon espace</a>` : ''}
  </div>

  <div class="unav-right">
    ${toolsMenu}
    ${publicMenu}
    ${role === 'public' ? `<a href="bilan.html" class="unav-cta">Commencer gratuit →</a>` : ''}
  </div>
</nav>`;

  // Injecter en haut du body si pas déjà fait
  if (!document.getElementById('universalNav')) {
    document.body.insertAdjacentHTML('afterbegin', navHtml);
    document.body.style.paddingTop = '60px';
  }

  // Barre profil sous la nav universelle (seulement si pas déjà présente)
  const hasDynamicProfilBar = document.querySelector('.dynamic-profil-bar') || 
                              document.querySelector('#dynamicProfilBar') ||
                              document.querySelector('.profil-selector');
  
  if (!document.getElementById('unavProfilBar') && !hasDynamicProfilBar) {
    var page = window.location.pathname.split('/').pop() || 'index.html';
    var isDiet  = page.includes('dieteticien') || page.includes('dietitian') || page.includes('agenda-diet') || page.includes('compta-diet');
    var isPresc = page.includes('prescripteur');
    var barHtml = '<div id="unavProfilBar" style="position:sticky;top:60px;z-index:98;background:#080f0b;border-bottom:1px solid rgba(255,255,255,.07);padding:.38rem 2rem;">' +
      '<div style="max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:center;gap:.5rem;flex-wrap:wrap;">' +
      '<span style="font-size:.7rem;color:rgba(255,255,255,.3);">Vous êtes :</span>' +
      '<a href="index.html" style="font-size:.72rem;' + (!isDiet && !isPresc ? 'font-weight:500;color:#fff;background:rgba(29,158,117,.18);border:1px solid rgba(29,158,117,.35);' : 'color:rgba(255,255,255,.5);border:1px solid rgba(255,255,255,.1);') + 'border-radius:999px;padding:.18rem .8rem;text-decoration:none;">🧑 Patient</a>' +
      '<a href="accueil-dieteticien.html" style="font-size:.72rem;' + (isDiet ? 'font-weight:500;color:#fff;background:rgba(29,158,117,.18);border:1px solid rgba(29,158,117,.35);' : 'color:rgba(255,255,255,.5);border:1px solid rgba(255,255,255,.1);') + 'border-radius:999px;padding:.18rem .8rem;text-decoration:none;">🥗 Diététicien</a>' +
      '<a href="inscription-prescripteur.html" style="font-size:.72rem;' + (isPresc ? 'font-weight:500;color:#fff;background:rgba(29,158,117,.18);border:1px solid rgba(29,158,117,.35);' : 'color:rgba(255,255,255,.5);border:1px solid rgba(255,255,255,.1);') + 'border-radius:999px;padding:.18rem .8rem;text-decoration:none;">🏢 Entreprise / Experts</a>' +
      '</div></div>';
    document.body.insertAdjacentHTML('afterbegin', barHtml);
    document.body.style.paddingTop = '98px';
  }

  addScrollTopButton();

  // Fermer dropdowns au clic extérieur
  document.addEventListener('click', e => {
    if (!document.getElementById('unavConnWrap')?.contains(e.target))
      document.getElementById('unavConnDropdown')?.classList.remove('open');
    if (!document.getElementById('unavToolsWrap')?.contains(e.target))
      document.getElementById('unavToolsDropdown')?.classList.remove('open');
  });

  // Pages internes : nav toujours opaque (pas de hero transparent)
  const isHomePage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';
  const navEl = document.getElementById('universalNav');
  if (!isHomePage && navEl) navEl.classList.add('scrolled');
  // Scroll → fond opaque (pour index.html uniquement)
  window.addEventListener('scroll', () => {
    if (isHomePage) document.getElementById('universalNav')?.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
}

function addScrollTopButton() {
  // Bouton scroll-to-top (toutes pages) - éviter les doublons
  if (!document.querySelector('.scroll-top-btn')) {
    const btn = document.createElement('button');
    btn.className = 'scroll-top-btn';
    btn.innerHTML = '↑';
    btn.title = 'Retour en haut';
    btn.setAttribute('aria-label', 'Retour en haut de page');
    btn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    document.body.appendChild(btn);
    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 300);
    }, { passive: true });
  }
}

function unavToggleConn() {
  const dropdown = document.getElementById('unavConnDropdown');
  const toolsDropdown = document.getElementById('unavToolsDropdown');
  if (dropdown) dropdown.classList.toggle('open');
  if (toolsDropdown) toolsDropdown.classList.remove('open');
}

function unavToggleTools() {
  const dropdown = document.getElementById('unavToolsDropdown');
  const connDropdown = document.getElementById('unavConnDropdown');
  if (dropdown) dropdown.classList.toggle('open');
  if (connDropdown) connDropdown.classList.remove('open');
}

function unavDeconnect() {
  ['nutridoc_bilan', 'nutridoc_dieteticien', 'nutridoc_prescripteur', 'nutridoc_current_user'].forEach(k => localStorage.removeItem(k));
  window.location.href = 'index.html';
}

// Exposer les fonctions globales nécessaires
window.unavToggleConn = unavToggleConn;
window.unavToggleTools = unavToggleTools;
window.unavDeconnect = unavDeconnect;

// Attendre que le DOM soit chargé
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', buildUniversalNav);
} else {
  buildUniversalNav();
}