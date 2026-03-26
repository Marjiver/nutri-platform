// ── Storage ────────────────────────────────────────────────────────────────
function loadClients() { return JSON.parse(localStorage.getItem('nutri_crm_clients') || '[]'); }
function saveClients(c) { localStorage.setItem('nutri_crm_clients', JSON.stringify(c)); }

const OBJ_LABELS = { reequilibrage:'Rééquilibrage', prise_masse:'Prise de masse', perte_gras:'Perte de gras' };
const STATUT_LABELS = { en_cours:'En cours', atteint:'Objectif atteint', pause:'En pause' };
const STATUT_COLORS = { en_cours:'#22c55e', atteint:'#1a3a6b', pause:'#f59e0b' };

let selectedClientId = null;
let poidsChart = null;

// ── Rendu liste clients ────────────────────────────────────────────────────
function renderClients(clients) {
  const container = document.getElementById('clientsList');
  document.getElementById('clientCount').textContent = clients.length;

  if (clients.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--gray);font-size:0.875rem;">Aucun client.<br>Cliquez sur "+ Nouveau client"</div>';
    return;
  }

  container.innerHTML = clients.map(c => {
    const initiales = (c.prenom[0] + (c.nom ? c.nom[0] : '')).toUpperCase();
    const poidsActuel = c.mesures && c.mesures.length > 0 ? c.mesures[c.mesures.length-1].poids : c.poidsInitial;
    const diff = poidsActuel && c.poidsInitial ? (parseFloat(poidsActuel) - parseFloat(c.poidsInitial)).toFixed(1) : null;
    const diffColor = diff < 0 ? '#22c55e' : diff > 0 ? '#f97316' : 'var(--gray)';
    const isSelected = c.id === selectedClientId;

    return `<div class="crm-client-card ${isSelected ? 'selected' : ''}" onclick="selectClient('${c.id}')">
      <div class="crm-avatar-wrap">
        ${c.photoFace
          ? `<img src="${c.photoFace}" class="crm-avatar-img" alt="${c.prenom}" />`
          : `<div class="crm-avatar-placeholder">${initiales}</div>`
        }
        <div class="crm-statut-dot" style="background:${STATUT_COLORS[c.statut] || '#888'}"></div>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:500;font-size:0.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.prenom} ${c.nom || ''}</div>
        <div style="font-size:0.75rem;color:var(--gray);">${OBJ_LABELS[c.objectif] || c.objectif}</div>
        ${diff !== null ? `<div style="font-size:0.75rem;font-weight:500;color:${diffColor};">${diff > 0 ? '+' : ''}${diff} kg</div>` : ''}
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="font-size:0.7rem;font-weight:500;color:${STATUT_COLORS[c.statut]};background:${STATUT_COLORS[c.statut]}18;padding:2px 8px;border-radius:999px;">${STATUT_LABELS[c.statut] || ''}</div>
        ${c.rappelDate ? `<div style="font-size:0.7rem;color:#f59e0b;margin-top:4px;">J-${joursRestants(c.rappelDate)}</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

function joursRestants(dateStr) {
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  return diff > 0 ? diff : 0;
}

function filterClients() {
  const search  = (document.getElementById('searchClient').value || '').toLowerCase();
  const statut  = document.getElementById('filterStatut').value;
  const objectif = document.getElementById('filterObjectif').value;
  let clients = loadClients().filter(c => {
    const nom = (c.prenom + ' ' + (c.nom || '')).toLowerCase();
    return (!search || nom.includes(search))
      && (!statut  || c.statut  === statut)
      && (!objectif || c.objectif === objectif);
  });
  renderClients(clients);
}

// ── Sélection client ───────────────────────────────────────────────────────
function selectClient(id) {
  selectedClientId = id;
  const clients = loadClients();
  const c = clients.find(x => x.id === id);
  if (!c) return;

  document.getElementById('fichePlaceholder').style.display = 'none';
  document.getElementById('ficheClient').style.display = 'block';

  // Infos header
  document.getElementById('ficheNom').textContent = c.prenom + ' ' + (c.nom || '');
  document.getElementById('ficheObjectif').textContent = OBJ_LABELS[c.objectif] || c.objectif;
  document.getElementById('fichePoids').textContent = c.poidsInitial ? c.poidsInitial + ' kg' : '—';
  const poidsActuel = c.mesures && c.mesures.length > 0 ? c.mesures[c.mesures.length-1].poids : c.poidsInitial;
  document.getElementById('fichePoidsActuel').textContent = poidsActuel ? poidsActuel + ' kg' : '—';
  document.getElementById('ficheStatutSelect').value = c.statut || 'en_cours';
  document.getElementById('ficheRappel').textContent = c.rappelDate ? new Date(c.rappelDate).toLocaleDateString('fr-FR') : '—';

  // Photos
  renderPhotos(c);

  // Notes
  document.getElementById('ficheNotes').value = c.notes || '';
  document.getElementById('rappelDelai').value = c.rappelDelai || 30;
  updateRappelDate(c.rappelDate);

  // Courbe poids
  renderCourbe(c);

  // Plans
  renderPlans(c);

  // Refresh liste (highlight)
  filterClients();

  // Onglet par défaut
  switchTabDirect('courbe');
}

function renderPhotos(c) {
  const grid = document.getElementById('photosGrid');
  const slots = [
    { key: 'photoFace',   label: 'Visage' },
    { key: 'photoGauche', label: 'Profil G.' },
    { key: 'photoDroit',  label: 'Profil D.' },
    { key: 'photoDos',    label: 'Dos' }
  ];
  grid.innerHTML = slots.map(s => `
    <div style="aspect-ratio:3/4;background:var(--gray-light);border-radius:var(--radius-sm);overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;">
      ${c[s.key]
        ? `<img src="${c[s.key]}" style="width:100%;height:100%;object-fit:cover;" />`
        : `<div style="font-size:0.7rem;color:var(--gray);text-align:center;padding:8px;">${s.label}</div>`
      }
      <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.45);color:#fff;font-size:0.65rem;text-align:center;padding:3px 0;">${s.label}</div>
    </div>
  `).join('');
}

function renderCourbe(c) {
  const mesures = c.mesures || [];
  if (poidsChart) { poidsChart.destroy(); poidsChart = null; }

  const ctx = document.getElementById('chartPoids').getContext('2d');
  const labels = mesures.map(m => new Date(m.date).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' }));
  const data   = mesures.map(m => parseFloat(m.poids));

  // Ligne objectif
  const objectifPoids = c.poidsObjectif ? parseFloat(c.poidsObjectif) : null;

  poidsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.length > 0 ? labels : ['Départ'],
      datasets: [{
        label: 'Poids (kg)',
        data: data.length > 0 ? data : [parseFloat(c.poidsInitial) || 0],
        borderColor: '#1a3a6b',
        backgroundColor: '#1a3a6b18',
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: '#1a3a6b',
        fill: true,
        tension: 0.3
      },
      ...(objectifPoids ? [{
        label: 'Objectif',
        data: Array(Math.max(labels.length, 1)).fill(objectifPoids),
        borderColor: '#22c55e',
        borderWidth: 1.5,
        borderDash: [6, 4],
        pointRadius: 0,
        fill: false
      }] : [])
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { grid: { color: '#f0f0f0' }, ticks: { font: { size: 11 } } },
        x: { grid: { display: false }, ticks: { font: { size: 11 } } }
      }
    }
  });

  // Stats
  const stats = document.getElementById('poidsStats');
  if (mesures.length >= 2) {
    const diff = (data[data.length-1] - data[0]).toFixed(1);
    const diffColor = diff < 0 ? '#22c55e' : '#f97316';
    stats.innerHTML = `
      <div class="metric-card"><div class="metric-label">Départ</div><div class="metric-value" style="font-size:1.1rem;">${data[0]} kg</div></div>
      <div class="metric-card"><div class="metric-label">Actuel</div><div class="metric-value" style="font-size:1.1rem;">${data[data.length-1]} kg</div></div>
      <div class="metric-card"><div class="metric-label">Évolution</div><div class="metric-value" style="font-size:1.1rem;color:${diffColor};">${diff > 0 ? '+' : ''}${diff} kg</div></div>
    `;
  } else {
    stats.innerHTML = '<p style="font-size:0.8rem;color:var(--gray);grid-column:1/-1;">Ajoutez des mesures pour voir l\'évolution.</p>';
  }
}

