/**
 * validation.js — NutriDoc · Fonctions de validation réutilisables
 * 
 * Version: 1.0.0
 * Dernière mise à jour: 2025-01-15
 */

// ==================== EMAIL ====================

/**
 * Vérifie si un email est valide
 * @param {string} email - L'email à vérifier
 * @returns {boolean} true si valide
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email.trim());
}

// ==================== TÉLÉPHONE ====================

/**
 * Vérifie si un numéro de téléphone français est valide
 * @param {string} phone - Le numéro à vérifier
 * @returns {boolean} true si valide
 */
function isValidPhone(phone) {
  if (!phone) return true; // Optionnel
  const cleaned = phone.replace(/\s/g, '');
  const regex = /^(?:(?:\+|00)33|0)[1-9](?:\d{2}){4}$/;
  return regex.test(cleaned);
}

/**
 * Formate un numéro de téléphone français
 * @param {string} phone - Le numéro à formater
 * @returns {string} Numéro formaté (ex: 06 12 34 56 78)
 */
function formatPhone(phone) {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length !== 10) return phone;
  return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
}

// ==================== RPPS ====================

/**
 * Vérifie si un numéro RPPS est valide (11 chiffres)
 * @param {string|number} rpps - Le numéro RPPS à vérifier
 * @returns {boolean} true si valide
 */
function isValidRPPS(rpps) {
  if (!rpps) return false;
  const raw = String(rpps).replace(/\D/g, '');
  return raw.length === 11;
}

/**
 * Formate un numéro RPPS (XX XXX XXX XXX)
 * @param {string|number} rpps - Le numéro RPPS à formater
 * @returns {string} RPPS formaté
 */
function formatRPPS(rpps) {
  const raw = String(rpps).replace(/\D/g, '').slice(0, 11);
  if (raw.length <= 2) return raw;
  if (raw.length <= 5) return raw.slice(0, 2) + ' ' + raw.slice(2);
  if (raw.length <= 8) return raw.slice(0, 2) + ' ' + raw.slice(2, 5) + ' ' + raw.slice(5);
  return raw.slice(0, 2) + ' ' + raw.slice(2, 5) + ' ' + raw.slice(5, 8) + ' ' + raw.slice(8);
}

// ==================== SIRET ====================

/**
 * Algorithme de Luhn pour validation SIRET
 * @param {string} digits - Les chiffres à valider
 * @returns {boolean} true si valide
 */
function luhnCheck(digits) {
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits.charAt(i), 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n = (n % 10) + 1;
    }
    sum += n;
    alternate = !alternate;
  }
  return (sum % 10) === 0;
}

/**
 * Vérifie si un numéro SIRET est valide (14 chiffres + Luhn)
 * @param {string|number} siret - Le numéro SIRET à vérifier
 * @returns {boolean} true si valide
 */
function isValidSIRET(siret) {
  if (!siret) return false;
  const raw = String(siret).replace(/\D/g, '');
  if (raw.length !== 14) return false;
  return luhnCheck(raw);
}

/**
 * Formate un numéro SIRET (XXX XXX XXX XXXXX)
 * @param {string|number} siret - Le numéro SIRET à formater
 * @returns {string} SIRET formaté
 */
function formatSIRET(siret) {
  const raw = String(siret).replace(/\D/g, '').slice(0, 14);
  if (raw.length <= 3) return raw;
  if (raw.length <= 6) return raw.slice(0, 3) + ' ' + raw.slice(3);
  if (raw.length <= 9) return raw.slice(0, 3) + ' ' + raw.slice(3, 6) + ' ' + raw.slice(6);
  return raw.slice(0, 3) + ' ' + raw.slice(3, 6) + ' ' + raw.slice(6, 9) + ' ' + raw.slice(9);
}

// ==================== MOT DE PASSE ====================

/**
 * Vérifie si un mot de passe est fort
 * Critères: min 8 caractères, majuscule, minuscule, chiffre, spécial
 * @param {string} password - Le mot de passe à vérifier
 * @param {number} minLength - Longueur minimale (défaut: 8)
 * @returns {boolean} true si le mot de passe est fort
 */
function isStrongPassword(password, minLength = 8) {
  if (!password || password.length < minLength) return false;
  let score = 0;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score >= 3; // Au moins 3 critères sur 4
}

/**
 * Évalue la force d'un mot de passe
 * @param {string} password - Le mot de passe à évaluer
 * @returns {Object} { score, label, color, message }
 */
