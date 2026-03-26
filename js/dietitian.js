// js/dietitian.js — Espace diététicien

function togglePlan(btn) {
  const card = btn.closest('.patient-card');
  const detail = card.querySelector('.plan-detail');
  if (detail.classList.contains('hidden')) {
    detail.classList.remove('hidden');
    btn.textContent = 'Masquer';
  } else {
    detail.classList.add('hidden');
    btn.textContent = 'Voir le plan';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Boutons de validation
  document.querySelectorAll('.btn-validate').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.patient-card');
      const name = card.querySelector('.patient-name').textContent;
      btn.textContent = 'Validé ✓';
      btn.disabled = true;
      btn.style.background = '#6b7280';
      alert(`Plan de ${name} validé avec succès. Le patient sera notifié.`);
    });
  });
});
