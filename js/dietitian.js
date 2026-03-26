// js/dietitian.js — Espace diététicien avec alertes red flag

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

  // Charger et afficher les alertes red flag depuis localStorage
  const alertes = JSON.parse(localStorage.getItem('nutri_alertes') || '[]');
  const nonLues = alertes.filter(a => !a.lu);

  if (nonLues.length > 0) {
    const container = document.querySelector('.dashboard-greeting');
    if (container) {
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

      nonLues.forEach(alerte => {
        const flagsTexte = alerte.flags.map(f => RED_FLAG_LABELS[f] || f).join(', ');
        const div = document.createElement('div');
        div.className = 'alert-redflag';
        div.innerHTML =
          '<div class="alert-dot"></div>' +
          '<div class="alert-redflag-text">' +
            '<span class="alert-redflag-title">Dossier red flag — ' + alerte.patient + '</span>' +
            'Situation(s) détectée(s) : ' + flagsTexte + '. ' +
            'Ce patient ne peut pas recevoir de plan automatique.' +
          '</div>';
        container.appendChild(div);
      });

      // Marquer comme lues
      alertes.forEach(a => { a.lu = true; });
      localStorage.setItem('nutri_alertes', JSON.stringify(alertes));
    }
  }

  // Boutons de validation
  document.querySelectorAll('.btn-validate').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.patient-card');
      const name = card.querySelector('.patient-name').textContent;
      btn.textContent = 'Validé ✓';
      btn.disabled = true;
      btn.style.background = '#6b7280';
      alert('Plan de ' + name + ' validé. Le patient sera notifié.');
    });
  });
});