function renderPlans(c) {
  const container = document.getElementById('plansHistorique');
  const plans = c.plans || [];
  const OBJ = { reequilibrage:'Rééquilibrage', prise_masse:'Prise de masse', perte_gras:'Perte de gras' };
  const ST  = { en_attente:'En attente', valide:'Validé', redflag:'Red flag' };
  const SC  = { en_attente:'#f59e0b', valide:'#22c55e', redflag:'#f97316' };

  if (plans.length === 0) {
    container.innerHTML = '<div style="background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:1.25rem;text-align:center;color:var(--gray);font-size:0.875rem;">Aucun plan pour ce client.</div>';
    return;
  }
  container.innerHTML = plans.map((p, i) => `
    <div style="background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:1rem 1.25rem;display:flex;align-items:center;gap:1rem;">
      <div style="width:36px;height:36px;background:#eff6ff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:500;color:#1a3a6b;">${i+1}</div>
      <div style="flex:1;">
        <div style="font-weight:500;font-size:0.875rem;">${OBJ[p.objectif] || p.objectif}</div>
        <div style="font-size:0.75rem;color:var(--gray);">${new Date(p.date).toLocaleDateString('fr-FR')}</div>
      </div>
      <span style="font-size:0.75rem;font-weight:500;color:${SC[p.statut]};background:${SC[p.statut]}18;padding:3px 10px;border-radius:999px;">${ST[p.statut] || p.statut}</span>
    </div>
  `).join('');
}

