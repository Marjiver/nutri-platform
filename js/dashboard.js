// js/dashboard.js — Tableau de bord patient

document.addEventListener('DOMContentLoaded', () => {
  // Charger les données du bilan depuis localStorage
  const bilan = JSON.parse(localStorage.getItem('nutri_bilan') || '{}');

  // Mettre à jour les cartes d'info si des données existent
  if (bilan.objectif) {
    const cards = document.querySelectorAll('.info-value');
    const labels = document.querySelectorAll('.info-label');

    const objectifLabel = {
      perte_poids: 'Perte de poids',
      prise_masse: 'Prise de masse',
      equilibre: 'Alimentation équilibrée',
      energie: 'Améliorer mon énergie',
      sante: 'Prévention santé'
    };

    const activiteLabel = {
      sedentaire: 'Sédentaire',
      leger: 'Légèrement actif',
      modere: 'Modérément actif',
      actif: 'Très actif'
    };

    // IMC calculé
    let imc = '—';
    if (bilan.poids && bilan.taille) {
      const h = bilan.taille / 100;
      imc = (bilan.poids / (h * h)).toFixed(1);
    }

    // Mettre à jour les valeurs
    const values = [
      objectifLabel[bilan.objectif] || bilan.objectif,
      activiteLabel[bilan.activite] || bilan.activite || '—',
      bilan.regime || 'Aucune restriction',
      imc
    ];

    cards.forEach((card, i) => {
      if (values[i]) card.textContent = values[i];
    });

    // Prénom dans le greeting
    if (bilan.prenom) {
      const greeting = document.querySelector('.dashboard-greeting h2');
      if (greeting) greeting.textContent = `Bonjour ${bilan.prenom} 👋`;
    }
  }
});
