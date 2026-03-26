// ============================================================
// auth.js — NutriPlan · Supabase Auth

// ============================================================

const SUPABASE_URL      = 'https://phgjpwaptrrjonoimmne.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1qUFDTMK8V0YQ19kHywSig_I4XBpZa2';

const _supa = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

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
  const { data } = await _supa.from('profiles').select('*').eq('id', user.id).single();
  return data;
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
  window.location.href = 'index.html';
}

// ── Inscription patient ──────────────────────────────────────
async function inscrirePatient({ email, password, prenom, age, poids, taille, objectif, activite, regime, redflags }) {
  const { data, error } = await _supa.auth.signUp({
    email, password,
    options: { data: { role: 'patient', prenom } }
  });
  if (error) return { error };

  const userId = data.user.id;

  // Sauvegarder le bilan
  const { error: bilanErr } = await _supa.from('bilans').insert({
    patient_id: userId,
    prenom, age, poids, taille, objectif, activite, regime,
    redflags: redflags || [],
    statut: redflags?.length > 0 ? 'redflag' : 'en_attente',
    created_at: new Date().toISOString()
  });
  if (bilanErr) return { error: bilanErr };

  // Si red flag → alerter les diét
  if (redflags?.length > 0) {
    await _supa.from('alertes').insert({
      type: 'redflag',
      patient_id: userId,
      patient_prenom: prenom,
      flags: redflags,
      lu: false,
      created_at: new Date().toISOString()
    });
  }

  return { data };
}

// ── Inscription diététicien ──────────────────────────────────
async function inscrireDieteticien({ email, password, prenom, nom, tel, siteWeb, cabinet, rpps, specialite, adeli, formule }) {
  const { data, error } = await _supa.auth.signUp({
    email, password,
    options: { data: { role: 'dietitian', prenom, nom } }
  });
  if (error) return { error };

  const { error: profErr } = await _supa.from('profiles').upsert({
    id: data.user.id,
    role: 'dietitian',
    prenom, nom, tel,
    site_web: siteWeb,
    cabinet, rpps, specialite, adeli, formule,
    statut_rpps: 'verifie',
    created_at: new Date().toISOString()
  });
  if (profErr) return { error: profErr };

  return { data };
}

// ── Inscription prescripteur ─────────────────────────────────
async function inscrirePrescripteur({ email, password, prenom, nom, profession, tel, site, cabinet, certif, objectifs, pack }) {
  const creditsMap = { '10': 10, '20': 20, '50': 50 };
  const { data, error } = await _supa.auth.signUp({
    email, password,
    options: { data: { role: 'prescriber', prenom, nom } }
  });
  if (error) return { error };

  const { error: profErr } = await _supa.from('profiles').upsert({
    id: data.user.id,
    role: 'prescriber',
    prenom, nom, profession, tel,
    site_web: site,
    cabinet, certif,
    objectifs_autorises: objectifs,
    credits: creditsMap[pack] || 10,
    pack_initial: pack,
    created_at: new Date().toISOString()
  });
  if (profErr) return { error: profErr };

  return { data };
}

// ── Connexion universelle ────────────────────────────────────
async function connecter(email, password) {
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
  if (!user) return null;
  const { data } = await _supa.from('bilans').select('*').eq('patient_id', user.id).order('created_at', { ascending: false }).limit(1).single();
  return data;
}
async function updateBilanStatut(patientId, statut) {
  return _supa.from('bilans').update({ statut }).eq('patient_id', patientId);
}

// ── PLANS ────────────────────────────────────────────────────
async function getPlan() {
  const user = await getUser();
  if (!user) return null;
  const { data } = await _supa.from('plans').select('*').eq('patient_id', user.id).order('created_at', { ascending: false }).limit(1).single();
  return data;
}
async function sauvegarderPlan(patientId, planData, dietitianId) {
  return _supa.from('plans').upsert({
    patient_id: patientId,
    dietitian_id: dietitianId,
    contenu: planData,
    statut: 'valide',
    valide_at: new Date().toISOString()
  });
}
async function confirmerPaiementPlan(patientId) {
  return _supa.from('bilans').update({ paiement: 'confirme', statut: 'attente_validation' }).eq('patient_id', patientId);
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
  if (!user) return [];
  const { data } = await _supa.from('alertes').select('*').eq('lu', false).order('created_at', { ascending: false });
  return data || [];
}
async function marquerAlertesLues() {
  return _supa.from('alertes').update({ lu: true }).eq('lu', false);
}

// ── PRESCRIPTEUR — clients CRM ───────────────────────────────
async function getClients() {
  const user = await getUser();
  if (!user) return [];
  const { data } = await _supa.from('clients_prescripteur')
    .select('*').eq('prescripteur_id', user.id).order('created_at', { ascending: false });
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
  const { data: client } = await _supa.from('clients_prescripteur').select('mesures').eq('id', clientId).single();
  const mesures = [...(client?.mesures || []), { date: new Date().toISOString(), poids }];
  return _supa.from('clients_prescripteur').update({ mesures }).eq('id', clientId);
}
async function demanderPlanClient(clientId, objectif, notes) {
  const user   = await getUser();
  const profile = await getProfile();
  if (!user || !profile) return { error: 'Non connecté' };

  if ((profile.credits || 0) <= 0) return { error: 'Plus de crédits disponibles' };

  // Décrémenter les crédits
  await _supa.from('profiles').update({ credits: profile.credits - 1 }).eq('id', user.id);

  // Créer la demande
  return _supa.from('demandes_plans').insert({
    client_id: clientId,
    prescripteur_id: user.id,
    objectif, notes,
    statut: 'en_attente',
    created_at: new Date().toISOString()
  });
}
async function rechargerCredits(nbCredits) {
  const user    = await getUser();
  const profile = await getProfile();
  if (!user) return;
  return _supa.from('profiles').update({ credits: (profile?.credits || 0) + nbCredits }).eq('id', user.id);
}

// ── Fallback localStorage (dev sans Supabase) ────────────────
// Si Supabase n'est pas configuré, on retombe sur localStorage
// pour que le projet fonctionne en mode démo.
const LS = {
  getBilan:    () => JSON.parse(localStorage.getItem('nutri_bilan') || 'null'),
  saveBilan:   (d) => localStorage.setItem('nutri_bilan', JSON.stringify(d)),
  getProfile:  () => JSON.parse(localStorage.getItem('nutri_dieteticien') || 'null'),
  getPresc:    () => JSON.parse(localStorage.getItem('nutri_prescripteur') || 'null'),
  getClients:  () => JSON.parse(localStorage.getItem('nutri_crm_clients') || '[]'),
  saveClients: (d) => localStorage.setItem('nutri_crm_clients', JSON.stringify(d)),
  getAlertes:  () => JSON.parse(localStorage.getItem('nutri_alertes') || '[]'),
};

// ── Détection mode (Supabase ou démo) ───────────────────────
const MODE_SUPA = !!window.supabase && SUPABASE_URL !== 'https://VOTRE-ID.supabase.co';
