// auth.js - NutriDoc
const MODE_SUPA = false;
async function getCurrentUser() { return null; }
async function deconnecter() { localStorage.clear(); window.location.href = 'index.html'; }
window.getCurrentUser = getCurrentUser;
window.deconnecter = deconnecter;
