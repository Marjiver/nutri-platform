// ── Navigation onglets ────────────────────────────────────────────────────────
function showTab(name, btn) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
  document.querySelectorAll('.diet-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + name).classList.remove('hidden');
  btn.classList.add('active');
}

// ── Dossiers ──────────────────────────────────────────────────────────────────
function togglePlan(btn) {
  const detail = btn.closest('.patient-card').querySelector('.plan-detail');
  const hidden = detail.classList.toggle('hidden');
  btn.textContent = hidden ? 'Voir le plan' : 'Masquer';
}

function validerPlan(btn) {
  const card    = btn.closest('.patient-card');
  const patient = card.dataset.patient;
  const montant = parseFloat(card.dataset.montant);

  btn.textContent = 'Validé ✓';
  btn.disabled = true;
  btn.style.background = '#6b7280';

  // Ajouter la facture automatiquement
  ajouterFacture({
    patient:    patient === 'marie' ? 'Marie D.' : 'Thomas K.',
    prestation: 'Plan alimentaire personnalisé',
    montantHT:  montant,
    date:       new Date().toLocaleDateString('fr-FR')
  });

  // Vérifier si chat activé → ajouter ligne facture chat
  if (card.dataset.formule === 'pro') {
    ajouterFacture({
      patient:    'Marie D.',
      prestation: 'Option chat premium',
      montantHT:  4.90,
      date:       new Date().toLocaleDateString('fr-FR')
    });
  }
}

// ── Chat ──────────────────────────────────────────────────────────────────────
const conversations = {
  marie: {
    nom: 'Marie D.', initiales: 'MD',
    context: 'Perte de poids · Chat premium activé',
    messages: [
      { role: 'patient', texte: 'Bonjour docteur, j\'ai une question sur les grammages du déjeuner. Est-ce que je peux remplacer le poulet par du thon en boîte ?', heure: '14:30' },
      { role: 'patient', texte: 'Et aussi, la collation du soir est-elle obligatoire ?', heure: '14:32' }
    ]
  },
  lucas: {
    nom: 'Lucas B.', initiales: 'LB',
    context: 'Prise de masse · Chat premium activé',
    messages: [
      { role: 'diet', texte: 'Bonjour Lucas, votre plan a bien été validé. N\'hésitez pas si vous avez des questions !', heure: '10:15' },
      { role: 'patient', texte: 'Merci pour le plan, c\'est très clair !', heure: '11:02' }
    ]
  }
};

let currentConv = 'marie';

function openConv(id, el) {
  currentConv = id;
  document.querySelectorAll('.chat-conv').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderMessages(id);
  document.getElementById('chatAvatar').textContent      = conversations[id].initiales;
  document.getElementById('chatPatientName').textContent = conversations[id].nom;
  document.querySelector('#chatWindow .chat-window-header div div:last-child').textContent = conversations[id].context;
  // Supprimer badge non lu
  const unread = el.querySelector('.chat-unread');
  if (unread) unread.remove();
}

function renderMessages(id) {
  const box = document.getElementById('chatMessages');
  box.innerHTML = conversations[id].messages.map(m =>
    '<div class="chat-msg ' + m.role + '">' +
      '<div class="chat-bubble">' + m.texte + '</div>' +
      '<div class="chat-msg-time">' + m.heure + '</div>' +
    '</div>'
  ).join('');
  box.scrollTop = box.scrollHeight;
}

function sendMsg() {
  const inp = document.getElementById('chatInput');
  const texte = inp.value.trim();
  if (!texte) return;
  const heure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  conversations[currentConv].messages.push({ role: 'diet', texte, heure });
  renderMessages(currentConv);
  inp.value = '';
}

// ── Facturation ───────────────────────────────────────────────────────────────
let factureNum = 2501;
const factures = [
  { num: 'FAC-2501', date: '01/03/2025', patient: 'Sophie M.',  prestation: 'Plan alimentaire personnalisé', ht: 12.42, tva: 0,    ttc: 12.42, statut: 'payée' },
  { num: 'FAC-2502', date: '03/03/2025', patient: 'Jean-Luc P.', prestation: 'Plan alimentaire personnalisé', ht: 12.42, tva: 0,    ttc: 12.42, statut: 'payée' },
  { num: 'FAC-2503', date: '05/03/2025', patient: 'Clara B.',   prestation: 'Plan alimentaire + option chat', ht: 16.50, tva: 0,    ttc: 16.50, statut: 'payée' },
  { num: 'FAC-2504', date: '12/03/2025', patient: 'Marie D.',   prestation: 'Plan alimentaire personnalisé', ht: 12.42, tva: 0,    ttc: 12.42, statut: 'en attente' },
  { num: 'FAC-2505', date: '12/03/2025', patient: 'Thomas K.',  prestation: 'Plan alimentaire personnalisé', ht: 12.42, tva: 0,    ttc: 12.42, statut: 'en attente' },
];
// Note : diététiciens = prestataires de soins → TVA 0% (exonération art. 261 CGI)