// ── Actions ────────────────────────────────────────────────────────────────
function updateStatut(val) {
  const clients = loadClients();
  const c = clients.find(x => x.id === selectedClientId);
  if (!c) return;
  c.statut = val;
  saveClients(clients);
  filterClients();
}

function saveNotes() {
  const clients = loadClients();
  const c = clients.find(x => x.id === selectedClientId);
  if (!c) return;
  c.notes = document.getElementById('ficheNotes').value;
  saveClients(clients);
  const saved = document.getElementById('notesSaved');
  saved.style.opacity = '1';
  setTimeout(() => { saved.style.opacity = '0'; }, 1500);
}

function updateRappel(jours) {
  const clients = loadClients();
  const c = clients.find(x => x.id === selectedClientId);
  if (!c) return;
  const d = new Date();
  d.setDate(d.getDate() + parseInt(jours));
  c.rappelDate  = d.toISOString();
  c.rappelDelai = jours;
  saveClients(clients);
  document.getElementById('ficheRappel').textContent = d.toLocaleDateString('fr-FR');
  updateRappelDate(d.toISOString());
}

function updateRappelDate(dateStr) {
  const el = document.getElementById('rappelDate');
  if (dateStr && el) el.textContent = '→ ' + new Date(dateStr).toLocaleDateString('fr-FR');
}

// ── Modals ─────────────────────────────────────────────────────────────────
function ouvrirNouveauClient() { document.getElementById('modalNouveauClient').style.display = 'block'; }
function fermerNouveauClient() { document.getElementById('modalNouveauClient').style.display = 'none'; }

