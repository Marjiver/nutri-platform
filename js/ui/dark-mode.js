/**
 * dark-mode.js — NutriDoc · Gestionnaire de thème sombre
 *
 * Fonctionnalités :
 * - Toggle injecté dans .header-actions (header sombre NutriDoc)
 * - Fallback : bouton flottant si pas de header trouvé
 * - Détection automatique du thème système
 * - Sauvegarde localStorage
 * - Synchronisation entre onglets
 *
 * Version: 2.1.0 — 2026-04-14
 * Corrections : injection header, suppression ton-sur-ton, nd-header toujours sombre
 */

// ==================== CONFIGURATION ====================

const DARK_MODE_CONFIG = {
  storageKey: 'nutridoc_theme',
  systemPrefers: '(prefers-color-scheme: dark)',
};

// ==================== STYLES CSS INJECTÉS ====================

function injectDarkModeStyles() {
  if (document.getElementById('dark-mode-styles')) return;

  const style = document.createElement('style');
  style.id = 'dark-mode-styles';
  style.textContent = `
    :root {
      --bg-primary: #ffffff;
      --bg-secondary: #f7f9f7;
      --bg-tertiary: #eef4ee;
      --bg-card: #ffffff;
      --bg-input: #ffffff;
      --bg-hover: #f0f2f0;
      --text-primary: #0d2018;
      --text-secondary: #6b7b74;
      --text-tertiary: #9ca3af;
      --text-inverse: #ffffff;
      --border-light: #e8edeb;
      --border-medium: #d1d5db;
      --shadow-sm: 0 1px 2px rgba(0,0,0,.05);
      --shadow-md: 0 4px 6px rgba(0,0,0,.1);
      --shadow-lg: 0 10px 15px rgba(0,0,0,.1);
      --accent-green: #1D9E75;
      --accent-green-dark: #0f6e56;
      --accent-green-light: #5DCAA5;
      --accent-red: #ef4444;
      --accent-yellow: #f59e0b;
      --accent-blue: #3b82f6;
    }

    [data-theme="dark"] {
      --bg-primary: #0a0f0d;
      --bg-secondary: #111816;
      --bg-tertiary: #1a221f;
      --bg-card: #141c19;
      --bg-input: #1a221f;
      --bg-hover: #1f2a26;
      --text-primary: #e5e7eb;
      --text-secondary: #9ca3af;
      --text-tertiary: #6b7280;
      --text-inverse: #0d2018;
      --border-light: #2a3430;
      --border-medium: #374151;
      --shadow-sm: 0 1px 2px rgba(0,0,0,.3);
      --shadow-md: 0 4px 6px rgba(0,0,0,.4);
      --shadow-lg: 0 10px 15px rgba(0,0,0,.4);
      --accent-green: #5DCAA5;
      --accent-green-dark: #1D9E75;
      --accent-green-light: #9FE1CB;
    }

    * { transition: background-color .2s ease, border-color .2s ease, color .2s ease; }

    body { background-color: var(--bg-secondary); color: var(--text-primary); }

    /* Le header NutriDoc reste TOUJOURS sombre (couleur de marque) */
    .nd-header { background: #0d2018 !important; border-bottom-color: rgba(29,158,117,.2) !important; }

    .card, .patient-card, .reco-card, .meal-block,
    .price-row, .support-widget, .step, .resultat,
    .form-col, .pricing-col { background-color: var(--bg-card); border-color: var(--border-light); }

    input, select, textarea {
      background-color: var(--bg-input); color: var(--text-primary); border-color: var(--border-light);
    }
    input:focus, select:focus, textarea:focus { border-color: var(--accent-green); outline: none; }

    .btn-back { background: var(--bg-tertiary); color: var(--text-primary); border-color: var(--border-light); }

    #nd-chat-window { background-color: var(--bg-card); }
    .chat-msg.bot .chat-bubble { background-color: var(--bg-tertiary); color: var(--text-primary); }
    .modal-content, .dossier-modal, .profil-modal { background-color: var(--bg-card); }
    .progress-bar { background-color: var(--bg-tertiary); }
    .progress-fill { background-color: var(--accent-green); }
    ::-webkit-scrollbar-track { background: var(--bg-tertiary); }
    ::-webkit-scrollbar-thumb { background: var(--border-medium); }
    ::-webkit-scrollbar-thumb:hover { background: var(--accent-green); }

    /* Toggle dans le header */
    #darkModeToggle {
      display: inline-flex; align-items: center; gap: 5px;
      background: rgba(255,255,255,.14);
      border: 1px solid rgba(255,255,255,.18);
      border-radius: 999px;
      padding: 0.35rem 0.85rem;
      color: rgba(255,255,255,.92);
      font-size: 0.75rem;
      font-family: 'Outfit', sans-serif;
      cursor: pointer;
      transition: background .2s, color .2s;
      white-space: nowrap;
    }
    #darkModeToggle:hover {
      background: rgba(255,255,255,.15);
      color: #fff;
    }

    /* Bouton flottant (fallback si pas de header) */
    #darkModeToggle.floating {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 48px;
      height: 48px;
      padding: 0;
      border-radius: 50%;
      background: var(--accent-green, #1D9E75) !important;
      border-color: transparent !important;
      color: white !important;
      font-size: 20px;
      justify-content: center;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0,0,0,.2);
    }
    #darkModeToggle.floating:hover { transform: scale(1.1); }
  `;
  document.head.appendChild(style);
}

// ==================== FONCTIONS PRINCIPALES ====================

function getSystemTheme() {
  return window.matchMedia(DARK_MODE_CONFIG.systemPrefers).matches ? 'dark' : 'light';
}

