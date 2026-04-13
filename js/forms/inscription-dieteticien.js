let currentInscStep = 1;
const totalInscSteps = 3;
let formuleSelectionnee = 'pro'; // Valeur par défaut : Pro

const FORMULES = {
  essentiel: { label: 'Essentiel — 0€/mois · Référencement seul', prix: 0 },
  starter:   { label: 'Starter — 9€/mois · 10 plans inclus', prix: 9 },
  pro:       { label: 'Pro — 29€/mois · 30 plans inclus', prix: 29 },
  expert:    { label: 'Expert — 59€/mois · 100 plans inclus', prix: 59 }
};

// ── Vérification de MODE_SUPA (attendre que auth.js soit chargé) ──
function isSupaMode() {
  return typeof MODE_SUPA !== 'undefined' && MODE_SUPA === true;
}

// ── Tarifs — sélection depuis les cards ──────────────────────
function selectFormule(formule) {
  formuleSelectionnee = formule;
  document.querySelectorAll('.price-row').forEach(c => c.classList.remove('selected'));
  const map = { 
    essentiel: 'essentiel', 
    starter: 'starter', 
    pro: 'pro', 
    expert: 'expert' 
  };
  const selectedCard = document.querySelector(`.price-row[data-formule="${formule}"]`);
  if (selectedCard) selectedCard.classList.add('selected');
  
  // Mettre à jour le récap étape 3
  const hidden = document.getElementById('formuleHidden');
  const recap  = document.getElementById('formuleRecapName');
  if (hidden) hidden.value = formule;
  if (recap) recap.textContent = FORMULES[formule]?.label || formule;
  
  // Afficher l'IBAN uniquement pour les formules payantes
  const ibanSection = document.getElementById('ibanSection');
  if (ibanSection) {
    if (formule === 'essentiel') {
      ibanSection.style.display = 'none';
      // Non obligatoire pour Essentiel
      ['ibanTitulaire','iban','bic'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.required = false; }
      });
      // Afficher la note explicative
      const note = document.getElementById('ibanNote');
      if (note) note.style.display = 'block';
    } else {
      ibanSection.style.display = 'block';
      // IBAN requis pour les formules payantes
      ['ibanTitulaire','iban'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.required = true; }
      });
      // Masquer la note explicative
      const note = document.getElementById('ibanNote');
      if (note) note.style.display = 'none';
    }
  }
}

function scrollToPricing() {
  const pricingCol = document.querySelector('.pricing-col');
  if (pricingCol) {
    pricingCol.scrollIntoView({ behavior:'smooth', block:'center' });
  }
}

// ── Navigation étapes ─────────────────────────────────────────
function showInscStep(n) {
  document.querySelectorAll('#inscriptionForm .insc-step').forEach(s => s.classList.remove('active'));
  const activeStep = document.querySelector('#inscriptionForm .insc-step[data-step="'+n+'"]');
  if (activeStep) activeStep.classList.add('active');

  // Mise à jour barre progression
  for (let i = 1; i <= totalInscSteps; i++) {
    const el = document.getElementById('progStep'+i);
    if (!el) continue;
    el.classList.remove('active','done');
    if (i === n) el.classList.add('active');
    else if (i < n) el.classList.add('done');
  }
  
  const formulaireSection = document.getElementById('formulaireSection');
  if (formulaireSection) {
    window.scrollTo({ top: formulaireSection.offsetTop - 80 || 0, behavior:'smooth' });
  }
}

function nextInscStep() {
  if (!validateStep(currentInscStep)) return;
  if (currentInscStep < totalInscSteps) { 
    currentInscStep++; 
    showInscStep(currentInscStep); 
  }
}

function prevInscStep() {
  if (currentInscStep > 1) { 
    currentInscStep--; 
    showInscStep(currentInscStep); 
  }
}

