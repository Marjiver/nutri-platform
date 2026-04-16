/**
 * ═══════════════════════════════════════════════════════════════
 *  NutriDoc — js/core/auth.js
 *  Authentification & accès Supabase centralisé
 *  Compatible : toutes les pages HTML NutriDoc
 * ═══════════════════════════════════════════════════════════════
 *
 *  ✅ CONFIGURATION : clés Supabase déjà renseignées (projet phgjpwaptrrjonoimmne)
 * ═══════════════════════════════════════════════════════════════
 *
 *  Fonctions exposées sur window :
 *    _supa                   — client Supabase (toutes pages)
 *    MODE_SUPA               — boolean : Supabase configuré ?
 *    getProfile()            — profil de l'utilisateur connecté
 *    connecter(email, pwd)   — connexion email/mot de passe
 *    deconnecter()           — déconnexion + redirect index
 *    reinitialiserMotDePasse(email) — reset password par email
 *    inscrireDieteticien(payload)   — inscription diét. complet
 *    inscrirePrescripteur(payload)  — inscription prescripteur
 *    inscrirePatient(email, password, bilanData) — inscription patient
 *    getSession()            — session courante
 *    onAuthChange(callback)  — écoute changements d'auth
 */

/* ─────────────────────────────────────────────────────────────
   0. CONFIGURATION — À MODIFIER AVEC TES CLÉS SUPABASE
   ───────────────────────────────────────────────────────────── */
const SUPABASE_URL      = 'https://phgjpwaptrrjonoimmne.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoZ2pwd2FwdHJyam9ub2ltbW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NTUxOTgsImV4cCI6MjA5MDEzMTE5OH0.jFqP_7-i7YEfs5KA8ge58AUTdg-gblelrlSaQ0s-ApY';

/* ─────────────────────────────────────────────────────────────
   1. INITIALISATION DU CLIENT
   ───────────────────────────────────────────────────────────── */
let _supa     = null;
let MODE_SUPA = false;

(function initSupabase() {
  try {
    if (typeof supabase === 'undefined' || typeof supabase.createClient !== 'function') {
      console.error('[NutriDoc auth.js] Librairie @supabase/supabase-js non chargée.');
      return;
    }

    _supa     = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    MODE_SUPA = true;
    console.info('[NutriDoc auth.js] ✅ Supabase initialisé.');
  } catch (err) {
    console.error('[NutriDoc auth.js] Erreur initialisation :', err);
  }
})();

// Exposer globalement pour toutes les pages
window._supa     = _supa;
window.MODE_SUPA = MODE_SUPA;

/* ─────────────────────────────────────────────────────────────
   2. SESSION & PROFIL
   ───────────────────────────────────────────────────────────── */

/**
 * Retourne la session Supabase courante, ou null.
 */
async function getSession() {
  if (!_supa) return null;
  try {
    const { data } = await _supa.auth.getSession();
    return data?.session || null;
  } catch {
    return null;
  }
}

/**
 * Retourne le profil complet de l'utilisateur connecté (table `profiles`).
 * Retourne null si non connecté ou si une erreur survient.
 */
async function getProfile() {
  if (!_supa) return null;
  try {
    const { data: { user } } = await _supa.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await _supa
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.warn('[getProfile]', error.message);
      return null;
    }
    return profile;
  } catch (err) {
    console.error('[getProfile]', err);
    return null;
  }
}

/**
 * S'abonne aux changements d'authentification.
 * callback(event, session) sera appelé à chaque changement.
 */
function onAuthChange(callback) {
  if (!_supa) return;
  _supa.auth.onAuthStateChange(callback);
}

/* ─────────────────────────────────────────────────────────────
   3. CONNEXION / DÉCONNEXION
   ───────────────────────────────────────────────────────────── */

/**
 * Connecte un utilisateur avec email + mot de passe.
 * Retourne { data, error }.
 * Redirige vers la bonne page selon le rôle si succès.
 */
async function connecter(email, password, redirectUrl = null) {
  if (!_supa) return { data: null, error: { message: 'Supabase non configuré' } };

  const { data, error } = await _supa.auth.signInWithPassword({ email, password });
  if (error) return { data, error };

  // Si une redirection forcée est demandée
  if (redirectUrl) {
    window.location.href = redirectUrl;
    return { data, error: null };
  }

  // Redirection selon le rôle
  try {
    const profile = await getProfile();
    if (profile) {
      const redirects = {
        patient:    'dashboard.html',
        dietitian:  'dietitian.html',
        prescriber: 'prescripteur-dashboard.html',
        admin:      'admin.html',
      };
      const dest = redirects[profile.role] || 'dashboard.html';
      window.location.href = dest;
    }
  } catch {
    window.location.href = 'dashboard.html';
  }

  return { data, error: null };
}

/**
 * Déconnecte l'utilisateur courant et redirige vers l'accueil.
 */
