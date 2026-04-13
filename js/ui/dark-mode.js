/**
 * dark-mode.js — NutriDoc · Gestionnaire de thème sombre
 * 
 * Fonctionnalités :
 * - Détection automatique du thème système
 * - Sauvegarde du choix utilisateur
 * - Bouton toggle avec icône animée visible
 * - Synchronisation entre onglets
 * - Styles CSS injectés automatiquement
 * 
 * Version: 2.0.0
 */

// ==================== CONFIGURATION ====================

const DARK_MODE_CONFIG = {
  storageKey: 'nutridoc_theme',
  systemPrefers: '(prefers-color-scheme: dark)',
  transitionDuration: 200
};

// ==================== STYLES CSS INJECTÉS ====================

function injectDarkModeStyles() {
  const style = document.createElement('style');
  style.id = 'dark-mode-styles';
  style.textContent = `
    /* ==================== VARIABLES THÈME CLAIR (défaut) ==================== */
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
      --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      --accent-green: #1D9E75;
      --accent-green-dark: #0f6e56;
      --accent-green-light: #5DCAA5;
      --accent-red: #ef4444;
      --accent-yellow: #f59e0b;
      --accent-blue: #3b82f6;
    }

    /* ==================== THÈME SOMBRE ==================== */
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
      --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
      --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
      --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
      --accent-green: #5DCAA5;
      --accent-green-dark: #1D9E75;
      --accent-green-light: #9FE1CB;
    }

    /* ==================== APPLICATION GLOBALE ==================== */
    * {
      transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
    }

    body {
      background-color: var(--bg-secondary);
      color: var(--text-primary);
    }

    /* Cartes et conteneurs */
    .card, .patient-card, .reco-card, .meal-block,
    .editeur-repas-block, .price-row, .support-widget,
    .step, .resultat, .form-col, .pricing-col {
      background-color: var(--bg-card);
      border-color: var(--border-light);
    }

    /* Formulaires et inputs */
    input, select, textarea, .calc-select, .chat-input {
      background-color: var(--bg-input);
      color: var(--text-primary);
      border-color: var(--border-light);
    }

    input:focus, select:focus, textarea:focus {
      border-color: var(--accent-green);
      outline: none;
    }

    /* Boutons */
    .btn-primary, .btn-validate, .btn-submit, .btn-next {
      background: var(--accent-green);
      color: white;
    }

    .btn-primary:hover, .btn-validate:hover, .btn-submit:hover, .btn-next:hover {
      background: var(--accent-green-dark);
    }

    .btn-back {
      background: var(--bg-tertiary);
      color: var(--text-primary);
      border-color: var(--border-light);
    }

    /* Navigation */
    .nd-header {
      background: var(--bg-primary);
      border-bottom-color: var(--border-light);
    }

    /* Chatbot */
    #nd-chat-window {
      background-color: var(--bg-card);
    }

    .chat-msg.bot .chat-bubble {
      background-color: var(--bg-tertiary);
      color: var(--text-primary);
    }

    /* Modales */
    .modal-content, .dossier-modal, .profil-modal {
      background-color: var(--bg-card);
    }

    /* Progress bar */
    .progress-bar {
      background-color: var(--bg-tertiary);
    }

    .progress-fill {
      background-color: var(--accent-green);
    }

    /* Scrollbar */
    ::-webkit-scrollbar-track {
      background: var(--bg-tertiary);
    }

    ::-webkit-scrollbar-thumb {
      background: var(--border-medium);
    }

    ::-webkit-scrollbar-thumb:hover {
      background: var(--accent-green);
    }
  `;
  
  if (!document.getElementById('dark-mode-styles')) {
    document.head.appendChild(style);
  }
}

// ==================== FONCTIONS PRINCIPALES ====================

/**
 * Détection du thème système
 */
function getSystemTheme() {
  return window.matchMedia(DARK_MODE_CONFIG.systemPrefers).matches ? 'dark' : 'light';
}

/**
 * Récupération du thème sauvegardé
 */
function getSavedTheme() {
  return localStorage.getItem(DARK_MODE_CONFIG.storageKey);
}

