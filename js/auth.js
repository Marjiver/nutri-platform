// ============================================================
// auth.js — NutriDoc · Supabase Auth

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
async function inscrirePatient({ email, password, prenom, age, poids, taille, objectif, activite, regime, alerte_santes }) {
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
    alerte_santes: alerte_santes || [],
    statut: alerte_santes?.length > 0 ? 'alerte_sante' : 'en_attente',
    created_at: new Date().toISOString()
  });
  if (bilanErr) return { error: bilanErr };

  // Si alerte santé → alerter les diét
  if (alerte_santes?.length > 0) {
    await _supa.from('alertes').insert({
      type: 'alerte_sante',
      patient_id: userId,
      patient_prenom: prenom,
      flags: alerte_santes,
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
  getBilan:    () => JSON.parse(localStorage.getItem('nutridoc_bilan') || 'null'),
  saveBilan:   (d) => localStorage.setItem('nutridoc_bilan', JSON.stringify(d)),
  getProfile:  () => JSON.parse(localStorage.getItem('nutridoc_dieteticien') || 'null'),
  getPresc:    () => JSON.parse(localStorage.getItem('nutridoc_prescripteur') || 'null'),
  getClients:  () => JSON.parse(localStorage.getItem('nutridoc_crm_clients') || '[]'),
  saveClients: (d) => localStorage.setItem('nutridoc_crm_clients', JSON.stringify(d)),
  getAlertes:  () => JSON.parse(localStorage.getItem('nutridoc_alertes') || '[]'),
};

// ── Détection mode (Supabase ou démo) ───────────────────────
const MODE_SUPA = !!window.supabase && SUPABASE_URL !== 'https://VOTRE-ID.supabase.co';

// ═══════════════════════════════════════════════════════════════════
// INSCRIPTION DIÉTÉTICIEN — appelée depuis inscription-dieteticien.js
// ═══════════════════════════════════════════════════════════════════
async function inscrireDieteticien(payload) {
  try {
    // 1. Créer le compte Auth Supabase
    const { data: authData, error: authError } = await _supa.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        emailRedirectTo: window.location.origin + '/login.html?role=dietitian&confirmed=1',
        data: {
          role:      'dietitian',
          prenom:    payload.prenom,
          nom:       payload.nom,
          tel:       payload.tel || '',
          rpps:      payload.rpps || '',
          specialite:payload.specialite || '',
          cabinet:   payload.cabinet || '',
          formule:   payload.formule || 'essentiel',
        }
      }
    });

    if (authError) return { error: authError };

    const userId = authData.user?.id;
    if (!userId) return { error: { message: 'Erreur création compte — réessayez.' } };

    // 2. Insérer le profil complet dans la table profiles
    const { error: profError } = await _supa.from('profiles').upsert({
      id:           userId,
      role:         'dietitian',
      prenom:       payload.prenom,
      nom:          payload.nom,
      email:        payload.email,
      tel:          payload.tel || null,
      site_web:     payload.siteWeb || null,
      cabinet:      payload.cabinet || null,
      rpps:         payload.rpps || null,
      specialite:   payload.specialite || null,
      adeli:        payload.adeli || null,
      iban:         payload.iban || null,
      formule:      payload.formule || 'essentiel',
      statut_rpps:  'en_attente',
      statut:       'actif',
      mode_pilote:  false,
      code_parrainage: Math.random().toString(36).substr(2, 8).toUpperCase(),
    });

    if (profError) {
      console.error('Erreur profil diét.:', profError);
      return { error: { message: 'Compte créé mais erreur profil. Contactez le support.' } };
    }

    // Envoyer email de bienvenue via Edge Function
    try {
      await _supa.functions.invoke('send-email', {
        body: {
          type: 'bienvenue',
          to: payload.email,
          data: {
            role:    'dietitian',
            prenom:  payload.prenom,
            nom:     payload.nom,
            formule: payload.formule || 'essentiel',
            credits: 0,
          }
        }
      });
    } catch(emailErr) { console.warn('Email bienvenue non envoyé:', emailErr); }

    return { data: authData, error: null };

  } catch (err) {
    console.error('inscrireDieteticien:', err);
    return { error: { message: 'Erreur inattendue. Réessayez.' } };
  }
}

// ═══════════════════════════════════════════════════════════════════
// INSCRIPTION PRESCRIPTEUR — appelée depuis inscription-prescripteur.js
// ═══════════════════════════════════════════════════════════════════
async function inscrirePrescripteur(payload) {
  try {
    // 1. Créer le compte Auth Supabase
    const { data: authData, error: authError } = await _supa.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        emailRedirectTo: window.location.origin + '/login.html?role=prescriber&confirmed=1',
        data: {
          role:      'prescriber',
          prenom:    payload.prenom,
          nom:       payload.nom,
          tel:       payload.tel || '',
          profession:payload.profession || '',
          siret:     payload.siret || '',
          cabinet:   payload.cabinet || '',
          pack:      payload.pack || 'decouverte',
        }
      }
    });

    if (authError) return { error: authError };

    const userId = authData.user?.id;
    if (!userId) return { error: { message: 'Erreur création compte — réessayez.' } };

    // 2. Insérer le profil complet dans la table profiles
    const { error: profError } = await _supa.from('profiles').upsert({
      id:                  userId,
      role:                'prescriber',
      prenom:              payload.prenom,
      nom:                 payload.nom,
      email:               payload.email,
      tel:                 payload.tel || null,
      site_web:            payload.site || payload.siteWeb || null,
      cabinet:             payload.cabinet || null,
      profession:          payload.profession || null,
      siret:               payload.siret || null,
      objectifs_autorises: payload.objectifs || [],
      pack:                payload.pack || 'decouverte',
      credits:             payload.pack === 'expert' ? 50 : payload.pack === 'standard' ? 10 : 1,
      statut:              'actif',
      mode_pilote:         false,
      code_parrainage:     Math.random().toString(36).substr(2, 8).toUpperCase(),
    });

    if (profError) {
      console.error('Erreur profil prescripteur:', profError);
      return { error: { message: 'Compte créé mais erreur profil. Contactez le support.' } };
    }

    // Envoyer email de bienvenue via Edge Function
    try {
      await _supa.functions.invoke('send-email', {
        body: {
          type: 'bienvenue',
          to: payload.email,
          data: {
            role:    'prescriber',
            prenom:  payload.prenom,
            nom:     payload.nom,
            pack:    payload.pack || 'decouverte',
            credits: payload.pack === 'expert' ? 50 : payload.pack === 'standard' ? 10 : 1,
          }
        }
      });
    } catch(emailErr) { console.warn('Email bienvenue non envoyé:', emailErr); }

    return { data: authData, error: null };

  } catch (err) {
    console.error('inscrirePrescripteur:', err);
    return { error: { message: 'Erreur inattendue. Réessayez.' } };
  }
}
