// ============================================================
// auth.js — NutriDoc · Supabase Auth
// Version: 1.2.0 — 2026-04-14
// Corrections :
//   - Clé anon Supabase correcte (JWT)
//   - alertes_sante (nom colonne SQL)
//   - inscrireDieteticien : email ajouté au profil
//   - inscrirePrescripteur : siret, suppression certif/pack_initial
//   - creditsMap aligné sur les nouveaux packs
// ============================================================

const SUPABASE_URL      = 'https://phgjpwaptrrjonoimmne.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoZ2pwd2FwdHJyam9ub2ltbW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NTUxOTgsImV4cCI6MjA5MDEzMTE5OH0.jFqP_7-i7YEfs5KA8ge58AUTdg-gblelrlSaQ0s-ApY';

const _supa = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// MODE_SUPA = true si la lib Supabase est chargée ET l'URL n'est pas un placeholder
const MODE_SUPA = !!window.supabase && !SUPABASE_URL.includes('VOTRE-ID');

// ── Helpers session ──────────────────────────────────────────
async function getSession() {
  if (!_supa) return null;
  const { data } = await _supa.auth.getSession();
  return data?.session ?? null;
}

async function getUser() {
  const session = await getSession();
  return session?.user ?? null;
}

async function getProfile() {
  const user = await getUser();
  if (!user) return null;
  const { data } = await _supa
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  return data;
}

// getCurrentUser : utilisé par stripe.js et les dashboards
async function getCurrentUser() {
  if (MODE_SUPA && _supa) {
    try {
      const { data: { user } } = await _supa.auth.getUser();
      if (user) {
        const { data: profile } = await _supa
          .from('profiles').select('*').eq('id', user.id).single();
        return {
          id: user.id,
          email: user.email,
          prenom: profile?.prenom || '',
          nom: profile?.nom || '',
          role: profile?.role || 'patient',
          ...profile
        };
      }
    } catch(e) { console.warn('getCurrentUser Supabase:', e); }
  }

  // Fallback localStorage (mode démo / local)
  try {
    const bilan = JSON.parse(localStorage.getItem('nutridoc_bilan') || '{}');
    if (bilan.email && bilan.prenom) {
      return { id: bilan.id || 'local_' + Date.now(), email: bilan.email,
        prenom: bilan.prenom, nom: bilan.nom || '', role: 'patient',
        niveau_abo: bilan.niveau_abo || 'gratuit' };
    }
    const presc = JSON.parse(localStorage.getItem('nutridoc_prescripteur') || '{}');
    if (presc.email && presc.prenom) {
      return { id: presc.id || 'local_' + Date.now(), email: presc.email,
        prenom: presc.prenom, nom: presc.nom || '', role: 'prescriber',
        credits: presc.credits || 0 };
    }
    const diet = JSON.parse(localStorage.getItem('nutridoc_dieteticien') || '{}');
    if (diet.email && diet.prenom) {
      return { id: diet.id || 'local_' + Date.now(), email: diet.email,
        prenom: diet.prenom, nom: diet.nom || '', role: 'dietitian',
        rpps: diet.rpps || '' };
    }
  } catch(e) { console.warn('getCurrentUser localStorage:', e); }

  return null;
}

// ── Redirection auto selon rôle ──────────────────────────────
const ROLE_REDIRECT = {
  patient:    'dashboard.html',
  dietitian:  'dietitian.html',
  prescriber: 'prescripteur-dashboard.html'
};

async function redirectSiConnecte() {
  const profile = await getProfile();
  if (profile) window.location.href = ROLE_REDIRECT[profile.role] || 'index.html';
}

async function requireAuth(roleAttendu) {
  const profile = await getProfile();
  if (!profile) { window.location.href = 'login.html'; return null; }
  if (roleAttendu && profile.role !== roleAttendu) {
    window.location.href = ROLE_REDIRECT[profile.role] || 'index.html';
    return null;
  }
  return profile;
}

// ── Déconnexion ──────────────────────────────────────────────
async function deconnecter() {
  if (_supa) await _supa.auth.signOut();
  localStorage.removeItem('nutridoc_bilan');
  localStorage.removeItem('nutridoc_dieteticien');
  localStorage.removeItem('nutridoc_prescripteur');
  localStorage.removeItem('nutridoc_current_user');
  window.location.href = 'index.html';
}

