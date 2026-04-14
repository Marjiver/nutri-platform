/**
 * theme-selector.js — NutriDoc · Sélecteur de thème (clair/sombre/auto)
 * 
 * Fonctionnalités :
 * - BOUTON DANS LE HEADER (intégré à la navigation)
 * - Détection automatique du thème système
 * - Sauvegarde du choix utilisateur dans localStorage
 * - Menu déroulant de sélection (3 options)
 * - Synchronisation entre onglets
 * - Transition fluide entre les thèmes
 * 
 * Version: 2.1.0
 */

// ==================== CONFIGURATION ====================

const THEME_CONFIG = {
  storageKey: 'nutridoc_theme',
  systemPrefers: '(prefers-color-scheme: dark)',
  transitionDuration: 200,
  themes: {
    light: { name: 'Clair', icon: '☀️', value: 'light' },
    dark: { name: 'Sombre', icon: '🌙', value: 'dark' },
    auto: { name: 'Auto', icon: '🖥️', value: 'auto' }
  }
};

// ==================== ÉTAT GLOBAL ====================

let currentTheme = 'auto';
let themeChangeListeners = [];

// ==================== FONCTIONS PRINCIPALES ====================

/**
 * Détection du thème système
 * @returns {string} 'dark' ou 'light'
 */
function getSystemTheme() {
  return window.matchMedia(THEME_CONFIG.systemPrefers).matches ? 'dark' : 'light';
}

/**
 * Récupération du thème sauvegardé
 * @returns {string|null} 'light', 'dark', 'auto' ou null
 */
function getSavedTheme() {
  try {
    return localStorage.getItem(THEME_CONFIG.storageKey);
  } catch (e) {
    console.warn('[ThemeSelector] Erreur lecture localStorage:', e);
    return null;
  }
}

/**
 * Sauvegarde du thème
 * @param {string} theme - 'light', 'dark' ou 'auto'
 */
function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_CONFIG.storageKey, theme);
    broadcastThemeChange(theme);
  } catch (e) {
    console.warn('[ThemeSelector] Erreur sauvegarde localStorage:', e);
  }
}

/**
 * Application du thème sur la page
 * @param {string} theme - 'light', 'dark' ou 'auto'
 */
function applyTheme(theme) {
  let effectiveTheme = theme;
  
  if (theme === 'auto') {
    effectiveTheme = getSystemTheme();
  }
  
  // Appliquer l'attribut data-theme
  document.documentElement.setAttribute('data-theme', effectiveTheme);
  
  // Mettre à jour la variable globale
  currentTheme = theme;
  
  // Mettre à jour l'icône du bouton dans le header
  updateThemeButtonIcon();
  
  // Notifier les listeners
  notifyThemeListeners(effectiveTheme);
  
  // Déclencher un événement personnalisé
  const event = new CustomEvent('themeChanged', {
    detail: { theme: effectiveTheme, userPreference: theme }
  });
  window.dispatchEvent(event);
  
  console.log('[ThemeSelector] Thème appliqué:', effectiveTheme, '(préférence:', theme, ')');
}

/**
 * Changement de thème
 * @param {string} theme - 'light', 'dark' ou 'auto'
 */
function setTheme(theme) {
  if (!THEME_CONFIG.themes[theme]) {
    console.warn('[ThemeSelector] Thème invalide:', theme);
    return;
  }
  
  saveTheme(theme);
  applyTheme(theme);
}

/**
 * Bascule entre clair et sombre (ignorant le mode auto)
 */
function toggleTheme() {
  const currentEffective = getCurrentEffectiveTheme();
  const newTheme = currentEffective === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
  
  // Animation du bouton
  animateThemeButton();
}

/**
 * Récupère le thème actuellement effectif
 * @returns {string} 'dark' ou 'light'
 */
function getCurrentEffectiveTheme() {
  const saved = getSavedTheme();
  if (saved === 'light') return 'light';
  if (saved === 'dark') return 'dark';
  return getSystemTheme();
}

/**
 * Récupère la préférence utilisateur
 * @returns {string} 'light', 'dark' ou 'auto'
 */
function getUserThemePreference() {
  const saved = getSavedTheme();
  if (saved === 'light' || saved === 'dark') return saved;
  return 'auto';
}

// ==================== LISTENERS & SYNCHRONISATION ====================

/**
 * Ajoute un listener pour les changements de thème
 * @param {Function} listener - Fonction callback
 */
function addThemeListener(listener) {
  if (typeof listener === 'function') {
    themeChangeListeners.push(listener);
  }
}

/**
 * Notifie tous les listeners du changement de thème
 * @param {string} effectiveTheme - Thème effectif ('dark' ou 'light')
 */
