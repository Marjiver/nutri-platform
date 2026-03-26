// js/bilan.js — Gestion du formulaire multi-étapes

let currentStep = 1;
const totalSteps = 4;

function updateProgress() {
  const fill = document.getElementById('progressFill');
  if (fill) fill.style.width = ((currentStep / totalSteps) * 100) + '%';
}

function showStep(n) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  const target = document.querySelector(`.step[data-step="${n}"]`);
  if (target) target.classList.add('active');
  updateProgress();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function nextStep() {
  if (currentStep < totalSteps) {
    currentStep++;
    showStep(currentStep);
  }
}

function prevStep() {
  if (currentStep > 1) {
    currentStep--;
    showStep(currentStep);
  }
}

// Soumission du formulaire
document.addEventListener('DOMContentLoaded', () => {
  updateProgress();

  const form = document.getElementById('bilanForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      // Récupérer les données du formulaire
      const data = Object.fromEntries(new FormData(form));
      console.log('Bilan soumis :', data);

      // Sauvegarder en localStorage (simulation)
      localStorage.setItem('nutri_bilan', JSON.stringify(data));

      // Afficher le résultat
      form.classList.add('hidden');
      document.getElementById('resultat').classList.remove('hidden');
    });
  }
});