// ── Réinitialisation mot de passe ────────────────────────────
async function reinitialiserMotDePasse(email) {
  if (!MODE_SUPA || !_supa) return { error: { message: 'Supabase non disponible' } };
  return _supa.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/login.html?reset=true'
  });
}

// ── Inscription patient ──────────────────────────────────────
async function inscrirePatient({ email, password, prenom, age, poids, taille,
  objectif, activite, regime, alerte_santes }) {

  if (!MODE_SUPA || !_supa) {
    // Mode démo local
    const patient = {
      id: 'p_' + Date.now(), email, prenom, age, poids, taille,
      objectif, activite, regime,
      alertes_sante: alerte_santes || [],   // ← nom colonne SQL correct
      statut: alerte_santes?.length > 0 ? 'alerte_sante' : 'en_attente',
      niveau_abo: 'gratuit',
      created_at: new Date().toISOString()
    };
    localStorage.setItem('nutridoc_bilan', JSON.stringify(patient));
    localStorage.setItem('nutridoc_current_user', JSON.stringify({ ...patient, role: 'patient' }));
    if (alerte_santes?.length > 0) {
      const alertes = JSON.parse(localStorage.getItem('nutridoc_alertes') || '[]');
      alertes.push({ id: 'a_' + Date.now(), type: 'alerte_sante', patient: prenom,
        patient_id: patient.id, flags: alerte_santes, lu: false,
        created_at: new Date().toISOString() });
      localStorage.setItem('nutridoc_alertes', JSON.stringify(alertes));
    }
    window.location.href = 'dashboard.html';
    return { data: { user: patient } };
  }

  const { data, error } = await _supa.auth.signUp({
    email, password,
    options: { data: { role: 'patient', prenom } }
  });
  if (error) return { error };

  const userId = data.user.id;

  // Créer le profil
  await _supa.from('profiles').upsert({
    id: userId, role: 'patient', email, prenom,
    created_at: new Date().toISOString()
  });

  // Créer le bilan
  const { error: bilanErr } = await _supa.from('bilans').insert({
    patient_id: userId,
    prenom, age, poids, taille, objectif, activite, regime,
    alertes_sante: alerte_santes || [],   // ← nom colonne SQL correct
    statut: alerte_santes?.length > 0 ? 'alerte_sante' : 'en_attente',
  });
  if (bilanErr) return { error: bilanErr };

  if (alerte_santes?.length > 0) {
    await _supa.from('alertes').insert({
      type: 'alerte_sante', patient_id: userId,
      patient_prenom: prenom, flags: alerte_santes, lu: false,
    });
  }

  return { data };
}

// ── Inscription diététicien ──────────────────────────────────
async function inscrireDieteticien({ email, password, prenom, nom, tel,
  siteWeb, cabinet, rpps, specialite, adeli, formule }) {

  if (!MODE_SUPA || !_supa) {
    const diet = {
      id: 'd_' + Date.now(), email, prenom, nom, tel,
      site_web: siteWeb, cabinet, rpps, specialite, adeli, formule,
      statut_rpps: 'en_attente', created_at: new Date().toISOString()
    };
    localStorage.setItem('nutridoc_dieteticien', JSON.stringify(diet));
    localStorage.setItem('nutridoc_current_user', JSON.stringify({ ...diet, role: 'dietitian' }));
    window.location.href = 'dietitian.html';
    return { data: { user: diet } };
  }

  const { data, error } = await _supa.auth.signUp({
    email, password,
    options: { data: { role: 'dietitian', prenom, nom } }
  });
  if (error) return { error };

  const { error: profErr } = await _supa.from('profiles').upsert({
    id: data.user.id,
    role: 'dietitian',
    email,          // ← ajouté
    prenom, nom, tel,
    site_web: siteWeb,
    cabinet, rpps, specialite, adeli,
    formule: formule || 'essentiel',
    statut_rpps: 'en_attente',
  });
  if (profErr) return { error: profErr };

  return { data };
}