async function deconnecter() {
  if (_supa) await _supa.auth.signOut();
  localStorage.removeItem('nutridoc_profil');
  localStorage.removeItem('nutridoc_bilan');
  localStorage.removeItem('nutridoc_user_email');
  localStorage.removeItem('nutridoc_user_prenom');
  window.location.href = 'index.html';
}

/**
 * Envoie un email de réinitialisation de mot de passe.
 * Retourne { error }.
 */
async function reinitialiserMotDePasse(email) {
  if (!_supa) return { error: { message: 'Supabase non configuré' } };
  const { error } = await _supa.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/login.html?reset=1',
  });
  return { error };
}

/* ─────────────────────────────────────────────────────────────
   4. INSCRIPTION PATIENT (via bilan.html)
   ───────────────────────────────────────────────────────────── */

/**
 * Inscrit un patient :
 *  1. auth.signUp
 *  2. Insert dans `profiles` (role: 'patient')
 *  3. Insert dans `bilans`
 *
 * @param {string} email
 * @param {string} password
 * @param {object} bilanData  — données du formulaire bilan
 * @returns {{ userId, error }}
 */
async function inscrirePatient(email, password, bilanData = {}) {
  if (!_supa) return { userId: null, error: { message: 'Supabase non configuré' } };

  // 1. Créer le compte Auth
  const { data: authData, error: authError } = await _supa.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin + '/dashboard.html',
      data: {
        prenom: bilanData.prenom || '',
        nom:    bilanData.nom    || '',
        role:   'patient',
      },
    },
  });

  if (authError) return { userId: null, error: authError };
  const userId = authData.user?.id;
  if (!userId) return { userId: null, error: { message: 'Identifiant utilisateur manquant' } };

  // 2. Créer le profil
  const { error: profileError } = await _supa.from('profiles').upsert({
    id:     userId,
    role:   'patient',
    prenom: bilanData.prenom || '',
    nom:    bilanData.nom    || '',
    email,
    ville:  bilanData.ville  || '',
    statut: 'actif',
  }, { onConflict: 'id' });

  if (profileError) console.warn('[inscrirePatient] profil:', profileError.message);

  // 3. Enregistrer le bilan
  const { error: bilanError } = await _supa.from('bilans').insert({
    patient_id:     userId,
    prenom:         bilanData.prenom         || '',
    nom:            bilanData.nom            || '',
    age:            bilanData.age            || null,
    sexe:           bilanData.sexe           || '',
    ville:          bilanData.ville          || '',
    taille:         bilanData.taille         || null,
    poids:          bilanData.poids          || null,
    poids_objectif: bilanData.poids_objectif || null,
    objectif:       bilanData.objectif       || '',
    activite:       bilanData.activite       || '',
    regime:         bilanData.regime         || '',
    allergies:      bilanData.allergies      || '',
    alertes_sante:  bilanData.alertes_sante  || [],
    statut:         'en_attente',
    paiement:       'gratuit',
  });

  if (bilanError) console.warn('[inscrirePatient] bilan:', bilanError.message);

  return { userId, error: null };
}

/* ─────────────────────────────────────────────────────────────
   5. INSCRIPTION DIÉTÉTICIEN
   ───────────────────────────────────────────────────────────── */

/**
 * Inscrit un diététicien :
 *  1. auth.signUp
 *  2. Insert dans `profiles` (role: 'dietitian')
 *
 * @param {object} payload  — données de inscription-dieteticien.html
 * @returns {{ data, error }}
 */
async function inscrireDieteticien(payload) {
  if (!_supa) return { data: null, error: { message: 'Supabase non configuré' } };

  const { data: authData, error: authError } = await _supa.auth.signUp({
    email:    payload.email,
    password: payload.password,
    options: {
      emailRedirectTo: window.location.origin + '/dietitian.html',
      data: {
        prenom: payload.prenom,
        nom:    payload.nom,
        role:   'dietitian',
      },
    },
  });

  if (authError) return { data: null, error: authError };
  const userId = authData.user?.id;
  if (!userId) return { data: null, error: { message: 'Identifiant manquant après inscription' } };

  // Générer un code parrainage unique
  const codeParrainage = 'DIET-' + Math.random().toString(36).substring(2, 8).toUpperCase();

  const { error: profileError } = await _supa.from('profiles').upsert({
    id:              userId,
    role:            'dietitian',
    prenom:          payload.prenom    || '',
    nom:             payload.nom       || '',
    email:           payload.email,
    tel:             payload.tel       || '',
    site_web:        payload.siteWeb   || '',
    cabinet:         payload.cabinet   || '',
    rpps:            payload.rpps      || '',
    specialite:      payload.specialite|| '',
    adeli:           payload.adeli     || '',
    formule:         payload.formule   || 'essentiel',
    statut_rpps:     'en_attente',
    code_parrainage: codeParrainage,
    statut:          'actif',
  }, { onConflict: 'id' });

  if (profileError) console.warn('[inscrireDieteticien] profil:', profileError.message);

  return { data: { userId }, error: null };
}

