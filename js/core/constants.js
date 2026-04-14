/**
 * constants.js — NutriDoc · Constantes partagées entre tous les modules
 * Centralise les labels, listes déroulantes et configurations communes
 *
 * Version: 1.1.0
 * Dernière mise à jour: 2026-04-14
 * Changelog: harmonisation modèle tarifaire
 *   - PACKS_PRESCRIPTEUR : Solo 24,90€ / Standard 130€ / Expert 500€ / Volume 900€
 */

// ==================== OBJECTIFS NUTRITIONNELS ====================
const OBJECTIF_LABELS = {
  perte_poids:  'Perte de poids',
  prise_masse:  'Prise de masse musculaire',
  equilibre:    'Alimentation équilibrée',
  energie:      'Améliorer mon énergie',
  sante:        'Prévention santé',
  reequilibrage:'Rééquilibrage alimentaire',
  perte_gras:   'Perte de gras',
  pathologie:   'Pathologie spécifique'
};

const OBJECTIF_LIST = [
  { value: 'perte_poids',   label: 'Perte de poids',              icon: '⚖️', description: 'Réduction de la masse grasse' },
  { value: 'prise_masse',   label: 'Prise de masse musculaire',    icon: '💪', description: 'Augmentation de la masse musculaire' },
  { value: 'equilibre',     label: 'Alimentation équilibrée',      icon: '🥗', description: 'Maintien d\'une alimentation saine' },
  { value: 'energie',       label: 'Améliorer mon énergie',        icon: '⚡', description: 'Lutter contre la fatigue' },
  { value: 'sante',         label: 'Prévention santé',             icon: '🩺', description: 'Prévenir les maladies' },
  { value: 'reequilibrage', label: 'Rééquilibrage alimentaire',    icon: '🔄', description: 'Reprendre de bonnes habitudes' },
  { value: 'perte_gras',    label: 'Perte de gras',                icon: '🔥', description: 'Réduire le taux de masse grasse' },
  { value: 'pathologie',    label: 'Pathologie spécifique',        icon: '🏥', description: 'Adapté à une condition médicale' }
];

// ==================== NIVEAUX D'ACTIVITÉ ====================
const ACTIVITE_LABELS = {
  sedentaire: 'Sédentaire (peu ou pas d\'exercice)',
  leger:      'Légèrement actif (1-2 séances/semaine)',
  modere:     'Modérément actif (3-4 séances/semaine)',
  actif:      'Très actif (5-6 séances/semaine)',
  sportif:    'Sportif intensif (tous les jours)'
};

const ACTIVITE_LIST = [
  { value: 'sedentaire', label: 'Sédentaire',          kcal_coeff: 1.2,   icon: '🛋️', description: 'Travail de bureau, peu de déplacements' },
  { value: 'leger',      label: 'Légèrement actif',    kcal_coeff: 1.375, icon: '🚶', description: '1 à 2 séances de sport par semaine' },
  { value: 'modere',     label: 'Modérément actif',    kcal_coeff: 1.55,  icon: '🏃', description: '3 à 4 séances de sport par semaine' },
  { value: 'actif',      label: 'Très actif',          kcal_coeff: 1.725, icon: '🏋️', description: '5 à 6 séances de sport par semaine' },
  { value: 'sportif',    label: 'Sportif intensif',    kcal_coeff: 1.9,   icon: '⚡', description: 'Sport quotidien + métier actif' }
];

// ==================== RÉGIMES ALIMENTAIRES ====================
const REGIME_LABELS = {
  '':           'Aucune restriction',
  vegetarien:   'Végétarien (sans viande ni poisson)',
  vegan:        'Végétalien (sans produit animal)',
  sans_gluten:  'Sans gluten',
  sans_lactose: 'Sans lactose',
  pescetarien:  'Pescétarien (poisson autorisé)',
  flexitarien:  'Flexitarien (végétarien occasionnel)'
};

