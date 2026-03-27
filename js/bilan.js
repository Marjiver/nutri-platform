let currentStep = 1;
const TOTAL_STEPS = 5;

// ── Navigation ────────────────────────────────────────────────
function goToStep(n) {
  if (n > currentStep && !validateStep(currentStep)) return;
  document.querySelector(`.step[data-step="${currentStep}"]`)?.classList.remove('active');
  currentStep = n;
  const target = document.querySelector(`.step[data-step="${n}"]`);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  updateProgress();
}

function updateProgress() {
  const pct = ((currentStep - 1) / (TOTAL_STEPS - 1)) * 100;
  document.getElementById('progressFill').style.width = pct + '%';
}

// ── Validation avec erreurs en rouge ─────────────────────────
function showError(stepNum, msg) {
  // Supprimer erreur précédente sur ce step
  const step = document.querySelector(`.step[data-step="${stepNum}"]`);
  const existing = step?.querySelector('.step-error');
  if (existing) { existing.textContent = msg; existing.classList.remove('hidden'); return; }
  const err = document.createElement('div');
  err.className = 'step-error'; err.textContent = msg;
  const btnRow = step?.querySelector('.btn-row, .btn-next');
  if (btnRow) step.insertBefore(err, btnRow);
}
function clearErrors(stepNum) {
  document.querySelector(`.step[data-step="${stepNum}"]`)?.querySelectorAll('.step-error').forEach(e => e.remove());
  document.querySelectorAll('.input-error').forEach(i => i.classList.remove('input-error'));
}

function validateStep(n) {
  clearErrors(n);
  const step = document.querySelector(`.step[data-step="${n}"]`);
  let valid = true;

  if (n === 1) {
    const prenom = step.querySelector('[name="prenom"]');
    const age    = step.querySelector('[name="age"]');
    const sexe   = step.querySelector('[name="sexe"]');
    const ville  = step.querySelector('[name="ville"]');
    if (!prenom?.value.trim()) { markError(prenom); valid = false; }
    if (!age?.value || age.value < 16 || age.value > 100) { markError(age); valid = false; }
    if (!sexe?.value) { markError(sexe); valid = false; }
    if (!ville?.value.trim()) { markError(ville); valid = false; }
    if (!valid) showError(n, 'Veuillez remplir tous les champs obligatoires.');
  }
  if (n === 2) {
    const taille = step.querySelector('[name="taille"]');
    const poids  = step.querySelector('[name="poids"]');
    if (!taille?.value || taille.value < 100) { markError(taille); valid = false; }
    if (!poids?.value  || poids.value  < 30)  { markError(poids);  valid = false; }
    if (!valid) showError(n, 'Veuillez indiquer votre taille et votre poids.');
  }
  if (n === 3) {
    const activite = step.querySelector('[name="activite"]');
    const objectif = step.querySelector('[name="objectif"]');
    if (!activite?.value) { markError(activite); valid = false; }
    if (!objectif?.value) { markError(objectif); valid = false; }
    if (!valid) showError(n, 'Veuillez renseigner votre niveau d\'activité et votre objectif.');
  }
  if (n === 5) {
    const checked  = document.querySelectorAll('input[name="redflag"]:checked').length;
    const aucun    = document.getElementById('redFlagAucun')?.checked;
    if (!checked && !aucun) {
      showError(n, 'Veuillez cocher au moins une case, ou "Aucune de ces situations".');
      valid = false;
    }
  }
  return valid;
}

function markError(el) {
  el?.classList.add('input-error');
  el?.addEventListener('input', () => el.classList.remove('input-error'), { once: true });
  el?.addEventListener('change', () => el.classList.remove('input-error'), { once: true });
}

// ── Red flag mutex ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const aucunCb  = document.getElementById('redFlagAucun');
  const flagCbs  = document.querySelectorAll('input[name="redflag"]');
  aucunCb?.addEventListener('change', () => { if (aucunCb.checked) flagCbs.forEach(c => c.checked = false); });
  flagCbs.forEach(c => c.addEventListener('change', () => { if (c.checked) aucunCb.checked = false; }));
  updateProgress();

  // ── Soumission ────────────────────────────────────────────
  document.getElementById('bilanForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (!validateStep(5)) return;

    const data   = Object.fromEntries(new FormData(e.target));
    const flags  = Array.from(document.querySelectorAll('input[name="redflag"]:checked')).map(c => c.value);
    const aucun  = document.getElementById('redFlagAucun')?.checked;
    const hasFlag = flags.length > 0;

    const bilanData = {
      ...data,
      redflags: flags,
      ville: e.target.querySelector('[name="ville"]')?.value.trim(),
      submitted_at: new Date().toISOString()
    };

    // Sauvegarder
    if (typeof MODE_SUPA !== 'undefined' && MODE_SUPA) {
      await inscrirePatient({ ...bilanData, redflags: flags });
    } else {
      localStorage.setItem('nutridoc_bilan', JSON.stringify(bilanData));
    // Email confirmation bilan
    if (typeof Email !== 'undefined') {
      Email.confirmationBilan(bilanData.email || '', {
        prenom:  bilanData.prenom || 'Patient',
        objectif: bilanData.objectif || '',
        ville:    bilanData.ville || ''
      });
    }
    }

    document.getElementById('bilanForm').classList.add('hidden');

    if (hasFlag) {
      const RF_LABELS = {
        grossesse:'Grossesse / allaitement', tca:'TCA', diabete:'Diabète traité',
        insuffisance_renale:'Insuffisance rénale', bariatrique:'Bariatrique',
        allergies_severes:'Allergies sévères', medicaments:'Médicaments', antecedents:'Antécédents lourds'
      };
      document.getElementById('redFlagDisplay').innerHTML = flags.map(f =>
        `<span class="redflag-badge">${RF_LABELS[f]||f}</span>`
      ).join('');
      document.getElementById('resultat-redflag').classList.remove('hidden');

      // Stocker alertes
      const alertes = JSON.parse(localStorage.getItem('nutridoc_alertes') || '[]');
      alertes.push({ patient: data.prenom || 'Patient', flags, lu: false, date: new Date().toISOString() });
      localStorage.setItem('nutridoc_alertes', JSON.stringify(alertes));
    // Email red flag patient
    if (typeof Email !== 'undefined') {
      const rf_labels = {grossesse:'Grossesse',tca:'TCA',diabete:'Diabète',insuffisance_renale:'Insuffisance rénale',bariatrique:'Bariatrique',allergies_severes:'Allergies sévères',medicaments:'Médicaments',antecedents:'Antécédents lourds'};
      Email.redFlagPatient(data.email || '', {
        prenom: data.prenom,
        flags_label: flags.map(f => rf_labels[f]||f).join(', ')
      });
    }
    } else {
      document.getElementById('resultat').classList.remove('hidden');
    }
  });
});
