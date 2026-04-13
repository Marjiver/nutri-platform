/**
 * prescripteur-dashboard.js — NutriDoc · Dashboard Prescripteur
 * Gestion des crédits, demandes de plans, historique
 */

const RED_FLAG_OBJECTIFS = ['sante', 'pathologie'];

// Labels des objectifs
const OBJECTIF_LABELS = {
  reequilibrage: 'Rééquilibrage alimentaire',
  prise_masse: 'Prise de masse musculaire',
  perte_gras: 'Perte de gras',
  sante: 'Prévention santé',
  pathologie: 'Pathologie spécifique'
};

// Labels des activités
const ACTIVITE_LABELS = {
  sedentaire: 'Sédentaire',
  leger: 'Légèrement actif',
  modere: 'Modérément actif',
  actif: 'Très actif',
  sportif: 'Sportif intensif'
};

function loadProfil() {
  return JSON.parse(localStorage.getItem('nutridoc_prescripteur') || '{}');
}

function saveProfil(p) {
  localStorage.setItem('nutridoc_prescripteur', JSON.stringify(p));
}

function loadHistorique() {
  return JSON.parse(localStorage.getItem('nutridoc_presc_historique') || '[]');
}

function saveHistorique(h) {
  localStorage.setItem('nutridoc_presc_historique', JSON.stringify(h));
}

function updateMetrics(profil) {
  const histo = loadHistorique();
  const credits = profil.credits || 0;
  const envoyes = histo.length;
  const valides = histo.filter(d => d.statut === 'valide').length;
  const flags   = histo.filter(d => d.statut === 'alerte_sante').length;

  const metricCredits = document.getElementById('metricCredits');
  const metricEnvoyes = document.getElementById('metricEnvoyes');
  const metricValides = document.getElementById('metricValides');
  const metricFlags = document.getElementById('metricFlags');
  const creditsBadge = document.getElementById('creditsBadge');
  
  if (metricCredits) metricCredits.textContent = credits;
  if (metricEnvoyes) metricEnvoyes.textContent = envoyes;
  if (metricValides) metricValides.textContent = valides;
  if (metricFlags) metricFlags.textContent = flags;
  
  if (creditsBadge) {
    creditsBadge.textContent = credits + ' crédit' + (credits > 1 ? 's' : '') + ' restant' + (credits > 1 ? 's' : '');
    if (credits === 0) {
      creditsBadge.style.background = '#fef2f2';
      creditsBadge.style.color = '#dc2626';
    } else {
      creditsBadge.style.background = '#e1f5ee';
      creditsBadge.style.color = '#0f6e56';
    }
  }
}

function renderHistorique() {
  const histo = loadHistorique();
  const container = document.getElementById('historiqueList');
  if (!container) return;
  
  if (histo.length === 0) {
    container.innerHTML = '<p style="font-size:0.875rem;color:var(--gray);">Aucune demande pour le moment.</p>';
    return;
  }
  
  const STATUT = { 
    en_attente: 'En attente', 
    valide: 'Validé', 
    alerte_sante: 'Alerte santé — redirigé',
    refuse: 'Refusé'
  };
  const COULEUR = { 
    en_attente: '#f59e0b', 
    valide: '#22c55e', 
    alerte_sante: '#f97316',
    refuse: '#ef4444'
  };
  
  container.innerHTML = histo.slice().reverse().map((d, idx) => `
    <div class="patient-card" data-idx="${idx}">
      <div class="patient-info">
        <div class="avatar" style="background:#eff6ff;color:#1a3a6b;">${(d.prenom || '?').slice(0,2).toUpperCase()}</div>
        <div>
          <p class="patient-name">${d.prenom || 'Client'} — ${d.objectifLabel || OBJECTIF_LABELS[d.objectif] || d.objectif || '?'}</p>
          <p class="patient-meta">${d.age ? d.age + ' ans · ' : ''}${d.poids ? d.poids + 'kg' : ''}${d.taille ? ' · ' + d.taille + 'cm' : ''}</p>
          <p class="patient-meta">Demandé le ${new Date(d.date).toLocaleDateString('fr-FR')}</p>
          ${d.notes ? `<p class="patient-notes" style="font-size:0.7rem;color:#6b7b74;margin-top:0.25rem;">📝 ${d.notes.substring(0, 100)}${d.notes.length > 100 ? '…' : ''}</p>` : ''}
        </div>
      </div>
      <div style="margin-left:auto;display:flex;align-items:center;gap:8px;">
        <span style="font-size:0.75rem;font-weight:500;color:${COULEUR[d.statut]};background:${COULEUR[d.statut]}18;padding:3px 10px;border-radius:999px;">
          ${STATUT[d.statut] || d.statut || 'En attente'}
        </span>
        ${d.statut === 'alerte_sante' ? '<span style="font-size:0.75rem;color:#f97316;" title="Red flag détecté → consultation médicale recommandée">⚠️ Visio recommandée</span>' : ''}
      </div>
    </div>
  `).join('');
}