function previewPhoto(input) {
  if (!input.files[0]) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('ncPhotoPreview').innerHTML =
      `<img src="${e.target.result}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:2px solid #1a3a6b;" />`;
    input._dataUrl = e.target.result;
  };
  reader.readAsDataURL(input.files[0]);
}

function previewPhotoSlot(input, previewId) {
  if (!input.files[0]) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById(previewId).innerHTML =
      `<img src="${e.target.result}" style="width:100%;height:60px;object-fit:cover;border-radius:4px;" />`;
    input._dataUrl = e.target.result;
  };
  reader.readAsDataURL(input.files[0]);
}

function creerClient() {
  const prenom = document.getElementById('ncPrenom').value.trim();
  if (!prenom) { alert('Le prénom est requis.'); return; }
  const photoInput = document.getElementById('ncPhoto');
  const client = {
    id: 'c_' + Date.now(),
    prenom,
    nom:           document.getElementById('ncNom').value.trim(),
    age:           document.getElementById('ncAge').value,
    poidsInitial:  document.getElementById('ncPoids').value,
    taille:        document.getElementById('ncTaille').value,
    objectif:      document.getElementById('ncObjectif').value,
    statut:        'en_cours',
    photoFace:     photoInput._dataUrl || null,
    mesures:       [],
    plans:         [],
    notes:         '',
    date:          new Date().toISOString()
  };
  // Mesure initiale si poids renseigné
  if (client.poidsInitial) {
    client.mesures.push({ date: new Date().toISOString(), poids: client.poidsInitial });
  }
  const clients = loadClients();
  clients.push(client);
  saveClients(clients);
  fermerNouveauClient();
  filterClients();
  selectClient(client.id);
  document.getElementById('ncPrenom').value = '';
  document.getElementById('ncNom').value = '';
  document.getElementById('ncAge').value = '';
  document.getElementById('ncPoids').value = '';
  document.getElementById('ncTaille').value = '';
  document.getElementById('ncPhotoPreview').innerHTML = '';
  delete photoInput._dataUrl;
}

