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

  // Sur index.html, le nd-header natif gère déjà tout → on ne double pas
  if (document.querySelector('.nd-header')) return;
  // Injecter en haut du body si pas déjà fait
  if (!document.getElementById('universalNav')) {
    document.body.insertAdjacentHTML('afterbegin', navHtml);
    document.body.style.paddingTop = '60px';
  }


  // Bouton scroll-to-top (toutes pages)
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

function unavToggleConn() {
  document.getElementById('unavConnDropdown')?.classList.toggle('open');
  document.getElementById('unavToolsDropdown')?.classList.remove('open');
}
function unavToggleTools() {
  document.getElementById('unavToolsDropdown')?.classList.toggle('open');
  document.getElementById('unavConnDropdown')?.classList.remove('open');
}
function unavDeconnect() {
  ['nutridoc_bilan','nutridoc_dieteticien','nutridoc_prescripteur'].forEach(k => localStorage.removeItem(k));
  window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', buildUniversalNav);
