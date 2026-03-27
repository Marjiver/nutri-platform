let currentPrescStep = 1;
const totalPrescSteps = 3;
let packSelectionne = '20';

const PACKS = {
  '10': 'Découverte — 10 crédits · 49 € HT',
  '20': 'Pro — 20 crédits · 89 € HT',
  '50': 'Volume — 50 crédits · 219 € HT'
};

function selectPack(pack, el) {
  packSelectionne = pack;
  document.querySelectorAll('.pricing-diet-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  const recap = document.getElementById('pPackRecapName');
  const hidden = document.getElementById('pPackHidden');
  if (recap)  recap.textContent = PACKS[pack];
  if (hidden) hidden.value = pack;
}
function scrollToPacks() {
  document.getElementById('packCard10')?.scrollIntoView({ behavior:'smooth', block:'center' });
}

function showPrescStep(n) {
  document.querySelectorAll('#inscriptionPrescForm .insc-step').forEach(s => s.classList.remove('active'));
  document.querySelector(`#inscriptionPrescForm .insc-step[data-step="${n}"]`)?.classList.add('active');
  for (let i = 1; i <= totalPrescSteps; i++) {
    const el = document.getElementById('pProgStep' + i);
    if (!el) continue;
    el.classList.remove('active','done');
    if (i === n) el.classList.add('active');
    else if (i < n) el.classList.add('done');
    const dot = el.querySelector('.insc-prog-dot');
    if (dot) {
      dot.style.background = i <= n ? '#0ea5e9' : '';
      dot.style.color = i <= n ? '#fff' : '';
    }
  }
  window.scrollTo({ top: document.getElementById('formulaireSection')?.offsetTop - 80 || 0, behavior:'smooth' });
}

function nextPrescStep() {
  if (!validatePrescStep(currentPrescStep)) return;
  if (currentPrescStep < totalPrescSteps) { currentPrescStep++; showPrescStep(currentPrescStep); }
}
function prevPrescStep() {
  if (currentPrescStep > 1) { currentPrescStep--; showPrescStep(currentPrescStep); }
}

function validatePrescStep(step) {
  if (step === 1) {
    if (!document.getElementById('pPrenom').value.trim() || !document.getElementById('pNom').value.trim()) {
      showPrescError('Veuillez renseigner votre prénom et nom.'); return false;
    }
    if (!document.getElementById('pProfession').value) {
      showPrescError('Veuillez sélectionner votre profession.'); return false;
    }
    const email = document.getElementById('pEmail').value.trim();
    if (!email || !email.includes('@')) { showPrescError('Email invalide.'); return false; }
  }
  if (step === 2) {
    if (getSiretRaw().length !== 14) {
      showPrescError('Le SIRET doit contenir exactement 14 chiffres.'); return false;
    }
    const checked = document.querySelectorAll('input[name="pObjectif"]:checked');
    if (checked.length === 0) { showPrescError('Veuillez sélectionner au moins un objectif.'); return false; }
  }
  return true;
}

function showPrescError(msg) {
  document.querySelector('.insc-error')?.remove();
  const div = document.createElement('div');
  div.className = 'insc-error'; div.textContent = msg;
  const step = document.querySelector('#inscriptionPrescForm .insc-step.active');
  const target = step?.querySelector('.btn-row') || step?.querySelector('button');
  if (target) step.insertBefore(div, target);
  setTimeout(() => div.remove(), 4000);
}

// ── SIRET — format XXX XXX XXX XXXXX (14 chiffres, max 19 chars avec espaces) ──
function getSiretRaw() {
  return (document.getElementById('siretInput')?.value || '').replace(/\D/g, '');
}
function formatSiret(input) {
  const raw = input.value.replace(/\D/g, '').slice(0, 14);
  // Format : 3 3 3 5 = "123 456 789 00012"
  let f = raw;
  if (raw.length > 3)  f = raw.slice(0,3) + ' ' + raw.slice(3);
  if (raw.length > 6)  f = raw.slice(0,3) + ' ' + raw.slice(3,6) + ' ' + raw.slice(6);
  if (raw.length > 9)  f = raw.slice(0,3) + ' ' + raw.slice(3,6) + ' ' + raw.slice(6,9) + ' ' + raw.slice(9);
  input.value = f;

  const status = document.getElementById('siretStatus');
  if (status) {
    status.innerHTML = raw.length === 14
      ? '<span class="rpps-ok">✓ 14 / 14 chiffres</span>'
      : `<span class="rpps-hint">${raw.length} / 14 chiffres</span>`;
  }
  document.getElementById('siretFeedback').textContent = '';
}

// Vérifie via l'API publique annuaire-entreprises.data.gouv.fr
async function verifierSiret() {
  if (!validatePrescStep(2)) return; // juste le champ SIRET
  const siret   = getSiretRaw();
  const btn      = document.getElementById('btnVerifSiret');
  const feedback = document.getElementById('siretFeedback');
  btn.textContent = 'Vérification…'; btn.disabled = true;

  try {
    // API ouverte annuaire-entreprises (données INPI / INSEE)
    const res  = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${siret}&page=1&per_page=1`);
    const data = await res.json();
    const entreprise = data?.results?.[0];

    if (!entreprise) {
      feedback.innerHTML = '<span class="rpps-error">✗ SIRET introuvable dans l\'annuaire des entreprises. Vérifiez le numéro.</span>';
      btn.textContent = 'Vérifier le SIRET →'; btn.disabled = false;
      return;
    }

    const nom = entreprise.nom_complet || entreprise.nom_raison_sociale || 'Entreprise trouvée';
    const actif = entreprise.etat_administratif !== 'F'; // F = fermée

    if (!actif) {
      feedback.innerHTML = '<span class="rpps-error">✗ Cette entreprise est fermée selon l\'annuaire officiel.</span>';
      btn.textContent = 'Vérifier le SIRET →'; btn.disabled = false;
      return;
    }

    feedback.innerHTML = `<span class="rpps-ok">✓ Vérifié — ${nom} — entreprise active</span>`;
    document.getElementById('pSiretVerifie').value = siret;

    setTimeout(() => {
      currentPrescStep = 3;
      showPrescStep(3);
      btn.textContent = 'Vérifier le SIRET →'; btn.disabled = false;
    }, 700);

  } catch(e) {
    // Fallback si l'API est indisponible : on accepte quand même (vérification manuelle)
    feedback.innerHTML = '<span style="color:#f59e0b;">⚠ API indisponible — SIRET enregistré, vérification manuelle à la validation.</span>';
    document.getElementById('pSiretVerifie').value = siret;
    setTimeout(() => {
      currentPrescStep = 3; showPrescStep(3);
      btn.textContent = 'Vérifier le SIRET →'; btn.disabled = false;
    }, 1200);
  }
}

// ── Aperçu coordonnées ────────────────────────────────────────
const TITRES = {
  medecin:'Médecin généraliste', kine:'Kinésithérapeute DE',
  infirmier:'Infirmier(e) DE', sage_femme:'Sage-femme',
  medecin_sport:'Médecin du sport', ergotherapeute:'Ergothérapeute',
  psychologue:'Psychologue', coach_sportif:'Coach sportif certifié',
  preparateur:'Préparateur physique', educateur_sportif:'Éducateur sportif',
  osteopathe:'Ostéopathe', naturopathe:'Naturopathe déclaré',
  autre:'Professionnel de santé déclaré'
};
function updatePrescPreview() {
  const prenom = document.getElementById('pPrenom')?.value.trim() || '';
  const nom    = document.getElementById('pNom')?.value.trim() || '';
  const prof   = document.getElementById('pProfession')?.value || '';
  const cab    = document.getElementById('pCabinet')?.value.trim() || '';
  const tel    = document.getElementById('pTel')?.value.trim() || '';
  const site   = document.getElementById('pSite')?.value.trim() || '';
  document.getElementById('pPrevNom').textContent     = (prenom || 'Prénom') + ' ' + (nom ? nom.toUpperCase() : 'NOM');
  document.getElementById('pPrevTitre').textContent   = TITRES[prof] || 'Professionnel de santé';
  document.getElementById('pPrevCabinet').textContent = cab;
  document.getElementById('pPrevContact').textContent = [tel, site].filter(Boolean).join(' · ') || '';
  document.getElementById('pCoordPreview').style.opacity = (prenom || nom) ? '1' : '0.4';
}

// ── MDP ───────────────────────────────────────────────────────
function checkPwdP(val) {
  const bar = document.getElementById('pPwdStrength');
  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const labels = ['','Faible','Moyen','Fort','Très fort'];
  const colors = ['','#ef4444','#f97316','#22c55e','#16a34a'];
  bar.innerHTML = val.length === 0 ? '' :
    `<div class="pwd-bar"><div class="pwd-fill" style="width:${score*25}%;background:${colors[score]}"></div></div>` +
    `<span style="font-size:.75rem;color:${colors[score]}">${labels[score]}</span>`;
}
function togglePwdP() {
  const inp = document.getElementById('pPassword');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Ajouter un champ caché pour le SIRET vérifié
  const form = document.getElementById('inscriptionPrescForm');
  const hidden = document.createElement('input');
  hidden.type = 'hidden'; hidden.id = 'pSiretVerifie'; hidden.name = 'siret';
  form.appendChild(hidden);

  selectPack('20', document.getElementById('packCard20'));

  ['pPrenom','pNom','pProfession','pTel','pCabinet','pSite'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updatePrescPreview);
  });
  updatePrescPreview();

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!validatePrescStep(3)) return;
    if (document.getElementById('pPassword').value !== document.getElementById('pPasswordConfirm').value) {
      showPrescError('Les mots de passe ne correspondent pas.'); return;
    }
    if (document.getElementById('pPassword').value.length < 8) {
      showPrescError('Mot de passe trop court (8 caractères min).'); return;
    }
    if (!document.getElementById('pCgu').checked) {
      showPrescError('Veuillez accepter les CGU.'); return;
    }

    const btn = form.querySelector('.btn-submit');
    btn.textContent = 'Création en cours…'; btn.disabled = true;

    const objectifs = Array.from(document.querySelectorAll('input[name="pObjectif"]:checked')).map(c => c.value);
    const payload = {
      email:     document.getElementById('pEmail').value.trim(),
      password:  document.getElementById('pPassword').value,
      prenom:    document.getElementById('pPrenom').value.trim(),
      nom:       document.getElementById('pNom').value.trim(),
      profession:document.getElementById('pProfession').value,
      tel:       document.getElementById('pTel').value.trim(),
      site:      document.getElementById('pSite').value.trim(),
      cabinet:   document.getElementById('pCabinet').value.trim(),
      siret:     document.getElementById('pSiretVerifie').value || getSiretRaw(),
      objectifs,
      pack:      packSelectionne
    };

    if (typeof MODE_SUPA !== 'undefined' && MODE_SUPA) {
      const { error } = await inscrirePrescripteur(payload);
      if (error) { showPrescError(error.message || 'Erreur inscription.'); btn.textContent='Créer mon compte →'; btn.disabled=false; return; }
    } else {
      localStorage.setItem('nutridoc_prescripteur', JSON.stringify({ ...payload, credits: parseInt(packSelectionne), statut:'actif' }));
      if (typeof Email !== 'undefined') {
        Email.bienvenue(payload.email, { prenom: payload.prenom, role: 'prescriber', credits: packSelectionne });
      }
    }

    form.classList.add('hidden');
    document.getElementById('prescConfirmation').classList.remove('hidden');
  });
});
