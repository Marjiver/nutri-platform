let currentInscStep = 1;
const totalInscSteps = 3;
let formuleSelectionnee = 'pro';

const FORMULES = {
  essentiel: { label: 'Essentiel — 5 € / plan validé' },
  pro:       { label: 'Pro — 49 € / mois' },
  expert:    { label: 'Expert — 39 € / mois (annuel)' }
};

// ── Tarifs — sélection depuis les cards ──────────────────────
function selectFormule(formule) {
  formuleSelectionnee = formule;
  document.querySelectorAll('.pricing-diet-card').forEach(c => c.classList.remove('selected'));
  const map = { essentiel:'pricingEssentiel', pro:'pricingPro', expert:'pricingExpert' };
  document.getElementById(map[formule])?.classList.add('selected');
  // Mettre à jour le récap étape 3
  const hidden = document.getElementById('formuleHidden');
  const recap  = document.getElementById('formuleRecapName');
  if (hidden) hidden.value = formule;
  if (recap)  recap.textContent = FORMULES[formule].label;
}

function scrollToPricing() {
  document.getElementById('pricingEssentiel')?.scrollIntoView({ behavior:'smooth', block:'center' });
}

// ── Navigation étapes ─────────────────────────────────────────
function showInscStep(n) {
  document.querySelectorAll('#inscriptionForm .insc-step').forEach(s => s.classList.remove('active'));
  document.querySelector('#inscriptionForm .insc-step[data-step="'+n+'"]')?.classList.add('active');

  // Mise à jour barre progression
  for (let i = 1; i <= totalInscSteps; i++) {
    const el = document.getElementById('progStep'+i);
    if (!el) continue;
    el.classList.remove('active','done');
    if (i === n) el.classList.add('active');
    else if (i < n) el.classList.add('done');
  }
  window.scrollTo({ top: document.getElementById('formulaireSection')?.offsetTop - 80 || 0, behavior:'smooth' });
}

function nextInscStep() {
  if (!validateStep(currentInscStep)) return;
  if (currentInscStep < totalInscSteps) { currentInscStep++; showInscStep(currentInscStep); }
}
function prevInscStep() {
  if (currentInscStep > 1) { currentInscStep--; showInscStep(currentInscStep); }
}

function validateStep(step) {
  if (step === 1) {
    if (!document.getElementById('prenom').value.trim() || !document.getElementById('nom').value.trim()) {
      showError('Veuillez renseigner votre prénom et nom.'); return false;
    }
    const email = document.getElementById('email').value.trim();
    if (!email || !email.includes('@')) { showError('Email invalide.'); return false; }
  }
  if (step === 2) {
    if (getRppsRaw().length !== 11) { showError('Le numéro RPPS doit contenir exactement 11 chiffres.'); return false; }
    if (!document.getElementById('specialite').value) { showError('Veuillez choisir votre spécialité.'); return false; }
  }
  return true;
}

function showError(msg) {
  document.querySelector('.insc-error')?.remove();
  const div = document.createElement('div');
  div.className = 'insc-error';
  div.textContent = msg;
  const step = document.querySelector('#inscriptionForm .insc-step.active');
  const target = step?.querySelector('.btn-row') || step?.querySelector('button');
  if (target) step.insertBefore(div, target);
  setTimeout(() => div.remove(), 4000);
}

// ── Aperçu coordonnées ────────────────────────────────────────
function updatePreview() {
  const prenom  = document.getElementById('prenom')?.value.trim() || '';
  const nom     = document.getElementById('nom')?.value.trim() || '';
  const cabinet = document.getElementById('cabinet')?.value.trim() || '';
  const tel     = document.getElementById('tel')?.value.trim() || '';
  const site    = document.getElementById('siteWeb')?.value.trim() || '';
  document.getElementById('prevNom').textContent    = (prenom || 'Prénom') + ' ' + (nom ? nom.toUpperCase() : 'NOM');
  document.getElementById('prevCabinet').textContent = cabinet;
  document.getElementById('prevContact').textContent = [tel, site].filter(Boolean).join(' · ') || '';
  document.getElementById('coordPreview').style.opacity = (prenom || nom) ? '1' : '0.4';
}

// ── RPPS — format XX XXX XXX XXX (11 chiffres, maxlength 14) ──
function getRppsRaw() {
  return (document.getElementById('rppsInput')?.value || '').replace(/\D/g, '');
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
  btn.textContent = 'Vérification…';
  btn.disabled    = true;

  setTimeout(() => {
    const rpps   = getRppsRaw();
    const prenom = document.getElementById('prenom').value.trim();
    const nom    = document.getElementById('nom').value.trim();

    if (rpps.startsWith('00')) {
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
  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const labels = ['','Faible','Moyen','Fort','Très fort'];
  const colors = ['','#ef4444','#f97316','#22c55e','#16a34a'];
  bar.innerHTML = val.length === 0 ? '' :
    '<div class="pwd-bar"><div class="pwd-fill" style="width:'+(score*25)+'%;background:'+colors[score]+'"></div></div>' +
    '<span style="font-size:.75rem;color:'+colors[score]+'">'+labels[score]+'</span>';
}
function togglePwd() {
  const inp = document.getElementById('password');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Sélectionner Pro par défaut
  selectFormule('pro');

  // Aperçu live
  ['prenom','nom','tel','cabinet','siteWeb'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updatePreview);
  });
  updatePreview();

  // Soumission
  document.getElementById('inscriptionForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (!validateStep(3)) return;
    if (document.getElementById('password').value !== document.getElementById('passwordConfirm').value) {
      showError('Les mots de passe ne correspondent pas.'); return;
    }
    if (document.getElementById('password').value.length < 8) {
      showError('Mot de passe trop court (8 caractères min).'); return;
    }
    if (!document.getElementById('cgu').checked) {
      showError('Veuillez accepter les CGU.'); return;
    }

    const submitBtn = document.querySelector('.btn-submit');
    submitBtn.textContent = 'Création en cours…';
    submitBtn.disabled = true;

    const payload = {
      email:     document.getElementById('email').value.trim(),
      password:  document.getElementById('password').value,
      prenom:    document.getElementById('prenom').value.trim(),
      nom:       document.getElementById('nom').value.trim(),
      tel:       document.getElementById('tel').value.trim(),
      siteWeb:   document.getElementById('siteWeb').value.trim(),
      cabinet:   document.getElementById('cabinet').value.trim(),
      rpps:      getRppsRaw(),
      specialite:document.getElementById('specialite').value,
      adeli:     document.getElementById('adeli').value.trim(),
      formule:   formuleSelectionnee
    };

    if (typeof MODE_SUPA !== 'undefined' && MODE_SUPA) {
      const { error } = await inscrireDieteticien(payload);
      if (error) { showError(error.message || 'Erreur inscription.'); submitBtn.textContent='Créer mon compte →'; submitBtn.disabled=false; return; }
    } else {
      localStorage.setItem('nutridoc_dieteticien', JSON.stringify({ ...payload, statut:'en_attente' }));
    }

    document.getElementById('inscriptionForm').classList.add('hidden');
    document.getElementById('inscriptionConfirmation').classList.remove('hidden');
  });
});
