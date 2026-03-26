// js/bilan.js — Formulaire multi-étapes + détection red flags

let currentStep = 1;
const totalSteps = 5;

const RED_FLAG_LABELS = {
  grossesse:           'Grossesse / allaitement',
  tca:                 'Troubles du comportement alimentaire',
  diabete:             'Diabète sous traitement',
  insuffisance_renale: 'Insuffisance rénale',
  bariatrique:         'Chirurgie bariatrique',
  allergies_severes:   'Allergies multiples sévères',
  medicaments:         'Médicaments impactant le poids',
  antecedents:         'Antécédents médicaux lourds'
};

function updateProgress() {
  const fill = document.getElementById('progressFill');
  if (fill) fill.style.width = ((currentStep / totalSteps) * 100) + '%';
}

function showStep(n) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  const target = document.querySelector('.step[data-step="' + n + '"]');
  if (target) target.classList.add('active');
  updateProgress();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function nextStep() {
  if (currentStep < totalSteps) { currentStep++; showStep(currentStep); }
}

function prevStep() {
  if (currentStep > 1) { currentStep--; showStep(currentStep); }
}

function getRedFlags() {
  const checked = document.querySelectorAll('input[name="redflag"]:checked');
  return Array.from(checked).map(cb => cb.value);
}

document.addEventListener('DOMContentLoaded', () => {
  updateProgress();

  // Case "Aucune" désactive les autres
  const aucunCheckbox = document.getElementById('redFlagAucun');
  const redFlagCheckboxes = document.querySelectorAll('input[name="redflag"]');
  if (aucunCheckbox) {
    aucunCheckbox.addEventListener('change', () => {
      if (aucunCheckbox.checked) redFlagCheckboxes.forEach(cb => { cb.checked = false; });
    });
    redFlagCheckboxes.forEach(cb => {
      cb.addEventListener('change', () => { if (cb.checked) aucunCheckbox.checked = false; });
    });
  }

  // Soumission
  const form = document.getElementById('bilanForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const flags = getRedFlags();
      const data = Object.fromEntries(new FormData(form));
      data.redflags = flags;
      data.date = new Date().toISOString();
      localStorage.setItem('nutri_bilan', JSON.stringify(data));
      form.classList.add('hidden');

      if (flags.length > 0) {
        afficherRedFlag(flags, data);
        simulerAlerteDisteticien(data);
      } else {
        data.statut = 'en_attente';
        localStorage.setItem('nutri_bilan', JSON.stringify(data));
        document.getElementById('resultat').classList.remove('hidden');
      }
    });
  }
});

function afficherRedFlag(flags, data) {
  const bloc = document.getElementById('resultat-redflag');
  const display = document.getElementById('redFlagDisplay');
  display.innerHTML = flags.map(f =>
    '<span class="redflag-tag">' + (RED_FLAG_LABELS[f] || f) + '</span>'
  ).join('');
  data.statut = 'redflag';
  localStorage.setItem('nutri_bilan', JSON.stringify(data));
  bloc.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function simulerAlerteDisteticien(data) {
  const alerte = {
    type: 'redflag',
    patient: data.prenom || 'Patient',
    flags: data.redflags,
    date: new Date().toISOString(),
    lu: false
  };
  const alertes = JSON.parse(localStorage.getItem('nutri_alertes') || '[]');
  alertes.push(alerte);
  localStorage.setItem('nutri_alertes', JSON.stringify(alertes));
  console.log('Alerte diététicien envoyée :', alerte);
}