function notifyThemeListeners(effectiveTheme) {
  themeChangeListeners.forEach(listener => {
    try {
      listener(effectiveTheme);
    } catch (e) {
      console.warn('[ThemeSelector] Erreur listener:', e);
    }
  });
}

/**
 * Diffuse le changement de thème aux autres onglets
 * @param {string} theme - Thème sélectionné
 */
function broadcastThemeChange(theme) {
  try {
    localStorage.setItem(THEME_CONFIG.storageKey + '_timestamp', Date.now().toString());
  } catch (e) {
    // Ignorer les erreurs de localStorage
  }
}

/**
 * Écoute les changements de thème dans les autres onglets
 */
function listenToOtherTabs() {
  window.addEventListener('storage', (e) => {
    if (e.key === THEME_CONFIG.storageKey) {
      const newTheme = e.newValue;
      if (newTheme && newTheme !== currentTheme) {
        applyTheme(newTheme);
      }
    }
  });
}

/**
 * Écoute les changements de thème système
 */
function listenToSystemTheme() {
  window.matchMedia(THEME_CONFIG.systemPrefers).addEventListener('change', (e) => {
    const savedTheme = getSavedTheme();
    if (savedTheme === 'auto' || !savedTheme) {
      applyTheme('auto');
    }
  });
}

// ==================== BOUTON DANS LE HEADER ====================

let themeButton = null;
let themeDropdown = null;

/**
 * Crée le bouton de thème dans le header
 * @param {string} containerId - ID du conteneur où ajouter le bouton (optionnel)
 */
function createThemeButtonInHeader(containerId = null) {
  // Si un conteneur est spécifié, l'utiliser
  if (containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      renderThemeSelectorInContainer(container);
      return;
    }
  }
  
  // Sinon, chercher un emplacement dans le header
  const headerActions = document.querySelector('.header-actions, .unav-right, .nd-header .header-actions');
  if (headerActions) {
    renderThemeSelectorInContainer(headerActions);
    return;
  }
  
  // Si aucun header trouvé, créer un conteneur dans le body
  const existingContainer = document.getElementById('theme-selector-container');
  if (existingContainer) {
    renderThemeSelectorInContainer(existingContainer);
  } else {
    const container = document.createElement('div');
    container.id = 'theme-selector-container';
    container.style.cssText = 'display: inline-block; margin-left: 0.5rem;';
    const headerRight = document.querySelector('.header-actions, .unav-right');
    if (headerRight) {
      headerRight.appendChild(container);
    } else {
      document.body.appendChild(container);
    }
    renderThemeSelectorInContainer(container);
  }
}

/**
 * Rend le sélecteur de thème dans un conteneur
 * @param {HTMLElement} container - Conteneur parent
 */
function renderThemeSelectorInContainer(container) {
  const userTheme = getUserThemePreference();
  const currentEffective = getCurrentEffectiveTheme();
  
  // Style du conteneur
  container.style.display = 'inline-flex';
  container.style.alignItems = 'center';
  
  // Créer le HTML du sélecteur
  container.innerHTML = `
    <div class="theme-selector-header" style="position: relative; display: inline-block;">
      <button class="theme-toggle-btn" id="themeToggleBtn" style="
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 999px;
        padding: 6px 12px;
        cursor: pointer;
        font-family: inherit;
        font-size: 0.85rem;
        color: #fff;
        transition: all 0.2s ease;
      ">
        <span id="themeToggleIcon">${currentEffective === 'dark' ? '🌙' : '☀️'}</span>
        <span id="themeToggleLabel">${THEME_CONFIG.themes[userTheme]?.name || 'Auto'}</span>
        <span style="font-size: 10px; margin-left: 4px;">▼</span>
      </button>
      
      <div class="theme-dropdown" id="themeDropdown" style="
        position: absolute;
        top: 100%;
        right: 0;
        margin-top: 8px;
        background: var(--bg-card, #1a221f);
        border: 1px solid var(--border-light, #2a3430);
        border-radius: 12px;
        min-width: 160px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        overflow: hidden;
        z-index: 1000;
        opacity: 0;
        visibility: hidden;
        transform: translateY(-8px);
        transition: all 0.2s ease;
      ">
        <div class="theme-option ${userTheme === 'light' ? 'active' : ''}" data-theme="light" style="
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          cursor: pointer;
          transition: background 0.2s;
          color: var(--text-primary, #e5e7eb);
          font-size: 0.85rem;
        ">
          <span>☀️</span>
          <span style="flex: 1;">Clair</span>
          <span class="check-mark" style="color: #1D9E75; ${userTheme === 'light' ? 'opacity: 1;' : 'opacity: 0;'}">✓</span>
        </div>
        <div class="theme-option ${userTheme === 'dark' ? 'active' : ''}" data-theme="dark" style="
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          cursor: pointer;
          transition: background 0.2s;
          color: var(--text-primary, #e5e7eb);
          font-size: 0.85rem;
        ">
          <span>🌙</span>
          <span style="flex: 1;">Sombre</span>
          <span class="check-mark" style="color: #1D9E75; ${userTheme === 'dark' ? 'opacity: 1;' : 'opacity: 0;'}">✓</span>
        </div>
        <div class="theme-option ${userTheme === 'auto' ? 'active' : ''}" data-theme="auto" style="
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          cursor: pointer;
          transition: background 0.2s;
          color: var(--text-primary, #e5e7eb);
          font-size: 0.85rem;
          border-top: 1px solid var(--border-light, #2a3430);
        ">
          <span>🖥️</span>
          <span style="flex: 1;">Auto (système)</span>
          <span class="check-mark" style="color: #1D9E75; ${userTheme === 'auto' ? 'opacity: 1;' : 'opacity: 0;'}">✓</span>
        </div>
      </div>
    </div>
  `;
  
  // Attacher les événements
  attachDropdownEvents(container);
}