// Ajouter poids
function ajouterPoids() {
  document.getElementById('mesureDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('modalAjouterPoids').style.display = 'block';
}
function fermerAjouterPoids() { document.getElementById('modalAjouterPoids').style.display = 'none'; }
function confirmerPoids() {
  const date  = document.getElementById('mesureDate').value;
  const poids = document.getElementById('mesurePoids').value;
  if (!poids) { alert('Entrez un poids.'); return; }
  const clients = loadClients();
  const c = clients.find(x => x.id === selectedClientId);
  if (!c) return;
  c.mesures = c.mesures || [];
  c.mesures.push({ date: new Date(date).toISOString(), poids: parseFloat(poids) });
  c.mesures.sort((a,b) => new Date(a.date) - new Date(b.date));
  saveClients(clients);
  fermerAjouterPoids();
  selectClient(selectedClientId);
}

// Ajouter photos
function ajouterPhotos() { document.getElementById('modalAjouterPhotos').style.display = 'block'; }
function fermerAjouterPhotos() { document.getElementById('modalAjouterPhotos').style.display = 'none'; }
function confirmerPhotos() {
  const clients = loadClients();
  const c = clients.find(x => x.id === selectedClientId);
  if (!c) return;
  const slots = [['photoFace','photoFace'],['photoGauche','photoGauche'],['photoDroit','photoDroit'],['photoDos','photoDos']];
  slots.forEach(([inputId, key]) => {
    const inp = document.getElementById(inputId);
    if (inp._dataUrl) { c[key] = inp._dataUrl; delete inp._dataUrl; }
  });
  saveClients(clients);
  fermerAjouterPhotos();
  renderPhotos(c);
}

// Nouvelle demande plan
function nouvelleDemande() {
  const c = loadClients().find(x => x.id === selectedClientId);
  if (!c) return;
  const profil = JSON.parse(localStorage.getItem('nutri_prescripteur') || '{}');
  if ((profil.credits || 0) <= 0) { alert('Plus de crédits. Rechargez votre compte.'); return; }
  profil.credits = (profil.credits || 1) - 1;
  localStorage.setItem('nutri_prescripteur', JSON.stringify(profil));
  const clients = loadClients();
  const client  = clients.find(x => x.id === selectedClientId);
  client.plans  = client.plans || [];
  client.plans.push({ objectif: client.objectif, statut: 'en_attente', date: new Date().toISOString() });
  saveClients(clients);
  renderPlans(client);
  setTimeout(() => {
    const cl = loadClients();
    const cc = cl.find(x => x.id === selectedClientId);
    if (cc && cc.plans.length > 0) { cc.plans[cc.plans.length-1].statut = 'valide'; saveClients(cl); renderPlans(cc); }
  }, 3000);
}

// Export fiche (simulation)
function exportFiche() {
  const c = loadClients().find(x => x.id === selectedClientId);
  if (!c) return;
  alert('Export PDF de la fiche de ' + c.prenom + ' — fonctionnalité disponible avec un backend.');
}

// ── Onglets ────────────────────────────────────────────────────────────────
function switchTab(btn, tabId) {
  document.querySelectorAll('.fiche-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
  btn.classList.add('active');
  document.getElementById('tab-' + tabId).classList.remove('hidden');
  if (tabId === 'courbe') {
    const c = loadClients().find(x => x.id === selectedClientId);
    if (c) renderCourbe(c);
  }
}
function switchTabDirect(tabId) {
  document.querySelectorAll('.fiche-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
  document.getElementById('tab-' + tabId).classList.remove('hidden');
}

// ── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Données de démo
  const existants = loadClients();
  if (existants.length === 0) {
    const demo = [
      { id:'c_demo1', prenom:'Julien', nom:'Bernard', age:28, poidsInitial:82, taille:180, objectif:'perte_gras', statut:'en_cours', photoFace:null, notes:'Motivé, manque de régularité le week-end.', rappelDate: new Date(Date.now()+12*86400000).toISOString(), rappelDelai:30,
        mesures:[
          { date: new Date(Date.now()-60*86400000).toISOString(), poids:82 },
          { date: new Date(Date.now()-45*86400000).toISOString(), poids:80.5 },
          { date: new Date(Date.now()-30*86400000).toISOString(), poids:79.2 },
          { date: new Date(Date.now()-15*86400000).toISOString(), poids:78.1 },
          { date: new Date().toISOString(), poids:77.4 }
        ],
        plans:[{ objectif:'perte_gras', statut:'valide', date: new Date(Date.now()-55*86400000).toISOString() }]
      },
      { id:'c_demo2', prenom:'Sarah', nom:'Moreau', age:24, poidsInitial:58, taille:165, objectif:'prise_masse', statut:'en_cours', photoFace:null, notes:'Végétarienne. Entraînement 5x/sem.',
        mesures:[
          { date: new Date(Date.now()-30*86400000).toISOString(), poids:58 },
          { date: new Date(Date.now()-15*86400000).toISOString(), poids:58.8 },
          { date: new Date().toISOString(), poids:59.5 }
        ],
        plans:[]
      },
      { id:'c_demo3', prenom:'Marc', nom:'Dupont', age:35, poidsInitial:90, taille:178, objectif:'reequilibrage', statut:'atteint', photoFace:null, notes:'Objectif atteint en 3 mois.',
        mesures:[
          { date: new Date(Date.now()-90*86400000).toISOString(), poids:90 },
          { date: new Date(Date.now()-60*86400000).toISOString(), poids:87 },
          { date: new Date(Date.now()-30*86400000).toISOString(), poids:84.5 },
          { date: new Date().toISOString(), poids:83 }
        ],
        plans:[{ objectif:'reequilibrage', statut:'valide', date: new Date(Date.now()-85*86400000).toISOString() }]
      }
    ];
    saveClients(demo);
  }
  filterClients();
});