function getPasswordStrength(password) {
  if (!password || password.length === 0) {
    return { score: 0, label: '', color: '', message: 'Saisissez un mot de passe' };
  }
  
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  
  // Ajustement du score (max 5)
  score = Math.min(score, 5);
  
  const levels = [
    { score: 0, label: 'Très faible', color: '#ef4444', message: 'Mot de passe trop court' },
    { score: 1, label: 'Faible', color: '#f97316', message: 'Ajoutez des chiffres' },
    { score: 2, label: 'Moyen', color: '#f59e0b', message: 'Ajoutez majuscules et symboles' },
    { score: 3, label: 'Fort', color: '#22c55e', message: 'Bon mot de passe' },
    { score: 4, label: 'Très fort', color: '#16a34a', message: 'Excellent !' },
    { score: 5, label: 'Excellent', color: '#059669', message: 'Parfait !' }
  ];
  
  return levels[score] || levels[0];
}

// ==================== ÂGE ====================

/**
 * Vérifie si un âge est valide
 * @param {number|string} age - L'âge à vérifier
 * @param {number} min - Âge minimum (défaut: 16)
 * @param {number} max - Âge maximum (défaut: 120)
 * @returns {boolean} true si l'âge est valide
 */
function isValidAge(age, min = 16, max = 120) {
  const a = parseInt(age, 10);
  return !isNaN(a) && a >= min && a <= max;
}

// ==================== POIDS ====================

/**
 * Vérifie si un poids est valide
 * @param {number|string} weight - Le poids en kg
 * @param {number} min - Poids minimum (défaut: 30)
 * @param {number} max - Poids maximum (défaut: 300)
 * @returns {boolean} true si le poids est valide
 */
function isValidWeight(weight, min = 30, max = 300) {
  const w = parseFloat(weight);
  return !isNaN(w) && w >= min && w <= max;
}

// ==================== TAILLE ====================

/**
 * Vérifie si une taille est valide
 * @param {number|string} height - La taille en cm
 * @param {number} min - Taille minimum (défaut: 100)
 * @param {number} max - Taille maximum (défaut: 250)
 * @returns {boolean} true si la taille est valide
 */
function isValidHeight(height, min = 100, max = 250) {
  const h = parseFloat(height);
  return !isNaN(h) && h >= min && h <= max;
}

// ==================== IMC ====================

/**
 * Calcule l'IMC à partir du poids et de la taille
 * @param {number} weight - Poids en kg
 * @param {number} heightCm - Taille en cm
 * @returns {number|null} IMC arrondi à 1 décimale
 */
function calculateBMI(weight, heightCm) {
  if (!weight || !heightCm) return null;
  const h = heightCm / 100;
  const bmi = weight / (h * h);
  return Math.round(bmi * 10) / 10;
}

/**
 * Retourne la catégorie d'IMC
 * @param {number} bmi - Valeur de l'IMC
 * @returns {Object} { label, color, severity, message }
 */
function getBMICategory(bmi) {
  if (bmi < 16) {
    return { label: 'Dénutrition', color: '#ef4444', severity: 'critical', message: 'Consultation médicale urgente recommandée' };
  }
  if (bmi < 18.5) {
    return { label: 'Maigreur', color: '#f97316', severity: 'high', message: 'Consultez un professionnel de santé' };
  }
  if (bmi < 25) {
    return { label: 'Poids normal', color: '#22c55e', severity: 'low', message: 'Maintenez vos habitudes' };
  }
  if (bmi < 30) {
    return { label: 'Surpoids', color: '#f59e0b', severity: 'medium', message: 'Rééquilibrage alimentaire recommandé' };
  }
  if (bmi < 35) {
    return { label: 'Obésité modérée', color: '#ef4444', severity: 'high', message: 'Suivi médical recommandé' };
  }
  if (bmi < 40) {
    return { label: 'Obésité sévère', color: '#dc2626', severity: 'high', message: 'Consultation médicale nécessaire' };
  }
  return { label: 'Obésité morbide', color: '#991b1b', severity: 'critical', message: 'Prise en charge médicale urgente' };
}

// ==================== FORMULAIRE BILAN ====================

/**
 * Valide l'ensemble des données d'un bilan
 * @param {Object} data - Les données du bilan
 * @returns {Object} { isValid, errors }
 */
function validateBilan(data) {
  const errors = [];
  
  // Prénom
  if (!data.prenom || data.prenom.trim().length < 2) {
    errors.push('Le prénom doit contenir au moins 2 caractères');
  }
  
  // Email (optionnel mais si présent doit être valide)
  if (data.email && !isValidEmail(data.email)) {
    errors.push('L\'email n\'est pas valide');
  }
  
  // Âge
  if (!isValidAge(data.age)) {
    errors.push('L\'âge doit être compris entre 16 et 120 ans');
  }
  
  // Sexe
  if (!data.sexe || !['homme', 'femme', 'autre'].includes(data.sexe)) {
    errors.push('Le sexe est requis');
  }
  
  // Ville
  if (!data.ville || data.ville.trim().length < 2) {
    errors.push('La ville est requise');
  }
  
  // Taille
  if (!isValidHeight(data.taille)) {
    errors.push('La taille doit être comprise entre 100 et 250 cm');
  }
  
  // Poids
  if (!isValidWeight(data.poids)) {
    errors.push('Le poids doit être compris entre 30 et 300 kg');
  }
  
  // Activité
  if (!data.activite) {
    errors.push('Le niveau d\'activité est requis');
  }
  
  // Objectif
  if (!data.objectif) {
    errors.push('L\'objectif est requis');
  }
  
  return { isValid: errors.length === 0, errors };
}