function ajouterFacture(data) {
  factureNum++;
  factures.push({
    num:        'FAC-' + factureNum,
    date:       data.date,
    patient:    data.patient,
    prestation: data.prestation,
    ht:         parseFloat((data.montantHT * 0.834).toFixed(2)),
    tva:        0,
    ttc:        data.montantHT,
    statut:     'en attente'
  });
  renderFactures();
}

function renderFactures() {
  const tbody = document.getElementById('factBody');
  if (!tbody) return;
  tbody.innerHTML = factures.map(f => {
    const statutClass = f.statut === 'payée' ? 'statut-paye' : 'statut-attente';
    return '<tr>' +
      '<td><span class="fact-num">' + f.num + '</span></td>' +
      '<td>' + f.date + '</td>' +
      '<td>' + f.patient + '</td>' +
      '<td>' + f.prestation + '</td>' +
      '<td>' + f.ht.toFixed(2) + ' €</td>' +
      '<td><span class="tva-exempt">0% *</span></td>' +
      '<td><strong>' + f.ttc.toFixed(2) + ' €</strong></td>' +
      '<td><span class="fact-statut ' + statutClass + '">' + f.statut + '</span></td>' +
      '<td><button class="btn-fact-dl" onclick="telechargerFacture(\'' + f.num + '\')">↓ PDF</button></td>' +
    '</tr>';
  }).join('') +
  '<tr class="fact-total-row">' +
    '<td colspan="4" style="text-align:right;font-weight:500;">Total TTC</td>' +
    '<td colspan="4"><strong>' + factures.reduce((s, f) => s + f.ttc, 0).toFixed(2) + ' €</strong></td>' +
    '<td></td>' +
  '</tr>';
  // Note TVA
  if (!document.getElementById('tvaNoteRow')) {
    const note = document.createElement('p');
    note.id = 'tvaNoteRow';
    note.className = 'tva-note';
    note.textContent = '* Exonération de TVA — Art. 261-4-1° du CGI (prestations de soins dispensées par des praticiens réglementés).';
    document.querySelector('.fact-table-wrap').appendChild(note);
  }
}

function exporterCSV() {
  const header = ['N° Facture','Date','Patient','Prestation','Montant HT','TVA','Montant TTC','Statut'];
  const rows = factures.map(f => [f.num, f.date, f.patient, '"' + f.prestation + '"', f.ht.toFixed(2), '0.00', f.ttc.toFixed(2), f.statut]);
  const csv  = [header, ...rows].map(r => r.join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: 'nutri-facturation-mars2025.csv' });
  a.click(); URL.revokeObjectURL(url);
}

function exporterPDFMois() {
  alert('Génération du relevé mensuel PDF — En production, ce bouton génère un PDF via une librairie comme jsPDF ou une API backend.');
}

function envoyerEmail() {
  alert('Envoi automatique vers votre email comptable — En production, intégration avec votre service email (SendGrid, Mailgun…).');
}

function telechargerFacture(num) {
  alert('Téléchargement facture ' + num + ' — En production, génération PDF avec vos coordonnées RPPS, le détail de la prestation et la mention d\'exonération TVA.');
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Charger profil diét
  const profil = JSON.parse(localStorage.getItem('nutri_dieteticien') || '{}');
  if (profil.nom) {
    document.getElementById('dietName').textContent = profil.prenom + ' ' + profil.nom.toUpperCase() + ' — Diététicien';
  }

  // Alertes red flag
  const alertes = JSON.parse(localStorage.getItem('nutri_alertes') || '[]').filter(a => !a.lu);
  if (alertes.length > 0) {
    const RED_LABELS = { grossesse:'Grossesse/allaitement', tca:'TCA', diabete:'Diabète sous traitement', insuffisance_renale:'Insuffisance rénale', bariatrique:'Chirurgie bariatrique', allergies_severes:'Allergies sévères', medicaments:'Médicaments', antecedents:'Antécédents lourds' };
    const greeting = document.querySelector('#tab-dossiers .dashboard-greeting');
    alertes.forEach(a => {
      const div = document.createElement('div');
      div.className = 'alert-redflag';
      div.innerHTML = '<div class="alert-dot"></div><div class="alert-redflag-text"><span class="alert-redflag-title">Dossier red flag — ' + a.patient + '</span>' + a.flags.map(f => RED_LABELS[f]||f).join(', ') + '</div>';
      greeting.appendChild(div);
    });
    const stored = JSON.parse(localStorage.getItem('nutri_alertes') || '[]');
    stored.forEach(a => a.lu = true);
    localStorage.setItem('nutri_alertes', JSON.stringify(stored));
  }

  renderFactures();
});