function validateStep(step) {
  if (step === 1) {
    const prenom = document.getElementById('prenom')?.value.trim();
    const nom = document.getElementById('nom')?.value.trim();
    if (!prenom || !nom) {
      showError('Veuillez renseigner votre prénom et nom.'); 
      return false;
    }
    const email = document.getElementById('email')?.value.trim();
    if (!email || !email.includes('@')) { 
      showError('Email invalide.'); 
      return false;
    }
    const password = document.getElementById('password')?.value || '';
    if (password.length > 0 && password.length < 8) {
      showError('Le mot de passe doit contenir au moins 8 caractères.');
      return false;
    }
  }
  if (step === 2) {
    const rpps = getRppsRaw();
    if (rpps.length !== 11) { 
      showError('Le numéro RPPS doit contenir exactement 11 chiffres.'); 
      return false; 
    }
    const specialite = document.getElementById('specialite')?.value;
    if (!specialite) { 
      showError('Veuillez choisir votre spécialité.'); 
      return false; 
    }
    const rcpCheckbox = document.getElementById('rcpCheckbox');
    if (!rcpCheckbox?.checked) {
      showError('Vous devez certifier disposer d\'une assurance RCP.');
      return false;
    }
  }
  if (step === 3) {
    // IBAN requis uniquement pour les formules payantes
    if (formuleSelectionnee !== 'essentiel') {
      const titulaire = document.getElementById('ibanTitulaire')?.value.trim();
      const iban = document.getElementById('iban')?.value.trim();
      if (!titulaire) { 
        showError('Veuillez renseigner le titulaire du compte.'); 
        return false; 
      }
      if (!iban || iban.length < 14) { 
        showError('Veuillez renseigner un IBAN valide.'); 
        return false; 
      }
    }
    const cgu = document.getElementById('cgu')?.checked;
    if (!cgu) {
      showError('Veuillez accepter les CGU.');
      return false;
    }
  }
  return true;
}

function showError(msg) {
  // Supprimer l'erreur existante
  const existingError = document.querySelector('.insc-error');
  if (existingError) existingError.remove();
  
  const div = document.createElement('div');
  div.className = 'insc-error';
  div.textContent = msg;
  const step = document.querySelector('#inscriptionForm .insc-step.active');
  const target = step?.querySelector('.btn-row') || step?.querySelector('button') || step;
  if (target && step) {
    step.insertBefore(div, target);
  } else {
    const form = document.getElementById('inscriptionForm');
    if (form) form.insertBefore(div, form.firstChild);
  }
  setTimeout(() => div.remove(), 4000);
}

// ── Aperçu coordonnées ────────────────────────────────────────
function updatePreview() {
  const prenom  = document.getElementById('prenom')?.value.trim() || '';
  const nom     = document.getElementById('nom')?.value.trim() || '';
  const cabinet = document.getElementById('cabinet')?.value.trim() || '';
  const tel     = document.getElementById('tel')?.value.trim() || '';
  const site    = document.getElementById('siteWeb')?.value.trim() || '';
  
  const prevNom = document.getElementById('prevNom');
  const prevCabinet = document.getElementById('prevCabinet');
  const prevContact = document.getElementById('prevContact');
  const coordPreview = document.getElementById('coordPreview');
  
  if (prevNom) prevNom.textContent = (prenom || 'Prénom') + ' ' + (nom ? nom.toUpperCase() : 'NOM');
  if (prevCabinet) prevCabinet.textContent = cabinet;
  if (prevContact) prevContact.textContent = [tel, site].filter(Boolean).join(' · ') || '';
  if (coordPreview) coordPreview.style.opacity = (prenom || nom) ? '1' : '0.4';
}

// ── RPPS — format XX XXX XXX XXX (11 chiffres, maxlength 14) ──
function getRppsRaw() {
  const input = document.getElementById('rppsInput');
  return input ? (input.value || '').replace(/\D/g, '') : '';
}

