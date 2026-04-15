/**
 * dark-mode.js - NutriDoc
 * Gestion du mode sombre
 */
function initDarkMode() {
  const saved = localStorage.getItem('nutridoc_theme');
  if (saved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else if (saved === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }
}
window.initDarkMode = initDarkMode;
document.addEventListener('DOMContentLoaded', initDarkMode);