// ── Recharge de crédits via Stripe ─────────────────────────────
function rechargerCredits(pack) {
  // pack peut être 'solo', 'dix', 'vingt', 'cinquante'
  const packMap = {
    solo: { stripe: 'pack_solo', nb: 1, prix: 20 },
    dix: { stripe: 'pack_dix', nb: 10, prix: 180 },
    vingt: { stripe: 'pack_vingt', nb: 20, prix: 340 },
    cinquante: { stripe: 'pack_cinquante', nb: 50, prix: 840 }
  };
  
  const selected = packMap[pack];
  if (!selected) return;
  
  // Utiliser StripeCheckout si disponible
  if (typeof StripeCheckout !== 'undefined' && StripeCheckout.acheterPack) {
    StripeCheckout.acheterPack(selected.stripe);
  } else {
    // Fallback mode démo
    if (confirm(`Mode démo : Simuler l'achat de ${selected.nb} crédits pour ${selected.prix} € HT ?`)) {
      const profil = loadProfil();
      profil.credits = (profil.credits || 0) + selected.nb;
      saveProfil(profil);
      updateMetrics(profil);
      
      // Ajouter à l'historique des achats
      const achats = JSON.parse(localStorage.getItem('nutridoc_presc_achats') || '[]');
      achats.push({
        date: new Date().toISOString(),
        pack: pack,
        nb_credits: selected.nb,
        prix: selected.prix
      });
      localStorage.setItem('nutridoc_presc_achats', JSON.stringify(achats));
      
      alert(`${selected.nb} crédits ajoutés ! Total : ${profil.credits} crédits.`);
    }
  }
}

// ── Rechargement rapide avec boutons ───────────────────────────
function recharger(nb, prix, packKey) {
  rechargerCredits(packKey);
}