const REGIME_LIST = [
  { value: '',           label: 'Aucune restriction', icon: '🍽️' },
  { value: 'vegetarien', label: 'Végétarien',         icon: '🥦' },
  { value: 'vegan',      label: 'Végétalien',         icon: '🌱' },
  { value: 'pescetarien',label: 'Pescétarien',        icon: '🐟' },
  { value: 'flexitarien',label: 'Flexitarien',        icon: '🥗' },
  { value: 'sans_gluten',label: 'Sans gluten',        icon: '🌾❌' },
  { value: 'sans_lactose',label: 'Sans lactose',      icon: '🥛❌' }
];

// ==================== ALERTES SANTÉ (RED FLAGS) ====================
const ALERTES_SANTE_LABELS = {
  grossesse:          'Grossesse / allaitement',
  tca:                'Troubles du comportement alimentaire (TCA)',
  diabete:            'Diabète traité',
  insuffisance_renale:'Insuffisance rénale',
  bariatrique:        'Chirurgie bariatrique',
  allergies_severes:  'Allergies sévères',
  medicaments:        'Traitement médicamenteux lourd',
  antecedents:        'Antécédents cardio-vasculaires'
};

const ALERTES_SANTE_LIST = [
  { value: 'grossesse',           label: 'Grossesse / allaitement',              icon: '🤰', critical: true,  message: 'Consultez votre médecin avant tout changement alimentaire' },
  { value: 'tca',                 label: 'Troubles du comportement alimentaire', icon: '🍽️', critical: true,  message: 'Nécessite un suivi médical spécialisé' },
  { value: 'diabete',             label: 'Diabète traité',                       icon: '🩸', critical: true,  message: 'Adaptation nécessaire avec votre médecin' },
  { value: 'insuffisance_renale', label: 'Insuffisance rénale',                  icon: '🫘', critical: true,  message: 'Régime spécifique obligatoire' },
  { value: 'bariatrique',         label: 'Chirurgie bariatrique',                icon: '⚕️', critical: true,  message: 'Suivi post-opératoire obligatoire' },
  { value: 'allergies_severes',   label: 'Allergies sévères',                    icon: '⚠️', critical: false, message: 'Éviction allergènes obligatoire' },
  { value: 'medicaments',         label: 'Traitement médicamenteux',             icon: '💊', critical: false, message: 'Vérifier interactions avec l\'alimentation' },
  { value: 'antecedents',         label: 'Antécédents cardio-vasculaires',       icon: '❤️', critical: true,  message: 'Consultation médicale recommandée' }
];

// ==================== STATUTS DES PLANS ====================
const STATUT_PLAN = {
  en_attente:         { label: 'En attente',   color: '#f59e0b', bgColor: '#fef3c7', icon: '⏳', order: 1 },
  attente_validation: { label: 'En validation',color: '#3b82f6', bgColor: '#dbeafe', icon: '🔄', order: 2 },
  valide:             { label: 'Validé',        color: '#22c55e', bgColor: '#dcfce7', icon: '✅', order: 3 },
  alerte_sante:       { label: 'Alerte santé',  color: '#ef4444', bgColor: '#fee2e2', icon: '⚠️', order: 4 },
  refuse:             { label: 'Refusé',         color: '#6b7b74', bgColor: '#f3f4f6', icon: '❌', order: 5 }
};

// ==================== ABONNEMENTS PATIENT ====================
const NIVEAUX_ABONNEMENT = {
  gratuit:  { label: 'Découverte', prix: 0, prixMensuel: 0, color: '#6b7b74', bgColor: '#f3f4f6', features: ['Bilan gratuit', 'Conseils de base'] },
  essentiel:{ label: 'Essentiel',  prix: 5, prixMensuel: 5, color: '#1D9E75', bgColor: '#e1f5ee', features: ['Tableau de bord complet', 'Conseils illimités', 'Diététicien attitré', 'Suivi personnalisé'] },
  premium:  { label: 'Premium',    prix: 9, prixMensuel: 9, prixAnnuel: 99,   color: '#0d2018', bgColor: '#e8edeb', features: ['Tout Essentiel', '1 plan offert/3 mois', 'Accès prioritaire', '-20% sur visios'] }
};