// ── Inscription prescripteur ─────────────────────────────────
async function inscrirePrescripteur({ email, password, prenom, nom,
  profession, tel, site, cabinet, siret, objectifs, pack }) {

  // Crédits selon le pack sélectionné
  // Clés nouvelles (credits_solo…) ET anciennes ('10','20','50') pour compatibilité
  const creditsMap = {
    'credits_solo':     1,   'solo':     1,  '1':   1,
    'credits_standard': 10,  'standard': 10, '10':  10,
    'credits_expert':   50,  'expert':   50, '50':  50,
    'credits_volume':   100, 'volume':   100,'100': 100,
  };
  const credits = creditsMap[pack] ?? 10;

  if (!MODE_SUPA || !_supa) {
    const presc = {
      id: 'pr_' + Date.now(), email, prenom, nom, profession, tel,
      site_web: site, cabinet, siret,
      objectifs_autorises: objectifs, credits,
      statut: 'actif', created_at: new Date().toISOString()
    };
    localStorage.setItem('nutridoc_prescripteur', JSON.stringify(presc));
    localStorage.setItem('nutridoc_current_user', JSON.stringify({ ...presc, role: 'prescriber' }));
    window.location.href = 'prescripteur-dashboard.html';
    return { data: { user: presc } };
  }

  const { data, error } = await _supa.auth.signUp({
    email, password,
    options: { data: { role: 'prescriber', prenom, nom } }
  });
  if (error) return { error };

  const { error: profErr } = await _supa.from('profiles').upsert({
    id: data.user.id,
    role: 'prescriber',
    email,          // ← ajouté
    prenom, nom, profession, tel,
    site_web: site,
    cabinet,
    siret,          // ← ajouté (remplace certif)
    objectifs_autorises: objectifs,
    credits,
    statut: 'actif',
    // certif et pack_initial supprimés (colonnes absentes du schéma)
  });
  if (profErr) return { error: profErr };

  return { data };
}

// ── Connexion universelle ────────────────────────────────────
async function connecter(email, password) {
  if (!MODE_SUPA || !_supa) {
    const bilan = JSON.parse(localStorage.getItem('nutridoc_bilan') || '{}');
    const diet  = JSON.parse(localStorage.getItem('nutridoc_dieteticien') || '{}');
    const presc = JSON.parse(localStorage.getItem('nutridoc_prescripteur') || '{}');
    if (bilan.email === email) { window.location.href = 'dashboard.html'; return { data: { user: bilan } }; }
    if (diet.email  === email) { window.location.href = 'dietitian.html'; return { data: { user: diet } }; }
    if (presc.email === email) { window.location.href = 'prescripteur-dashboard.html'; return { data: { user: presc } }; }
    return { error: { message: 'Email ou mot de passe incorrect' } };
  }

  const { data, error } = await _supa.auth.signInWithPassword({ email, password });
  if (error) return { error };

  const { data: profile } = await _supa
    .from('profiles').select('role').eq('id', data.user.id).single();

  window.location.href = ROLE_REDIRECT[profile?.role] || 'index.html';
  return { data };
}

// ── BILANS ───────────────────────────────────────────────────
async function getBilan() {
  const user = await getUser();
  if (!user) return JSON.parse(localStorage.getItem('nutridoc_bilan') || 'null');
  const { data } = await _supa.from('bilans')
    .select('*').eq('patient_id', user.id)
    .order('created_at', { ascending: false }).limit(1).single();
  return data;
}

async function updateBilanStatut(patientId, statut) {
  return _supa.from('bilans').update({ statut }).eq('patient_id', patientId);
}

// ── PLANS ────────────────────────────────────────────────────
async function getPlan() {
  const user = await getUser();
  if (!user) return null;
  const { data } = await _supa.from('plans')
    .select('*').eq('patient_id', user.id)
    .order('created_at', { ascending: false }).limit(1).single();
  return data;
}

async function sauvegarderPlan(patientId, planData, dietitianId) {
  return _supa.from('plans').upsert({
    patient_id: patientId, dietitian_id: dietitianId,
    contenu: planData, statut: 'valide',
    valide_at: new Date().toISOString()
  });
}

async function confirmerPaiementPlan(patientId) {
  return _supa.from('bilans')
    .update({ paiement: 'confirme', statut: 'attente_validation' })
    .eq('patient_id', patientId);
}

// ── DIÉTÉ — dossiers ─────────────────────────────────────────
async function getDossiersDietitian() {
  return _supa.from('bilans')
    .select('*, profiles(prenom, nom, poids, taille, age)')
    .in('statut', ['en_attente', 'attente_validation'])
    .order('created_at', { ascending: true });
}