// ==================== FORMULAIRE DIÉTÉTICIEN ====================

/**
 * Valide les données d'inscription d'un diététicien
 * @param {Object} data - Les données du formulaire
 * @returns {Object} { isValid, errors }
 */
function validateDietitian(data) {
  const errors = [];
  
  if (!data.prenom || data.prenom.trim().length < 2) {
    errors.push('Le prénom est requis');
  }
  if (!data.nom || data.nom.trim().length < 2) {
    errors.push('Le nom est requis');
  }
  if (!isValidEmail(data.email)) {
    errors.push('Email invalide');
  }
  if (!isValidRPPS(data.rpps)) {
    errors.push('Le numéro RPPS doit contenir 11 chiffres');
  }
  if (!data.specialite) {
    errors.push('La spécialité est requise');
  }
  if (data.password && !isStrongPassword(data.password)) {
    errors.push('Le mot de passe doit contenir au moins 8 caractères avec majuscule, chiffre et symbole');
  }
  if (data.password !== data.passwordConfirm) {
    errors.push('Les mots de passe ne correspondent pas');
  }
  
  return { isValid: errors.length === 0, errors };
}

// ==================== FORMULAIRE PRESCRIPTEUR ====================

/**
 * Valide les données d'inscription d'un prescripteur
 * @param {Object} data - Les données du formulaire
 * @returns {Object} { isValid, errors }
 */
function validatePrescriber(data) {
  const errors = [];
  
  if (!data.prenom || data.prenom.trim().length < 2) {
    errors.push('Le prénom est requis');
  }
  if (!data.nom || data.nom.trim().length < 2) {
    errors.push('Le nom est requis');
  }
  if (!isValidEmail(data.email)) {
    errors.push('Email invalide');
  }
  if (!data.profession) {
    errors.push('La profession est requise');
  }
  if (!isValidSIRET(data.siret)) {
    errors.push('Le numéro SIRET doit contenir 14 chiffres valides');
  }
  if (!data.objectifs || data.objectifs.length === 0) {
    errors.push('Au moins un objectif doit être sélectionné');
  }
  if (data.password && !isStrongPassword(data.password)) {
    errors.push('Le mot de passe doit contenir au moins 8 caractères avec majuscule, chiffre et symbole');
  }
  if (data.password !== data.passwordConfirm) {
    errors.push('Les mots de passe ne correspondent pas');
  }
  
  return { isValid: errors.length === 0, errors };
}

// ==================== FORMATAGE GÉNÉRIQUE ====================

/**
 * Nettoie une chaîne (supprime espaces, met en minuscule)
 * @param {string} str - La chaîne à nettoyer
 * @returns {string} Chaîne nettoyée
 */
function sanitizeString(str) {
  if (!str) return '';
  return str.trim().toLowerCase();
}

/**
 * Tronque une chaîne à une longueur maximale
 * @param {string} str - La chaîne à tronquer
 * @param {number} maxLength - Longueur maximale
 * @returns {string} Chaîne tronquée
 */
function truncateString(str, maxLength = 100) {
  if (!str || str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '…';
}

// ==================== EXPORTS GLOBAUX ====================
window.isValidEmail = isValidEmail;
window.isValidPhone = isValidPhone;
window.formatPhone = formatPhone;
window.isValidRPPS = isValidRPPS;
window.formatRPPS = formatRPPS;
window.isValidSIRET = isValidSIRET;
window.formatSIRET = formatSIRET;
window.luhnCheck = luhnCheck;
window.isStrongPassword = isStrongPassword;
window.getPasswordStrength = getPasswordStrength;
window.isValidAge = isValidAge;
window.isValidWeight = isValidWeight;
window.isValidHeight = isValidHeight;
window.calculateBMI = calculateBMI;
window.getBMICategory = getBMICategory;
window.validateBilan = validateBilan;
window.validateDietitian = validateDietitian;
window.validatePrescriber = validatePrescriber;
window.sanitizeString = sanitizeString;
window.truncateString = truncateString;

console.log('[validation.js] ✅ Chargé avec succès');