// ==================== PACKS PRESCRIPTEUR ====================
// Modèle tarifaire validé le 2026-04-14
// Stripe product keys : credits_solo / credits_standard / credits_expert / credits_volume
// Prix TTC (TVA 20%) — HT = TTC ÷ 1,20
const PACKS_PRESCRIPTEUR = {
  solo: {
    label:      'Pack Solo',
    credits:    1,
    prixHT:     20.75,   // 24,90 ÷ 1,20
    prixTTC:    24.90,
    perPlan:    24.90,
    stripeKey:  'credits_solo',
    description:'1 plan alimentaire'
  },
  standard: {
    label:      'Pack Standard',
    credits:    10,
    prixHT:     108.33,  // 130 ÷ 1,20
    prixTTC:    130,
    perPlan:    13,
    stripeKey:  'credits_standard',
    description:'10 plans — 13€/plan · économie 48%'
  },
  expert: {
    label:      'Pack Expert',
    credits:    50,
    prixHT:     416.67,  // 500 ÷ 1,20
    prixTTC:    500,
    perPlan:    10,
    stripeKey:  'credits_expert',
    description:'50 plans — 10€/plan · économie 60%'
  },
  volume: {
    label:      'Pack Volume',
    credits:    100,
    prixHT:     750,     // 900 ÷ 1,20
    prixTTC:    900,
    perPlan:    9,
    stripeKey:  'credits_volume',
    description:'100 plans — 9€/plan · économie 64%'
  }
};

// ==================== FORMULES DIÉTÉTICIEN ====================
// commission = commission NutriDoc prélevée par plan HORS quota (en €)
// Net diét par plan = 24,90€ - commission
//   Essentiel : 24,90 - 5,00 = 19,90€ net
//   Starter   : 24,90 - 2,50 = 22,40€ net
//   Pro       : 24,90 - 2,00 = 22,90€ net
//   Expert    : 24,90 - 1,50 = 23,40€ net
const FORMULES_DIETETICIEN = {
  essentiel: { label: 'Essentiel', prix: 0,  plans_inclus: 0,   commission: 5,   stripeKey: 'abo_essentiel', features: ['Référencement seul', 'Badge vérifié'] },
  starter:   { label: 'Starter',   prix: 9,  plans_inclus: 10,  commission: 2.5, stripeKey: 'abo_starter',   features: ['Accès dossiers', '10 plans inclus', 'Agenda visio'] },
  pro:       { label: 'Pro',       prix: 29, plans_inclus: 30,  commission: 2,   stripeKey: 'abo_pro',       features: ['30 plans inclus', 'Commission réduite', 'Support prioritaire'] },
  expert:    { label: 'Expert',    prix: 59, plans_inclus: 100, commission: 1.5, stripeKey: 'abo_expert',    features: ['100 plans inclus', 'Commission 1,50€', 'Analytics avancés'] }
};

// ==================== PROFESSIONS PRESCRIPTEUR ====================
const PROFESSIONS_PRESCRIPTEUR = {
  medecin:      { label: 'Médecin généraliste',    icon: '👨‍⚕️' },
  medecin_sport:{ label: 'Médecin du sport',       icon: '🏃' },
  kine:         { label: 'Kinésithérapeute DE',    icon: '💪' },
  infirmier:    { label: 'Infirmier(ère) DE',      icon: '💉' },
  sage_femme:   { label: 'Sage-femme',             icon: '👶' },
  pharmacien:   { label: 'Pharmacien(ne)',         icon: '💊' },
  psychologue:  { label: 'Psychologue',            icon: '🧠' },
  coach_sportif:{ label: 'Coach sportif certifié', icon: '🏋️' },
  preparateur:  { label: 'Préparateur physique',   icon: '⚡' },
  osteopathe:   { label: 'Ostéopathe',             icon: '🦴' },
  naturopathe:  { label: 'Naturopathe déclaré',    icon: '🌿' },
  autre:        { label: 'Autre professionnel de santé', icon: '👤' }
};