async function getAlertesRedFlag() {
  const user = await getUser();
  if (!user) return JSON.parse(localStorage.getItem('nutridoc_alertes') || '[]');
  const { data } = await _supa.from('alertes')
    .select('*').eq('lu', false).order('created_at', { ascending: false });
  return data || [];
}

async function marquerAlertesLues() {
  return _supa.from('alertes').update({ lu: true }).eq('lu', false);
}

// ── PRESCRIPTEUR — clients CRM ───────────────────────────────
async function getClients() {
  const user = await getUser();
  if (!user) return JSON.parse(localStorage.getItem('nutridoc_crm_clients') || '[]');
  const { data } = await _supa.from('clients_prescripteur')
    .select('*').eq('prescripteur_id', user.id)
    .order('created_at', { ascending: false });
  return data || [];
}

async function creerClient(clientData) {
  const user = await getUser();
  if (!user) return { error: 'Non connecté' };
  return _supa.from('clients_prescripteur').insert({ ...clientData, prescripteur_id: user.id });
}

async function updateClient(clientId, updates) {
  return _supa.from('clients_prescripteur').update(updates).eq('id', clientId);
}

async function ajouterMesurePoids(clientId, poids) {
  const { data: client } = await _supa.from('clients_prescripteur')
    .select('mesures').eq('id', clientId).single();
  const mesures = [...(client?.mesures || []), { date: new Date().toISOString(), poids }];
  return _supa.from('clients_prescripteur').update({ mesures }).eq('id', clientId);
}

async function demanderPlanClient(clientId, objectif, notes) {
  const user    = await getUser();
  const profile = await getProfile();
  if (!user || !profile) return { error: 'Non connecté' };
  if ((profile.credits || 0) <= 0) return { error: 'Plus de crédits disponibles' };

  await _supa.from('profiles').update({ credits: profile.credits - 1 }).eq('id', user.id);

  return _supa.from('demandes_plans').insert({
    client_id: clientId, prescripteur_id: user.id,
    objectif, notes, statut: 'en_attente',
  });
}

async function rechargerCredits(nbCredits) {
  const user    = await getUser();
  const profile = await getProfile();
  if (!user) return;
  return _supa.from('profiles')
    .update({ credits: (profile?.credits || 0) + nbCredits })
    .eq('id', user.id);
}

// ── Fallback localStorage (dev sans Supabase) ────────────────
const LS = {
  getBilan:    () => JSON.parse(localStorage.getItem('nutridoc_bilan') || 'null'),
  saveBilan:   (d) => localStorage.setItem('nutridoc_bilan', JSON.stringify(d)),
  getProfile:  () => JSON.parse(localStorage.getItem('nutridoc_dieteticien') || 'null'),
  getPresc:    () => JSON.parse(localStorage.getItem('nutridoc_prescripteur') || 'null'),
  getClients:  () => JSON.parse(localStorage.getItem('nutridoc_crm_clients') || '[]'),
  saveClients: (d) => localStorage.setItem('nutridoc_crm_clients', JSON.stringify(d)),
  getAlertes:  () => JSON.parse(localStorage.getItem('nutridoc_alertes') || '[]'),
};

// ── Exports globaux ──────────────────────────────────────────
window._supa                  = _supa;
window.MODE_SUPA              = MODE_SUPA;
window.getUser                = getUser;
window.getProfile             = getProfile;
window.getCurrentUser         = getCurrentUser;
window.deconnecter            = deconnecter;
window.connecter              = connecter;
window.reinitialiserMotDePasse = reinitialiserMotDePasse;
window.inscrirePatient        = inscrirePatient;
window.inscrireDieteticien    = inscrireDieteticien;
window.inscrirePrescripteur   = inscrirePrescripteur;
window.getBilan               = getBilan;
window.getPlan                = getPlan;
window.getDossiersDietitian   = getDossiersDietitian;
window.getAlertesRedFlag      = getAlertesRedFlag;
window.marquerAlertesLues     = marquerAlertesLues;
window.getClients             = getClients;
window.rechargerCredits       = rechargerCredits;
window.creerClient            = creerClient;
window.updateClient           = updateClient;
window.ajouterMesurePoids     = ajouterMesurePoids;
window.demanderPlanClient     = demanderPlanClient;
window.LS                     = LS;

console.log('[auth.js] v1.2.0 — MODE_SUPA:', MODE_SUPA);