function getSavedTheme() {
  try { return localStorage.getItem(DARK_MODE_CONFIG.storageKey); } catch { return null; }
}

function saveTheme(theme) {
  try { localStorage.setItem(DARK_MODE_CONFIG.storageKey, theme); } catch {}
}

function getCurrentTheme() {
  const t = document.documentElement.getAttribute('data-theme');
  return (t === 'dark' || t === 'light') ? t : getSystemTheme();
}

function applyTheme(theme) {
  const effective = (theme === 'auto' || !theme) ? getSystemTheme() : theme;
  document.documentElement.setAttribute('data-theme', effective);
  updateThemeButtonIcon();
  window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: effective } }));
}

function setTheme(theme) {
  if (theme === 'auto') { saveTheme(null); applyTheme('auto'); }
  else if (theme === 'dark' || theme === 'light') { saveTheme(theme); applyTheme(theme); }
}

function toggleTheme() {
  setTheme(getCurrentTheme() === 'dark' ? 'light' : 'dark');
}

// ==================== BOUTON TOGGLE ====================

function updateThemeButtonIcon() {
  const btn = document.getElementById('darkModeToggle');
  if (!btn) return;
  const isDark = getCurrentTheme() === 'dark';
  if (btn.classList.contains('floating')) {
    btn.innerHTML = isDark ? '☀️' : '🌙';
    btn.title = isDark ? 'Mode clair' : 'Mode sombre';
  } else {
    btn.innerHTML = isDark ? '☀️ Clair' : '🌙 Sombre';
    btn.title = isDark ? 'Passer en mode clair' : 'Passer en mode sombre';
  }
}

function createThemeButton() {
  if (document.getElementById('darkModeToggle')) return;

  const btn = document.createElement('button');
  btn.id = 'darkModeToggle';
  btn.onclick = toggleTheme;
  btn.setAttribute('aria-label', 'Changer de thème');

  // Chercher le header-actions (header toujours sombre → pas de ton-sur-ton)
  const headerActions = document.querySelector(
    '.nd-header .header-actions, .header-actions, .unav-right'
  );

  if (headerActions) {
    // Mode inline dans le header
    headerActions.insertBefore(btn, headerActions.firstChild);
  } else {
    // Fallback : bouton flottant
    btn.classList.add('floating');
    document.body.appendChild(btn);

    // Décaler si chatbot présent
    const adjustForChatbot = () => {
      btn.style.bottom = document.getElementById('nd-chat-fab') ? '92px' : '24px';
    };
    adjustForChatbot();
    new MutationObserver(adjustForChatbot).observe(document.body, { childList: true, subtree: true });
  }

  updateThemeButtonIcon();
}

// ==================== SÉLECTEUR ÉTENDU (pages profil/paramètres) ====================

/**
 * Crée un sélecteur 3 boutons (Clair / Sombre / Auto) dans un conteneur dédié.
 * À appeler explicitement depuis les pages de profil.
 */
function createThemeSelector(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const saved = getSavedTheme() || 'auto';

  const makeBtn = (theme, icon, label) => {
    const active = saved === theme;
    return `
      <button class="theme-option ${active ? 'active' : ''}" data-theme="${theme}" style="
        display:flex; align-items:center; gap:6px;
        padding:8px 16px; border-radius:999px; border:none;
        background:${active ? 'var(--accent-green)' : 'transparent'};
        color:${active ? 'white' : 'var(--text-secondary)'};
        cursor:pointer; font-family:inherit; font-size:14px;
        transition:all .2s ease;">
        ${icon} <span>${label}</span>
      </button>`;
  };

  container.innerHTML = `
    <div style="display:flex;gap:4px;background:var(--bg-card);border:1px solid var(--border-light);border-radius:999px;padding:4px;">
      ${makeBtn('light', '☀️', 'Clair')}
      ${makeBtn('dark',  '🌙', 'Sombre')}
      ${makeBtn('auto',  '🖥️', 'Auto')}
    </div>`;

  container.querySelectorAll('.theme-option').forEach(b => {
    b.addEventListener('click', () => {
      setTheme(b.dataset.theme);
      container.querySelectorAll('.theme-option').forEach(x => {
        x.style.background = 'transparent';
        x.style.color = 'var(--text-secondary)';
        x.classList.remove('active');
      });
      b.style.background = 'var(--accent-green)';
      b.style.color = 'white';
      b.classList.add('active');
    });
  });
}

// ==================== INITIALISATION ====================

function initDarkMode() {
  injectDarkModeStyles();
  applyTheme(getSavedTheme() || 'auto');
  createThemeButton();

  // Écouter les changements système
  window.matchMedia(DARK_MODE_CONFIG.systemPrefers).addEventListener('change', () => {
    if (!getSavedTheme()) applyTheme('auto');
  });

  // Synchroniser entre onglets
  window.addEventListener('storage', e => {
    if (e.key === DARK_MODE_CONFIG.storageKey) applyTheme(e.newValue || 'auto');
  });

  // NE PAS auto-injecter dans theme-selector-container
  // (appeler createThemeSelector('id') explicitement depuis les pages profil)
}

// Démarrer après DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDarkMode);
} else {
  initDarkMode();
}

// ==================== EXPORTS ====================
window.initDarkMode     = initDarkMode;
window.setTheme         = setTheme;
window.toggleTheme      = toggleTheme;
window.getCurrentTheme  = getCurrentTheme;
window.createThemeSelector = createThemeSelector;

console.log('[dark-mode.js] v2.1.0 charge');
