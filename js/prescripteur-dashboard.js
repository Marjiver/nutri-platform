const RED_FLAG_OBJECTIFS = ['sante', 'pathologie'];

function loadProfil() {
  return JSON.parse(localStorage.getItem('nutri_prescripteur') || '{}');
}
function saveProfil(p) {
  localStorage.setItem('nutri_prescripteur', JSON.stringify(p));
}
function loadHistorique() {
  return JSON.parse(localStorage.getItem('nutri_presc_historique') || '[]');
}
function saveHistorique(h) {
  localStorage.setItem('nutri_presc_historique', JSON.stringify(h));
}

function updateMetrics(profil) {
  const histo = loadHistorique();
  const credits = profil.credits || 0;
  const envoyes = histo.length;
  const valides = histo.filter(d => d.statut === 'valide').length;
  const flags   = histo.filter(d => d.statut === 'redflag').length;

  document.getElementById('metricCredits').textContent  = credits;
  document.getElementById('metricEnvoyes').textContent  = envoyes;
  document.getElementById('metricValides').textContent  = valides;
  document.getElementById('metricFlags').textContent    = flags;
  document.getElementById('creditsBadge').textContent   = credits + ' crédit' + (credits > 1 ? 's' : '') + ' restant' + (credits > 1 ? 's' : '');

  if (credits === 0) {
    document.getElementById('creditsBadge').style.background = '#fef2f2';
    document.getElementById('creditsBadge').style.color = '#dc2626';
  }
}

function renderHistorique() {
  const histo = loadHistorique();
  const container = document.getElementById('historiqueList');
  if (histo.length === 0) {
    container.innerHTML = '<p style="font-size:0.875rem;color:var(--gray);">Aucune demande pour le moment.</p>';
    return;
  }
  const STATUT = { en_attente: 'En attente', valide: 'Validé', redflag: 'Red flag — redirigé' };
  const COULEUR = { en_attente: '#f59e0b', valide: '#22c55e', redflag: '#f97316' };
  container.innerHTML = histo.slice().reverse().map(d => `
    <div class="patient-card">
      <div class="patient-info">
        <div class="avatar" style="background:#eff6ff;color:#1a3a6b;">${d.prenom.slice(0,2).toUpperCase()}</div>
        <div>
          <p class="patient-name">${d.prenom} — ${d.objectifLabel}</p>
          <p class="patient-meta">${new Date(d.date).toLocaleDateString('fr-FR')}</p>
        </div>
      </div>
      <div style="margin-left:auto;display:flex;align-items:center;gap:8px;">
        <span style="font-size:0.75rem;font-weight:500;color:${COULEUR[d.statut]};background:${COULEUR[d.statut]}18;padding:3px 10px;border-radius:999px;">${STATUT[d.statut] || d.statut}</span>
        ${d.statut === 'redflag' ? '<span style="font-size:0.75rem;color:#f97316;">→ Visio recommandée</span>' : ''}
      </div>
    </div>
  `).join('');
}

function recharger(nb, prix) {
  const profil = loadProfil();
  if (confirm('Simuler l\'achat de ' + nb + ' crédits pour ' + prix + ' € HT ?')) {
    profil.credits = (profil.credits || 0) + nb;
    saveProfil(profil);
    updateMetrics(profil);
    alert(nb + ' crédits ajoutés ! Total : ' + profil.credits + ' crédits.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const profil = loadProfil();
  const titres = { coach_sportif: 'Coach sportif', preparateur: 'Préparateur physique', kine: 'Kinésithérapeute' };
  const objLabels = { reequilibrage: 'Rééquilibrage', prise_masse: 'Prise de masse', perte_gras: 'Perte de gras' };

  if (profil.prenom) {
    document.getElementById('prescGreeting').textContent = 'Bonjour ' + profil.prenom + ' \uD83D\uDC4B';
    document.getElementById('prescSousTitre').textContent = (titres[profil.profession] || 'Prescripteur') + ' · NutriPlan';
    document.getElementById('prescTag').textContent = profil.prenom;
  }

  updateMetrics(profil);
  renderHistorique();

  document.getElementById('prescDemandeForm').addEventListener('submit', e => {
    e.preventDefault();
    const profil = loadProfil();

    if ((profil.credits || 0) <= 0) {
      alert('Vous n\'avez plus de crédits. Rechargez votre compte ci-dessous.');
      return;
    }
    if (!document.getElementById('perimCheck').checked) {
      alert('Veuillez confirmer le périmètre non médical de la demande.');
      return;
    }

    const prenom   = document.getElementById('clientPrenom').value.trim();
    const objectif = document.getElementById('clientObjectif').value;
    const age      = document.getElementById('clientAge').value;
    const poids    = document.getElementById('clientPoids').value;
    const taille   = document.getElementById('clientTaille').value;
    const activite = document.getElementById('clientActivite').value;
    const notes    = document.getElementById('clientNotes').value.trim();

    if (!prenom || !objectif) { alert('Prénom et objectif sont requis.'); return; }

    // Consommer 1 crédit
    profil.credits = (profil.credits || 1) - 1;
    saveProfil(profil);

    // Enregistrer la demande
    const demande = {
      prenom, objectif, objectifLabel: objLabels[objectif] || objectif,
      age, poids, taille, activite, notes,
      prescripteur: profil.prenom + ' ' + profil.nom,
      profession: profil.profession,
      statut: 'en_attente',
      date: new Date().toISOString()
    };
    const histo = loadHistorique();
    histo.push(demande);
    saveHistorique(histo);

    updateMetrics(profil);
    renderHistorique();

    // Feedback
    const res = document.getElementById('demandeResultat');
    res.className = 'status-card';
    res.innerHTML = `
      <div class="status-dot pending"></div>
      <div>
        <p class="status-label">Demande envoyée pour ${prenom}</p>
        <p class="status-value">En attente de validation par le diététicien (~48h)</p>
      </div>
      <div class="status-eta">−1 crédit</div>
    `;

    document.getElementById('prescDemandeForm').reset();
    document.getElementById('perimCheck').checked = false;

    // Simuler validation après 4s (démo)
    setTimeout(() => {
      const h = loadHistorique();
      if (h.length > 0) { h[h.length - 1].statut = 'valide'; saveHistorique(h); renderHistorique(); }
    }, 4000);
  });
});