function formatRpps(input) {
  const raw = input.value.replace(/\D/g, '').slice(0, 11);
  let f = raw;
  if (raw.length > 2) f = raw.slice(0,2) + ' ' + raw.slice(2);
  if (raw.length > 5) f = raw.slice(0,2) + ' ' + raw.slice(2,5) + ' ' + raw.slice(5);
  if (raw.length > 8) f = raw.slice(0,2) + ' ' + raw.slice(2,5) + ' ' + raw.slice(5,8) + ' ' + raw.slice(8);
  input.value = f;

  const status   = document.getElementById('rppsStatus');
  const feedback = document.getElementById('rppsFeedback');
  if (feedback) feedback.textContent = '';

  if (status) {
    if (raw.length === 11) {
      status.innerHTML = '<span class="rpps-ok">✓ 11 / 11 chiffres</span>';
    } else {
      status.innerHTML = '<span class="rpps-hint">' + raw.length + ' / 11 chiffres</span>';
    }
  }
}

function verifierRpps() {
  if (!validateStep(2)) return;
  
  const btn      = document.getElementById('btnVerifRpps');
  const feedback = document.getElementById('rppsFeedback');
  if (!btn || !feedback) return;
  
  btn.textContent = 'Vérification…';
  btn.disabled    = true;

  setTimeout(() => {
    const rpps   = getRppsRaw();
    const prenom = document.getElementById('prenom')?.value.trim() || '';
    const nom    = document.getElementById('nom')?.value.trim() || '';

    // Simulation de vérification RPPS
    if (rpps.startsWith('00') || rpps === '00000000000') {
      feedback.innerHTML = '<span class="rpps-error">✗ Numéro RPPS introuvable dans l\'annuaire santé.</span>';
      btn.textContent = 'Vérifier & continuer →';
      btn.disabled = false;
      return;
    }

    feedback.innerHTML = '<span class="rpps-ok">✓ RPPS vérifié — ' + prenom + ' ' + nom.toUpperCase() + ' — enregistré(e)</span>';
    setTimeout(() => {
      currentInscStep = 3;
      showInscStep(3);
      btn.textContent = 'Vérifier & continuer →';
      btn.disabled = false;
    }, 700);
  }, 1500);
}

// ── Mot de passe ──────────────────────────────────────────────
function checkPwd(val) {
  const bar = document.getElementById('pwdStrength');
  if (!bar) return;
  
  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const labels = ['', 'Faible', 'Moyen', 'Fort', 'Très fort'];
  const colors = ['', '#ef4444', '#f97316', '#22c55e', '#16a34a'];
  
  bar.innerHTML = val.length === 0 ? '' :
    '<div class="pwd-bar"><div class="pwd-fill" style="width:'+(score*25)+'%;background:'+colors[score]+'"></div></div>' +
    '<span style="font-size:.75rem;color:'+colors[score]+'">'+labels[score]+'</span>';
}

function togglePwd() {
  const inp = document.getElementById('password');
  if (inp) {
    inp.type = inp.type === 'password' ? 'text' : 'password';
  }
}

