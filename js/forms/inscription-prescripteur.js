/**
 * inscription-prescripteur.js — NutriDoc
 * Formulaire d'inscription pour les prescripteurs (médecins, coachs, kinés, etc.)
 * Version corrigée avec gestion asynchrone correcte
 */

let currentPrescStep = 1;
const totalPrescSteps = 3;
let packSelectionne = '20';

const PACKS = {
  '10': 'Découverte — 10 crédits · 50 € HT',
  '20': 'Pro — 20 crédits · 89 € HT',
  '50': 'Volume — 50 crédits · 219 € HT'
};

// ── Sélection du pack ─────────────────────────────────────────
function selectPack(pack, el) {
  packSelectionne = pack;
  document.querySelectorAll('.pricing-diet-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  const recap = document.getElementById('pPackRecapName');
  const hidden = document.getElementById('pPackHidden');
  if (recap) recap.textContent = PACKS[pack];
  if (hidden) hidden.value = pack;
}

function scrollToPacks() {
  document.getElementById('packCard10')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ── Navigation étapes ─────────────────────────────────────────
function showPrescStep(n) {
  document.querySelectorAll('#inscriptionPrescForm .insc-step').forEach(s => s.classList.remove('active'));
  document.querySelector(`#inscriptionPrescForm .insc-step[data-step="${n}"]`)?.classList.add('active');
  
  for (let i = 1; i <= totalPrescSteps; i++) {
    const el = document.getElementById('pProgStep' + i);
    if (!el) continue;
    el.classList.remove('active', 'done');
    if (i === n) el.classList.add('active');
    else if (i < n) el.classList.add('done');
    const dot = el.querySelector('.insc-prog-dot');
    if (dot) {
      dot.style.background = i <= n ? '#0ea5e9' : '';
      dot.style.color = i <= n ? '#fff' : '';
    }
  }
  const formulaireSection = document.getElementById('formulaireSection');
  if (formulaireSection) {
    window.scrollTo({ top: formulaireSection.offsetTop - 80 || 0, behavior: 'smooth' });
  }
}

function nextPrescStep() {
  if (!validatePrescStep(currentPrescStep)) return;
  if (currentPrescStep < totalPrescSteps) {
    currentPrescStep++;
    showPrescStep(currentPrescStep);
  }
}

function prevPrescStep() {
  if (currentPrescStep > 1) {
    currentPrescStep--;
    showPrescStep(currentPrescStep);
  }
}

function validatePrescStep(step) {
  if (step === 1) {
    if (!document.getElementById('pPrenom').value.trim() || !document.getElementById('pNom').value.trim()) {
      showPrescError('Veuillez renseigner votre prénom et nom.');
      return false;
    }
    if (!document.getElementById('pProfession').value) {
      showPrescError('Veuillez sélectionner votre profession.');
      return false;
    }
    const email = document.getElementById('pEmail').value.trim();
    if (!email || !email.includes('@')) {
      showPrescError('Email invalide.');
      return false;
    }
    const password = document.getElementById('pPassword')?.value || '';
    if (password.length > 0 && password.length < 8) {
      showPrescError('Le mot de passe doit contenir au moins 8 caractères.');
      return false;
    }
  }
  if (step === 2) {
    if (getSiretRaw().length !== 14) {
      showPrescError('Le SIRET doit contenir exactement 14 chiffres.');
      return false;
    }
    const checked = document.querySelectorAll('input[name="pObjectif"]:checked');
    if (checked.length === 0) {
      showPrescError('Veuillez sélectionner au moins un objectif.');
      return false;
    }
  }
  if (step === 3) {
    const cgu = document.getElementById('pCgu')?.checked;
    if (!cgu) {
      showPrescError('Veuillez accepter les CGU.');
      return false;
    }
  }
  return true;
}

function showPrescError(msg) {
  document.querySelector('.insc-error')?.remove();
  const div = document.createElement('div');
  div.className = 'insc-error';
  div.textContent = msg;
  const step = document.querySelector('#inscriptionPrescForm .insc-step.active');
  const target = step?.querySelector('.btn-row') || step?.querySelector('button');
  if (target && step) {
    step.insertBefore(div, target);
  } else {
    const form = document.getElementById('inscriptionPrescForm');
    if (form) form.insertBefore(div, form.firstChild);
  }
  setTimeout(() => div.remove(), 4000);
}

// ── SIRET — format XXX XXX XXX XXXXX (14 chiffres) ─────────────
function getSiretRaw() {
  const input = document.getElementById('siretInput');
  return input ? (input.value || '').replace(/\D/g, '') : '';
}

function formatSiret(input) {
  const raw = input.value.replace(/\D/g, '').slice(0, 14);
  let f = raw;
  if (raw.length > 3) f = raw.slice(0, 3) + ' ' + raw.slice(3);
  if (raw.length > 6) f = raw.slice(0, 3) + ' ' + raw.slice(3, 6) + ' ' + raw.slice(6);
  if (raw.length > 9) f = raw.slice(0, 3) + ' ' + raw.slice(3, 6) + ' ' + raw.slice(6, 9) + ' ' + raw.slice(9);
  input.value = f;

  const status = document.getElementById('siretStatus');
  if (status) {
    status.innerHTML = raw.length === 14
      ? '<span class="rpps-ok">✓ 14 / 14 chiffres</span>'
      : `<span class="rpps-hint">${raw.length} / 14 chiffres</span>`;
  }
  const feedback = document.getElementById('siretFeedback');
  if (feedback) feedback.textContent = '';
}

/**
 * Vérifie le SIRET via l'API publique annuaire-entreprises.data.gouv.fr
 * Fonction async corrigée
 */
async function verifierSiret() {
  if (!validatePrescStep(2)) return;
  
  const siret = getSiretRaw();
  const btn = document.getElementById('btnVerifSiret');
  const feedback = document.getElementById('siretFeedback');
  
  if (!btn || !feedback) return;
  
  btn.textContent = 'Vérification…';
  btn.disabled = true;

  try {
    // Appel API asynchrone
    const res = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${siret}&page=1&per_page=1`);
    const data = await res.json();
    const entreprise = data?.results?.[0];

    if (!entreprise) {
      feedback.innerHTML = '<span class="rpps-error">✗ SIRET introuvable dans l\'annuaire des entreprises. Vérifiez le numéro.</span>';
      btn.textContent = 'Vérifier le SIRET →';
      btn.disabled = false;
      return;
    }

    const nom = entreprise.nom_complet || entreprise.nom_raison_sociale || 'Entreprise trouvée';
    const actif = entreprise.etat_administratif !== 'F'; // F = fermée

    if (!actif) {
      feedback.innerHTML = '<span class="rpps-error">✗ Cette entreprise est fermée selon l\'annuaire officiel.</span>';
      btn.textContent = 'Vérifier le SIRET →';
      btn.disabled = false;
      return;
    }

    feedback.innerHTML = `<span class="rpps-ok">✓ Vérifié — ${nom} — entreprise active</span>`;
    
    const siretVerifie = document.getElementById('pSiretVerifie');
    if (siretVerifie) siretVerifie.value = siret;

    setTimeout(() => {
      currentPrescStep = 3;
      showPrescStep(3);
      btn.textContent = 'Vérifier le SIRET →';
      btn.disabled = false;
    }, 700);

  } catch (e) {
    console.warn('[SIRET] API indisponible:', e);
    // Fallback si l'API est indisponible
    feedback.innerHTML = '<span style="color:#f59e0b;">⚠ API indisponible — SIRET enregistré, vérification manuelle à la validation.</span>';
    const siretVerifie = document.getElementById('pSiretVerifie');
    if (siretVerifie) siretVerifie.value = siret;
    setTimeout(() => {
      currentPrescStep = 3;
      showPrescStep(3);
      btn.textContent = 'Vérifier le SIRET →';
      btn.disabled = false;
    }, 1200);
  }
}

// ── Aperçu coordonnées ────────────────────────────────────────
const TITRES = {
  medecin: 'Médecin généraliste',
  kine: 'Kinésithérapeute DE',
  infirmier: 'Infirmier(e) DE',
  sage_femme: 'Sage-femme',
  medecin_sport: 'Médecin du sport',
  ergotherapeute: 'Ergothérapeute',
  psychologue: 'Psychologue',
  coach_sportif: 'Coach sportif certifié',
  preparateur: 'Préparateur physique',
  educateur_sportif: 'Éducateur sportif',
  osteopathe: 'Ostéopathe',
  naturopathe: 'Naturopathe déclaré',
  autre: 'Professionnel de santé déclaré'
};

function updatePrescPreview() {
  const prenom = document.getElementById('pPrenom')?.value.trim() || '';
  const nom = document.getElementById('pNom')?.value.trim() || '';
  const prof = document.getElementById('pProfession')?.value || '';
  const cab = document.getElementById('pCabinet')?.value.trim() || '';
  const tel = document.getElementById('pTel')?.value.trim() || '';
  const site = document.getElementById('pSite')?.value.trim() || '';
  
  const prevNom = document.getElementById('pPrevNom');
  const prevTitre = document.getElementById('pPrevTitre');
  const prevCabinet = document.getElementById('pPrevCabinet');
  const prevContact = document.getElementById('pPrevContact');
  const coordPreview = document.getElementById('pCoordPreview');
  
  if (prevNom) prevNom.textContent = (prenom || 'Prénom') + ' ' + (nom ? nom.toUpperCase() : 'NOM');
  if (prevTitre) prevTitre.textContent = TITRES[prof] || 'Professionnel de santé';
  if (prevCabinet) prevCabinet.textContent = cab;
  if (prevContact) prevContact.textContent = [tel, site].filter(Boolean).join(' · ') || '';
  if (coordPreview) coordPreview.style.opacity = (prenom || nom) ? '1' : '0.4';
}

// ── Mot de passe ──────────────────────────────────────────────
function checkPwdP(val) {
  const bar = document.getElementById('pPwdStrength');
  if (!bar) return;
  
  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const labels = ['', 'Faible', 'Moyen', 'Fort', 'Très fort'];
  const colors = ['', '#ef4444', '#f97316', '#22c55e', '#16a34a'];
  
  bar.innerHTML = val.length === 0 ? '' :
    '<div class="pwd-bar"><div class="pwd-fill" style="width:' + (score * 25) + '%;background:' + colors[score] + '"></div></div>' +
    '<span style="font-size:.75rem;color:' + colors[score] + '">' + labels[score] + '</span>';
}

function togglePwdP() {
  const inp = document.getElementById('pPassword');
  if (inp) {
    inp.type = inp.type === 'password' ? 'text' : 'password';
  }
}

// ── Vérification du mode Supabase ─────────────────────────────
function isSupaMode() {
  return typeof MODE_SUPA !== 'undefined' && MODE_SUPA === true;
}

// ── Soumission du formulaire (CORRIGÉE avec await partout) ────
async function soumettreInscriptionPresc(e) {
  e.preventDefault();
  
  // Vérifier qu'on est à l'étape 3
  if (currentPrescStep !== 3) {
    console.warn('Tentative de soumission hors étape 3');
    return;
  }
  
  if (!validatePrescStep(3)) return;
  
  const pwd = document.getElementById('pPassword')?.value || '';
  const pwdConfirm = document.getElementById('pPasswordConfirm')?.value || '';
  
  if (pwd.length < 8) {
    showPrescError('Mot de passe trop court (8 caractères minimum).');
    return;
  }
  if (pwd !== pwdConfirm) {
    showPrescError('Les mots de passe ne correspondent pas.');
    return;
  }
  
  const cgu = document.getElementById('pCgu')?.checked;
  if (!cgu) {
    showPrescError('Veuillez accepter les CGU.');
    return;
  }
  
  const btn = document.querySelector('#inscriptionPrescForm .btn-submit');
  if (btn) {
    btn.textContent = 'Création en cours…';
    btn.disabled = true;
  }
  
  // Récupération des valeurs du formulaire
  const objectifs = Array.from(document.querySelectorAll('input[name="pObjectif"]:checked')).map(c => c.value);
  const payload = {
    email: document.getElementById('pEmail')?.value.trim() || '',
    password: document.getElementById('pPassword')?.value || '',
    prenom: document.getElementById('pPrenom')?.value.trim() || '',
    nom: document.getElementById('pNom')?.value.trim() || '',
    profession: document.getElementById('pProfession')?.value || '',
    tel: document.getElementById('pTel')?.value.trim() || '',
    site: document.getElementById('pSite')?.value.trim() || '',
    cabinet: document.getElementById('pCabinet')?.value.trim() || '',
    siret: document.getElementById('pSiretVerifie')?.value || getSiretRaw(),
    objectifs: objectifs,
    pack: packSelectionne
  };
  
  try {
    // Mode Supabase
    if (isSupaMode() && typeof inscrirePrescripteur !== 'undefined') {
      const result = await inscrirePrescripteur(payload);
      if (result.error) {
        showPrescError(result.error.message || 'Erreur inscription.');
        if (btn) {
          btn.textContent = 'Créer mon compte →';
          btn.disabled = false;
        }
        return;
      }
    } else {
      // Mode localStorage (démo)
      const existingPresc = JSON.parse(localStorage.getItem('nutridoc_prescripteur') || '{}');
      if (existingPresc.email === payload.email) {
        showPrescError('Un compte existe déjà avec cet email.');
        if (btn) {
          btn.textContent = 'Créer mon compte →';
          btn.disabled = false;
        }
        return;
      }
      
      localStorage.setItem('nutridoc_prescripteur', JSON.stringify({
        ...payload,
        credits: parseInt(packSelectionne),
        statut: 'actif',
        created_at: new Date().toISOString()
      }));
      
      // Envoyer email de bienvenue si disponible
      if (typeof Email !== 'undefined' && Email.bienvenue) {
        await Email.bienvenue(payload.email, {
          prenom: payload.prenom,
          role: 'prescriber',
          credits: packSelectionne
        }).catch(e => console.warn('[Email] Erreur:', e));
      }
    }
    
    // Succès - afficher confirmation
    const form = document.getElementById('inscriptionPrescForm');
    const confirmation = document.getElementById('prescConfirmation');
    if (form) form.classList.add('hidden');
    if (confirmation) confirmation.classList.remove('hidden');
    
  } catch (err) {
    console.error('[Inscription Prescripteur] Erreur:', err);
    showPrescError('Une erreur est survenue. Veuillez réessayer.');
    if (btn) {
      btn.textContent = 'Créer mon compte →';
      btn.disabled = false;
    }
  }
}

// ── Initialisation ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Ajouter un champ caché pour le SIRET vérifié
  const form = document.getElementById('inscriptionPrescForm');
  if (form && !document.getElementById('pSiretVerifie')) {
    const hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.id = 'pSiretVerifie';
    hidden.name = 'siret';
    form.appendChild(hidden);
  }
  
  // Sélectionner le pack "Pro" (20 crédits) par défaut
  const defaultCard = document.getElementById('packCard20');
  if (defaultCard) {
    selectPack('20', defaultCard);
  }
  
  // Aperçu live des coordonnées
  const previewFields = ['pPrenom', 'pNom', 'pProfession', 'pTel', 'pCabinet', 'pSite'];
  previewFields.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('input', updatePrescPreview);
    }
  });
  updatePrescPreview();
  
  // Intercepter Entrée sur les étapes 1 et 2
  if (form) {
    form.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && currentPrescStep < 3) {
        e.preventDefault();
        if (currentPrescStep === 1) nextPrescStep();
        else if (currentPrescStep === 2) verifierSiret();
      }
    });
    
    // Soumission du formulaire
    form.addEventListener('submit', soumettreInscriptionPresc);
  }
  
  // Exposer les fonctions globales nécessaires
  window.nextPrescStep = nextPrescStep;
  window.prevPrescStep = prevPrescStep;
  window.verifierSiret = verifierSiret;
  window.selectPack = selectPack;
  window.scrollToPacks = scrollToPacks;
  window.togglePwdP = togglePwdP;
  window.checkPwdP = checkPwdP;
  window.formatSiret = formatSiret;
  
  console.log('[inscription-prescripteur.js] Initialisé avec succès');
});