// ── Créer une demande de plan ─────────────────────────────────
function creerDemande(e) {
  e.preventDefault();
  
  const profil = loadProfil();
  
  if ((profil.credits || 0) <= 0) {
    alert('Vous n\'avez plus de crédits. Rechargez votre compte ci-dessous.');
    return;
  }
  
  const perimCheck = document.getElementById('perimCheck');
  if (!perimCheck || !perimCheck.checked) {
    alert('Veuillez confirmer le périmètre non médical de la demande.');
    return;
  }
  
  const prenom   = document.getElementById('clientPrenom')?.value.trim();
  const objectif = document.getElementById('clientObjectif')?.value;
  const age      = document.getElementById('clientAge')?.value;
  const poids    = document.getElementById('clientPoids')?.value;
  const taille   = document.getElementById('clientTaille')?.value;
  const activite = document.getElementById('clientActivite')?.value;
  const notes    = document.getElementById('clientNotes')?.value.trim();
  
  if (!prenom || !objectif) { 
    alert('Prénom et objectif sont requis.'); 
    return; 
  }
  
  // Détection des red flags
  const redFlags = [];
  if (objectif === 'sante' || objectif === 'pathologie') {
    redFlags.push(objectif);
  }
  if (age && (parseInt(age) < 16 || parseInt(age) > 80)) {
    redFlags.push('age_extreme');
  }
  
  // Consommer 1 crédit
  profil.credits = (profil.credits || 1) - 1;
  saveProfil(profil);
  
  // Enregistrer la demande
  const demande = {
    id: 'dem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    prenom, 
    objectif, 
    objectifLabel: OBJECTIF_LABELS[objectif] || objectif,
    age: age || null,
    poids: poids || null,
    taille: taille || null,
    activite: activite || null,
    activiteLabel: ACTIVITE_LABELS[activite] || activite,
    notes: notes || null,
    prescripteur: (profil.prenom || '') + ' ' + (profil.nom || ''),
    profession: profil.profession || 'prescripteur',
    statut: redFlags.length > 0 ? 'alerte_sante' : 'en_attente',
    redFlags: redFlags,
    date: new Date().toISOString()
  };
  
  const histo = loadHistorique();
  histo.push(demande);
  saveHistorique(histo);
  
  updateMetrics(profil);
  renderHistorique();
  
  // Feedback
  const res = document.getElementById('demandeResultat');
  if (res) {
    res.className = 'status-card';
    const isRedFlag = redFlags.length > 0;
    res.innerHTML = `
      <div class="status-dot ${isRedFlag ? 'alert' : 'pending'}"></div>
      <div>
        <p class="status-label">Demande envoyée pour ${prenom}</p>
        <p class="status-value">${isRedFlag ? '⚠️ Alerte santé détectée — Redirection vers un médecin recommandée' : 'En attente de validation par le diététicien (~48h)'}</p>
      </div>
      <div class="status-eta">−1 crédit</div>
    `;
  }
  
  // Réinitialiser le formulaire
  const form = document.getElementById('prescDemandeForm');
  if (form) form.reset();
  if (perimCheck) perimCheck.checked = false;
  
  // Simuler validation après 4s (mode démo)
  setTimeout(() => {
    const h = loadHistorique();
    const lastDemande = h[h.length - 1];
    if (lastDemande && lastDemande.statut === 'en_attente') {
      lastDemande.statut = 'valide';
      saveHistorique(h);
      renderHistorique();
      
      // Mettre à jour le feedback
      if (res && res.parentNode) {
        const newRes = document.createElement('div');
        newRes.className = 'status-card';
        newRes.innerHTML = `
          <div class="status-dot success"></div>
          <div>
            <p class="status-label">Plan validé pour ${prenom}</p>
            <p class="status-value">Le patient peut consulter son plan personnalisé dans son espace</p>
          </div>
        `;
        res.parentNode.replaceChild(newRes, res);
        setTimeout(() => newRes.remove(), 5000);
      }
    }
  }, 4000);
}

// ── Afficher l'historique des achats ──────────────────────────
function renderAchats() {
  const container = document.getElementById('achatsList');
  if (!container) return;
  
  const achats = JSON.parse(localStorage.getItem('nutridoc_presc_achats') || '[]');
  if (achats.length === 0) {
    container.innerHTML = '<p style="font-size:0.8rem;color:#6b7b74;">Aucun rechargement pour le moment.</p>';
    return;
  }
  
  container.innerHTML = achats.slice().reverse().map(a => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0;border-bottom:1px solid #eef4ee;">
      <div>
        <span style="font-weight:500;">${a.nb_credits} crédits</span>
        <span style="font-size:0.7rem;color:#6b7b74;margin-left:0.5rem;">${new Date(a.date).toLocaleDateString('fr-FR')}</span>
      </div>
      <span style="font-weight:600;color:#1D9E75;">${a.prix}€ HT</span>
    </div>
  `).join('');
}

// ── Initialisation ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const profil = loadProfil();
  const titres = { 
    coach_sportif: 'Coach sportif', 
    preparateur: 'Préparateur physique', 
    kine: 'Kinésithérapeute',
    medecin: 'Médecin',
    pharmacien: 'Pharmacien',
    autre: 'Professionnel de santé'
  };
  
  const greeting = document.getElementById('prescGreeting');
  const sousTitre = document.getElementById('prescSousTitre');
  const prescTag = document.getElementById('prescTag');
  
  if (greeting) greeting.textContent = profil.prenom ? 'Bonjour ' + profil.prenom + ' 👋' : 'Bonjour 👋';
  if (sousTitre) sousTitre.textContent = (titres[profil.profession] || 'Prescripteur') + ' · NutriDoc';
  if (prescTag) prescTag.textContent = profil.prenom || 'Pro';
  
  updateMetrics(profil);
  renderHistorique();
  renderAchats();
  
  const form = document.getElementById('prescDemandeForm');
  if (form) {
    form.addEventListener('submit', creerDemande);
  }
  
  // Exposer les fonctions globales
  window.recharger = recharger;
  window.rechargerCredits = rechargerCredits;
  window.creerDemande = creerDemande;
});

// Exporter pour utilisation externe
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { loadProfil, saveProfil, loadHistorique, saveHistorique, updateMetrics, renderHistorique, rechargerCredits, creerDemande };
}