// ── Soumission du formulaire ─────────────────────────────────
async function soumettreInscription() {
  // Sécurité : ne soumettre que si on est à l'étape 3
  if (currentInscStep !== 3) {
    console.warn('Tentative de soumission hors étape 3');
    return false;
  }
  
  if (!validateStep(3)) return false;
  
  const pwd = document.getElementById('password')?.value || '';
  if (pwd.length < 8) {
    showError('Mot de passe trop court (8 caractères min).'); 
    return false;
  }
  const pwdConfirm = document.getElementById('passwordConfirm')?.value || '';
  if (pwd !== pwdConfirm) {
    showError('Les mots de passe ne correspondent pas.'); 
    return false;
  }
  
  const submitBtn = document.querySelector('.btn-submit');
  if (submitBtn) {
    submitBtn.textContent = 'Création en cours…';
    submitBtn.disabled = true;
  }

  const payload = {
    email:     document.getElementById('email')?.value.trim() || '',
    password:  document.getElementById('password')?.value || '',
    prenom:    document.getElementById('prenom')?.value.trim() || '',
    nom:       document.getElementById('nom')?.value.trim() || '',
    tel:       document.getElementById('tel')?.value.trim() || '',
    siteWeb:   document.getElementById('siteWeb')?.value.trim() || '',
    cabinet:   document.getElementById('cabinet')?.value.trim() || '',
    rpps:      getRppsRaw(),
    specialite: document.getElementById('specialite')?.value || '',
    adeli:     document.getElementById('adeli')?.value.trim() || '',
    formule:   formuleSelectionnee
  };

  try {
    // Vérifier si on est en mode Supabase
    if (isSupaMode() && typeof inscrireDieteticien !== 'undefined') {
      const result = await inscrireDieteticien(payload);
      if (result.error) { 
        showError(result.error.message || 'Erreur inscription.'); 
        if (submitBtn) {
          submitBtn.textContent = 'Créer mon compte →';
          submitBtn.disabled = false;
        }
        return false;
      }
    } else {
      // Mode localStorage (démo)
      const existingDiet = JSON.parse(localStorage.getItem('nutridoc_dieteticien') || '{}');
      if (existingDiet.email === payload.email) {
        showError('Un compte existe déjà avec cet email.');
        if (submitBtn) {
          submitBtn.textContent = 'Créer mon compte →';
          submitBtn.disabled = false;
        }
        return false;
      }
      
      localStorage.setItem('nutridoc_dieteticien', JSON.stringify({ 
        ...payload, 
        statut: 'en_attente',
        created_at: new Date().toISOString()
      }));
      
      // Envoyer email de bienvenue si disponible
      if (typeof Email !== 'undefined' && Email.bienvenue) {
        Email.bienvenue(payload.email, { prenom: payload.prenom, role: 'dietitian' });
      }
    }

    // Succès - afficher confirmation
    const form = document.getElementById('inscriptionForm');
    const confirmation = document.getElementById('inscriptionConfirmation');
    if (form) form.classList.add('hidden');
    if (confirmation) confirmation.classList.remove('hidden');
    
    return true;
  } catch (err) {
    console.error('Erreur inscription:', err);
    showError('Une erreur est survenue. Veuillez réessayer.');
    if (submitBtn) {
      submitBtn.textContent = 'Créer mon compte →';
      submitBtn.disabled = false;
    }
    return false;
  }
}

// ── Initialisation des sélecteurs de formules ─────────────────
function initFormuleSelectors() {
  // Ajouter les écouteurs d'événements sur les cartes de prix
  document.querySelectorAll('.price-row').forEach(row => {
    row.addEventListener('click', () => {
      const formule = row.dataset.formule;
      if (formule && FORMULES[formule]) {
        selectFormule(formule);
      }
    });
  });
  
  // Sélectionner Pro par défaut (la carte avec data-formule="pro")
  const defaultCard = document.querySelector('.price-row[data-formule="pro"]');
  if (defaultCard) {
    defaultCard.classList.add('selected');
    formuleSelectionnee = 'pro';
    const hidden = document.getElementById('formuleHidden');
    if (hidden) hidden.value = 'pro';
    const recap = document.getElementById('formuleRecapName');
    if (recap) recap.textContent = FORMULES.pro.label;
  }
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Attendre que auth.js soit chargé (si nécessaire)
  const checkAuthInterval = setInterval(() => {
    if (typeof MODE_SUPA !== 'undefined') {
      clearInterval(checkAuthInterval);
      console.log('Auth.js chargé, MODE_SUPA =', MODE_SUPA);
    }
  }, 100);
  
  // Initialiser les sélecteurs de formules
  initFormuleSelectors();

  // Aperçu live
  const previewFields = ['prenom', 'nom', 'tel', 'cabinet', 'siteWeb'];
  previewFields.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('input', updatePreview);
    }
  });
  updatePreview();

  // Intercepter Entrée sur les étapes 1 et 2 pour éviter submit prématuré
  const form = document.getElementById('inscriptionForm');
  if (form) {
    form.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && currentInscStep < 3) {
        e.preventDefault();
        if (currentInscStep === 1) nextInscStep();
        else if (currentInscStep === 2) verifierRpps();
      }
    });

    // Soumission du formulaire
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await soumettreInscription();
    });
  }
  
  // Exposer les fonctions globales nécessaires
  window.nextStep = nextInscStep;
  window.prevStep = prevInscStep;
  window.validateRppsAndContinue = verifierRpps;
  window.scrollToPricing = scrollToPricing;
  window.selectFormule = selectFormule;
});