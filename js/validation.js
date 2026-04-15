// validation.js - NutriDoc
function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function isValidRPPS(rpps) { return /^\d{11}$/.test(String(rpps).replace(/\D/g, '')); }
window.isValidEmail = isValidEmail;
window.isValidRPPS = isValidRPPS;