/**
 * Attache les événements du dropdown
 * @param {HTMLElement} container - Conteneur du sélecteur
 */
function attachDropdownEvents(container) {
  const toggleBtn = container.querySelector('#themeToggleBtn');
  const dropdown = container.querySelector('#themeDropdown');
  const options = container.querySelectorAll('.theme-option');
  
  if (!toggleBtn || !dropdown) return;
  
  // Ouverture/fermeture du dropdown
  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdown.style.visibility === 'visible';
    dropdown.style.visibility = isOpen ? 'hidden' : 'visible';
    dropdown.style.opacity = isOpen ? '0' : '1';
    dropdown.style.transform = isOpen ? 'translateY(-8px)' : 'translateY(0)';
  });
  
  // Fermeture au clic extérieur
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      dropdown.style.visibility = 'hidden';
      dropdown.style.opacity = '0';
      dropdown.style.transform = 'translateY(-8px)';
    }
  });
  
  // Sélection d'une option
  options.forEach(option => {
    option.addEventListener('click', () => {
      const theme = option.dataset.theme;
      if (theme) {
        setTheme(theme);
        
        // Mettre à jour l'affichage du bouton
        const iconSpan = document.getElementById('themeToggleIcon');
        const labelSpan = document.getElementById('themeToggleLabel');
        const currentEffective = getCurrentEffectiveTheme();
        
        if (iconSpan) iconSpan.textContent = currentEffective === 'dark' ? '🌙' : '☀️';
        if (labelSpan) labelSpan.textContent = THEME_CONFIG.themes[theme]?.name || 'Auto';
        
        // Mettre à jour les checkmarks
        options.forEach(opt => {
          const check = opt.querySelector('.check-mark');
          if (check) check.style.opacity = '0';
        });
        const check = option.querySelector('.check-mark');
        if (check) check.style.opacity = '1';
        
        // Fermer le dropdown
        dropdown.style.visibility = 'hidden';
        dropdown.style.opacity = '0';
        dropdown.style.transform = 'translateY(-8px)';
      }
    });
  });
}

/**
 * Met à jour l'icône du bouton dans le header
 */
function updateThemeButtonIcon() {
  const currentEffective = getCurrentEffectiveTheme();
  const iconSpan = document.getElementById('themeToggleIcon');
  if (iconSpan) {
    iconSpan.textContent = currentEffective === 'dark' ? '🌙' : '☀️';
  }
}

/**
 * Animation du bouton au clic
 */
function animateThemeButton() {
  const btn = document.getElementById('themeToggleBtn');
  if (btn) {
    btn.style.transform = 'scale(0.95)';
    setTimeout(() => {
      btn.style.transform = 'scale(1)';
    }, 150);
  }
}

// ==================== SÉLECTEUR DÉROULANT POUR PARAMÈTRES ====================

/**
 * Crée un sélecteur de thème pour la page des paramètres
 * @param {string} containerId - ID du conteneur
 */