/**
 * Sauvegarde du thème
 */
function saveTheme(theme) {
  localStorage.setItem(DARK_MODE_CONFIG.storageKey, theme);
}

/**
 * Application du thème
 */
function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    // Auto : suivre le système
    const systemTheme = getSystemTheme();
    document.documentElement.setAttribute('data-theme', systemTheme);
  }
  
  // Mettre à jour l'icône du bouton
  updateThemeButtonIcon();
  
  // Émettre un événement pour les autres composants
  const event = new CustomEvent('themeChanged', {
    detail: { theme: getCurrentTheme() }
  });
  window.dispatchEvent(event);
}

/**
 * Récupération du thème actuel
 */
function getCurrentTheme() {
  const dataTheme = document.documentElement.getAttribute('data-theme');
  if (dataTheme === 'dark' || dataTheme === 'light') {
    return dataTheme;
  }
  return getSystemTheme();
}

/**
 * Changement de thème
 */
function setTheme(theme) {
  if (theme === 'auto') {
    saveTheme(null);
    applyTheme('auto');
  } else if (theme === 'dark' || theme === 'light') {
    saveTheme(theme);
    applyTheme(theme);
  }
}

/**
 * Bascule entre clair et sombre
 */
function toggleTheme() {
  const currentTheme = getCurrentTheme();
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
  
  // Animation du bouton
  const btn = document.getElementById('darkModeToggle');
  if (btn) {
    btn.classList.add('theme-animate');
    setTimeout(() => btn.classList.remove('theme-animate'), 300);
  }
}

// ==================== BOUTON FLOTTANT ====================

/**
 * Met à jour l'icône du bouton
 */
function updateThemeButtonIcon() {
  const btn = document.getElementById('darkModeToggle');
  if (!btn) return;
  
  const currentTheme = getCurrentTheme();
  const isDark = currentTheme === 'dark';
  
  btn.setAttribute('aria-label', isDark ? 'Passer en mode clair' : 'Passer en mode sombre');
  btn.setAttribute('title', isDark ? 'Mode clair' : 'Mode sombre');
  btn.innerHTML = isDark ? '☀️' : '🌙';
}

/**
 * Crée et ajoute le bouton flottant
 */