// ==================== JOURS DE LA SEMAINE ====================
const JOURS_SEMAINE = [
  { value: 'lundi',    label: 'Lundi',    short: 'Lun' },
  { value: 'mardi',    label: 'Mardi',    short: 'Mar' },
  { value: 'mercredi', label: 'Mercredi', short: 'Mer' },
  { value: 'jeudi',    label: 'Jeudi',    short: 'Jeu' },
  { value: 'vendredi', label: 'Vendredi', short: 'Ven' },
  { value: 'samedi',   label: 'Samedi',   short: 'Sam' },
  { value: 'dimanche', label: 'Dimanche', short: 'Dim' }
];

// ==================== REPAS ====================
const REPAS_LIST = [
  { key: 'petitDej',  label: 'Petit déjeuner', icon: '🍳', order: 1, defaultHour: '08:00' },
  { key: 'dejeuner',  label: 'Déjeuner',       icon: '🥗', order: 2, defaultHour: '12:30' },
  { key: 'collation', label: 'Collation',      icon: '🍎', order: 3, defaultHour: '16:30' },
  { key: 'diner',     label: 'Dîner',          icon: '🍽️', order: 4, defaultHour: '19:30' }
];

// ==================== UNITÉS DE MESURE ====================
const UNITES_MESURE = [
  { value: 'g',     label: 'grammes',          category: 'poids' },
  { value: 'kg',    label: 'kilos',            category: 'poids' },
  { value: 'ml',    label: 'millilitres',      category: 'volume' },
  { value: 'cl',    label: 'centilitres',      category: 'volume' },
  { value: 'l',     label: 'litres',           category: 'volume' },
  { value: 'cs',    label: 'cuillère à soupe', category: 'volume' },
  { value: 'cc',    label: 'cuillère à café',  category: 'volume' },
  { value: 'piece', label: 'pièce',            category: 'unite' }
];

// ==================== FONCTIONS UTILITAIRES ====================

/**
 * Récupère un label depuis un objet de labels
 */
function getLabel(labelSet, key, defaultValue = '—') {
  if (!labelSet || !key) return defaultValue;
  return labelSet[key] || defaultValue;
}

/**
 * Récupère un élément d'une liste par sa valeur
 */
function getFromList(list, value, defaultValue = null) {
  if (!list || !value) return defaultValue;
  return list.find(item => item.value === value) || defaultValue;
}

/**
 * Calcule le prix TTC à partir du prix HT
 */
function calculerPrixTTC(prixHT, tva = 20) {
  return Math.round(prixHT * (1 + tva / 100) * 100) / 100;
}

/**
 * Formate un prix en euros
 */
function formatPrix(prix, includeCurrency = true) {
  const formatted = prix.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return includeCurrency ? `${formatted} €` : formatted;
}

// ==================== EXPORTS GLOBAUX ====================
window.OBJECTIF_LABELS       = OBJECTIF_LABELS;
window.OBJECTIF_LIST         = OBJECTIF_LIST;
window.ACTIVITE_LABELS       = ACTIVITE_LABELS;
window.ACTIVITE_LIST         = ACTIVITE_LIST;
window.REGIME_LABELS         = REGIME_LABELS;
window.REGIME_LIST           = REGIME_LIST;
window.ALERTES_SANTE_LABELS  = ALERTES_SANTE_LABELS;
window.ALERTES_SANTE_LIST    = ALERTES_SANTE_LIST;
window.STATUT_PLAN           = STATUT_PLAN;
window.NIVEAUX_ABONNEMENT    = NIVEAUX_ABONNEMENT;
window.PACKS_PRESCRIPTEUR    = PACKS_PRESCRIPTEUR;
window.FORMULES_DIETETICIEN  = FORMULES_DIETETICIEN;
window.PROFESSIONS_PRESCRIPTEUR = PROFESSIONS_PRESCRIPTEUR;
window.JOURS_SEMAINE         = JOURS_SEMAINE;
window.REPAS_LIST            = REPAS_LIST;
window.UNITES_MESURE         = UNITES_MESURE;
window.getLabel              = getLabel;
window.getFromList           = getFromList;
window.calculerPrixTTC       = calculerPrixTTC;
window.formatPrix            = formatPrix;

console.log('[constants.js] v1.1.0 charge');