/* ─────────────────────────────────────────────────────────────
   6. INSCRIPTION PRESCRIPTEUR
   ───────────────────────────────────────────────────────────── */

/**
 * Inscrit un prescripteur :
 *  1. auth.signUp
 *  2. Insert dans `profiles` (role: 'prescriber')
 *
 * @param {object} payload  — données de inscription-prescripteur.html
 * @returns {{ data, error }}
 */
async function inscrirePrescripteur(payload) {
  if (!_supa) return { data: null, error: { message: 'Supabase non configuré' } };

  const { data: authData, error: authError } = await _supa.auth.signUp({
    email:    payload.email,
    password: payload.password,
    options: {
      emailRedirectTo: window.location.origin + '/prescripteur-dashboard.html',
      data: {
        prenom: payload.prenom,
        nom:    payload.nom,
        role:   'prescriber',
      },
    },
  });

  if (authError) return { data: null, error: authError };
  const userId = authData.user?.id;
  if (!userId) return { data: null, error: { message: 'Identifiant manquant après inscription' } };

  // Crédits initiaux selon le pack choisi
  const creditsInitiaux = {
    solo:     1,
    standard: 10,
    expert:   50,
    volume:   100,
  };
  const credits = creditsInitiaux[payload.pack] || 0;

  const { error: profileError } = await _supa.from('profiles').upsert({
    id:            userId,
    role:          'prescriber',
    prenom:        payload.prenom     || '',
    nom:           payload.nom        || '',
    email:         payload.email,
    tel:           payload.tel        || '',
    site_web:      payload.siteWeb    || '',
    cabinet:       payload.cabinet    || '',
    siret:         payload.siret      || '',
    profession:    payload.profession || '',
    ville:         payload.ville      || '',
    pack:          payload.pack       || '',
    credits:       credits,
    credits_total: credits,
    statut:        'actif',
  }, { onConflict: 'id' });

  if (profileError) console.warn('[inscrirePrescripteur] profil:', profileError.message);

  return { data: { userId }, error: null };
}

/* ─────────────────────────────────────────────────────────────
   7. PROTECTION DES PAGES PRIVÉES
   ───────────────────────────────────────────────────────────── */

/**
 * Vérifie que l'utilisateur est connecté avec le bon rôle.
 * À appeler en haut des pages protégées.
 *
 * @param {string|string[]} rolesAutorises  Ex: 'dietitian' ou ['patient','dietitian']
 * @param {string} redirectUrl             Page de redirection si non autorisé
 */
async function protegerPage(rolesAutorises = null, redirectUrl = 'login.html') {
  if (!_supa) return;

  const { data: { user } } = await _supa.auth.getUser();
  if (!user) {
    window.location.href = redirectUrl;
    return;
  }

  if (rolesAutorises) {
    const roles = Array.isArray(rolesAutorises) ? rolesAutorises : [rolesAutorises];
    const profile = await getProfile();
    if (!profile || !roles.includes(profile.role)) {
      window.location.href = redirectUrl;
    }
  }
}

/* ─────────────────────────────────────────────────────────────
   8. MISE À JOUR DU HEADER (nom + bouton déconnexion)
   ───────────────────────────────────────────────────────────── */

/**
 * Remplit le badge utilisateur dans le header (#navUser, #navUserName)
 * et affiche le bouton de déconnexion si connecté.
 * À appeler après DOMContentLoaded sur les pages app.
 */
async function initHeader() {
  const badgeEl = document.getElementById('navUser') || document.getElementById('navUserName');
  if (!badgeEl) return;

  const profile = await getProfile();
  if (!profile) {
    badgeEl.textContent = 'Non connecté';
    return;
  }

  const nom = [profile.prenom, profile.nom].filter(Boolean).join(' ') || profile.email;
  badgeEl.textContent = nom;

  // Afficher le rôle en badge si présent
  const roleBadge = document.getElementById('navUserRole');
  if (roleBadge) {
    const labels = { patient:'Patient', dietitian:'Diététicien', prescriber:'Prescripteur', admin:'Admin' };
    roleBadge.textContent = labels[profile.role] || profile.role;
  }
}

/* ─────────────────────────────────────────────────────────────
   9. EXPOSITIONS GLOBALES
   ───────────────────────────────────────────────────────────── */
window.getProfile              = getProfile;
window.getSession              = getSession;
window.onAuthChange            = onAuthChange;
window.connecter               = connecter;
window.deconnecter             = deconnecter;
window.reinitialiserMotDePasse = reinitialiserMotDePasse;
window.inscrirePatient         = inscrirePatient;
window.inscrireDieteticien     = inscrireDieteticien;
window.inscrirePrescripteur    = inscrirePrescripteur;
window.protegerPage            = protegerPage;
window.initHeader              = initHeader;

// Compatibilité avec les pages qui vérifient window.supabaseClient
window.supabaseClient = _supa;