function createThemeButton() {
  // Vérifier si le bouton existe déjà
  if (document.getElementById('darkModeToggle')) return;
  
  const btn = document.createElement('button');
  btn.id = 'darkModeToggle';
  btn.setAttribute('aria-label', 'Changer de thème');
  btn.innerHTML = getCurrentTheme() === 'dark' ? '☀️' : '🌙';
  btn.onclick = toggleTheme;
  
  // Styles du bouton
  btn.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--accent-green, #1D9E75);
    color: white;
    border: none;
    cursor: pointer;
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: transform 0.2s ease, background 0.2s ease;
    font-family: system-ui, sans-serif;
  `;
  
  // Effet hover
  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'scale(1.1)';
  });
  
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'scale(1)';
  });
  
  document.body.appendChild(btn);
  
  // Ajuster la position si le chatbot est présent
  const chatbot = document.getElementById('nd-chat-fab');
  if (chatbot) {
    btn.style.bottom = '92px';
  }
  
  // Observer l'apparition du chatbot
  const observer = new MutationObserver(() => {
    const chatbotExists = document.getElementById('nd-chat-fab');
    if (chatbotExists) {
      btn.style.bottom = '92px';
    } else {
      btn.style.bottom = '24px';
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// ==================== SÉLECTEUR DÉROULANT (optionnel) ====================

/**
 * Crée un sélecteur de thème déroulant (pour les paramètres)
 */
function createThemeSelector(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const savedTheme = getSavedTheme() || 'auto';
  
  container.innerHTML = `
    <div class="theme-selector" style="
      display: flex;
      gap: 8px;
      background: var(--bg-card);
      border-radius: 999px;
      padding: 4px;
      border: 1px solid var(--border-light);
    ">
      <button class="theme-option ${savedTheme === 'light' ? 'active' : ''}" data-theme="light" style="
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        border-radius: 999px;
        background: ${savedTheme === 'light' ? 'var(--accent-green)' : 'transparent'};
        border: none;
        color: ${savedTheme === 'light' ? 'white' : 'var(--text-secondary)'};
        cursor: pointer;
        font-family: inherit;
        font-size: 14px;
        transition: all 0.2s ease;
      ">
        ☀️ <span>Clair</span>
      </button>
      <button class="theme-option ${savedTheme === 'dark' ? 'active' : ''}" data-theme="dark" style="
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        border-radius: 999px;
        background: ${savedTheme === 'dark' ? 'var(--accent-green)' : 'transparent'};
        border: none;
        color: ${savedTheme === 'dark' ? 'white' : 'var(--text-secondary)'};
        cursor: pointer;
        font-family: inherit;
        font-size: 14px;
        transition: all 0.2s ease;
      ">
        🌙 <span>Sombre</span>
      </button>
      <button class="theme-option ${savedTheme === 'auto' ? 'active' : ''}" data-theme="auto" style="
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        border-radius: 999px;
        background: ${savedTheme === 'auto' ? 'var(--accent-green)' : 'transparent'};
        border: none;
        color: ${savedTheme === 'auto' ? 'white' : 'var(--text-secondary)'};
        cursor: pointer;
        font-family: inherit;
        font-size: 14px;
        transition: all 0.2s ease;
      ">
        🖥️ <span>Auto</span>
      </button>
    </div>
  `;
  
  container.querySelectorAll('.theme-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      setTheme(theme === 'auto' ? 'auto' : theme);
      
      // Mettre à jour les classes actives
      container.querySelectorAll('.theme-option').forEach(b => {
        b.style.background = 'transparent';
        b.style.color = 'var(--text-secondary)';
      });
      btn.style.background = 'var(--accent-green)';
      btn.style.color = 'white';
      
      // Mettre à jour le bouton flottant
      updateThemeButtonIcon();
    });
  });
}

// ==================== INITIALISATION ====================

/**
 * Écoute les changements de thème système
 */
function listenToSystemTheme() {
  window.matchMedia(DARK_MODE_CONFIG.systemPrefers).addEventListener('change', (e) => {
    const savedTheme = getSavedTheme();
    if (!savedTheme || savedTheme === 'auto') {
      applyTheme('auto');
    }
  });
}

/**
 * Synchronise le thème entre onglets
 */
function syncThemeAcrossTabs() {
  window.addEventListener('storage', (e) => {
    if (e.key === DARK_MODE_CONFIG.storageKey) {
      const newTheme = e.newValue;
      if (newTheme) {
        applyTheme(newTheme);
      } else {
        applyTheme('auto');
      }
    }
  });
}

/**
 * Initialisation complète
 */
function initDarkMode() {
  console.log('[DarkMode] Initialisation...');
  
  // Injecter les styles CSS
  injectDarkModeStyles();
  
  // Charger le thème sauvegardé
  const savedTheme = getSavedTheme();
  if (savedTheme) {
    applyTheme(savedTheme);
  } else {
    applyTheme('auto');
  }
  
  // Créer le bouton flottant
  createThemeButton();
  
  // Écouter les changements système
  listenToSystemTheme();
  
  // Synchroniser entre onglets
  syncThemeAcrossTabs();
  
  // Créer le sélecteur si un conteneur existe
  if (document.getElementById('theme-selector-container')) {
    createThemeSelector('theme-selector-container');
  }
  
  console.log('[DarkMode] Initialisé avec succès, thème actuel:', getCurrentTheme());
}

// ==================== DÉMARRAGE ====================

// Démarrer l'initialisation après le chargement du DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDarkMode);
} else {
  initDarkMode();
}

// ==================== EXPORTS GLOBAUX ====================

window.initDarkMode = initDarkMode;
window.setTheme = setTheme;
window.toggleTheme = toggleTheme;
window.getCurrentTheme = getCurrentTheme;
window.createThemeSelector = createThemeSelector;

console.log('[dark-mode.js] ✅ Chargé avec succès');