function createThemeSelector(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const userTheme = getUserThemePreference();
  const currentEffective = getCurrentEffectiveTheme();
  
  container.innerHTML = `
    <div class="theme-settings-selector" style="
      background: var(--bg-card, #fff);
      border-radius: 16px;
      padding: 1.5rem;
      border: 1px solid var(--border-light, #e8edeb);
    ">
      <h3 style="font-size: 1rem; margin-bottom: 1rem;">Apparence</h3>
      <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
        <button class="settings-theme-btn ${userTheme === 'light' ? 'active' : ''}" data-theme="light" style="
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: ${userTheme === 'light' ? '#1D9E75' : 'transparent'};
          border: 2px solid ${userTheme === 'light' ? '#1D9E75' : 'var(--border-light, #e8edeb)'};
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          color: ${userTheme === 'light' ? '#fff' : 'var(--text-primary, #0d2018)'};
        ">
          <span style="font-size: 1.5rem;">☀️</span>
          <span style="font-size: 0.85rem; font-weight: 500;">Clair</span>
        </button>
        <button class="settings-theme-btn ${userTheme === 'dark' ? 'active' : ''}" data-theme="dark" style="
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: ${userTheme === 'dark' ? '#1D9E75' : 'transparent'};
          border: 2px solid ${userTheme === 'dark' ? '#1D9E75' : 'var(--border-light, #e8edeb)'};
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          color: ${userTheme === 'dark' ? '#fff' : 'var(--text-primary, #0d2018)'};
        ">
          <span style="font-size: 1.5rem;">🌙</span>
          <span style="font-size: 0.85rem; font-weight: 500;">Sombre</span>
        </button>
        <button class="settings-theme-btn ${userTheme === 'auto' ? 'active' : ''}" data-theme="auto" style="
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: ${userTheme === 'auto' ? '#1D9E75' : 'transparent'};
          border: 2px solid ${userTheme === 'auto' ? '#1D9E75' : 'var(--border-light, #e8edeb)'};
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          color: ${userTheme === 'auto' ? '#fff' : 'var(--text-primary, #0d2018)'};
        ">
          <span style="font-size: 1.5rem;">🖥️</span>
          <span style="font-size: 0.85rem; font-weight: 500;">Auto</span>
        </button>
      </div>
      <p style="font-size: 0.75rem; color: var(--text-secondary, #6b7b74); margin-top: 1rem;">
        ${userTheme === 'auto' ? '🖥️ Le thème suit automatiquement vos préférences système.' : (userTheme === 'dark' ? '🌙 Mode sombre activé.' : '☀️ Mode clair activé.')}
      </p>
    </div>
  `;
  
  // Attacher les événements
  container.querySelectorAll('.settings-theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      setTheme(theme);
      
      // Mettre à jour les styles actifs
      container.querySelectorAll('.settings-theme-btn').forEach(b => {
        b.style.background = 'transparent';
        b.style.color = 'var(--text-primary, #0d2018)';
        b.style.borderColor = 'var(--border-light, #e8edeb)';
      });
      btn.style.background = '#1D9E75';
      btn.style.color = '#fff';
      btn.style.borderColor = '#1D9E75';
      
      // Mettre à jour le texte
      const msg = container.querySelector('p');
      if (msg) {
        if (theme === 'auto') msg.innerHTML = '🖥️ Le thème suit automatiquement vos préférences système.';
        else if (theme === 'dark') msg.innerHTML = '🌙 Mode sombre activé.';
        else msg.innerHTML = '☀️ Mode clair activé.';
      }
      
      // Mettre à jour le bouton du header
      updateThemeButtonIcon();
    });
  });
}

// ==================== INITIALISATION ====================

/**
 * Initialisation complète du système de thème
 * @param {string} headerButtonContainerId - ID du conteneur pour le bouton (optionnel)
 */
function initThemeSelector(headerButtonContainerId = null) {
  console.log('[ThemeSelector] Initialisation...');
  
  // Appliquer le thème sauvegardé
  const savedTheme = getSavedTheme();
  if (savedTheme) {
    applyTheme(savedTheme);
  } else {
    applyTheme('auto');
  }
  
  // Créer le bouton dans le header
  createThemeButtonInHeader(headerButtonContainerId);
  
  // Écouter les changements système
  listenToSystemTheme();
  
  // Écouter les autres onglets
  listenToOtherTabs();
  
  console.log('[ThemeSelector] Initialisé avec succès, thème:', getCurrentEffectiveTheme());
}

// ==================== EXPORTS GLOBAUX ====================

window.themeSelector = {
  init: initThemeSelector,
  setTheme: setTheme,
  toggleTheme: toggleTheme,
  getCurrentTheme: getCurrentEffectiveTheme,
  getUserPreference: getUserThemePreference,
  addListener: addThemeListener,
  createSelector: createThemeSelector,
  createButtonInHeader: createThemeButtonInHeader
};

// Pour compatibilité avec l'ancien dark-mode.js
window.setTheme = setTheme;
window.toggleTheme = toggleTheme;
window.getCurrentTheme = getCurrentEffectiveTheme;
window.createThemeSelector = createThemeSelector;

// Auto-initialisation
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initThemeSelector());
} else {
  initThemeSelector();
}

console.log('[theme-selector.js] ✅ Chargé avec succès - Bouton intégré dans le header');