const PATIENTS_DEMO = [
  { id:'p1', prenom:'Marie', nom:'D.', age:34, objectif:'perte_poids', activite:'modere', regime:'vegetarien', poids:65, taille:168, statut:'en_attente',
    plan:{ petitDej:[{aliment:"Flocons d'avoine",qte:60,unite:"g"},{aliment:"Lait demi-écrémé",qte:200,unite:"ml"},{aliment:"Compote sans sucre",qte:100,unite:"g"}], dejeuner:[{aliment:"Lentilles cuites",qte:150,unite:"g"},{aliment:"Carottes cuites",qte:100,unite:"g"},{aliment:"Yaourt nature",qte:125,unite:"g"},{aliment:"Huile d'olive",qte:10,unite:"ml"}], collation:[{aliment:"Pomme",qte:150,unite:"g"},{aliment:"Amandes",qte:20,unite:"g"}], diner:[{aliment:"Tofu ferme",qte:120,unite:"g"},{aliment:"Haricots verts cuits",qte:200,unite:"g"},{aliment:"Riz blanc cuit",qte:80,unite:"g"},{aliment:"Huile de colza",qte:8,unite:"ml"}] }
  },
  { id:'p2', prenom:'Thomas', nom:'K.', age:28, objectif:'prise_masse', activite:'actif', regime:'', poids:72, taille:180, statut:'en_attente',
    plan:{ petitDej:[{aliment:"Flocons d'avoine",qte:100,unite:"g"},{aliment:"Lait demi-écrémé",qte:300,unite:"ml"},{aliment:"Beurre de cacahuète",qte:30,unite:"g"},{aliment:"Banane",qte:130,unite:"g"}], dejeuner:[{aliment:"Blanc de poulet cuit",qte:180,unite:"g"},{aliment:"Riz blanc cuit",qte:200,unite:"g"},{aliment:"Brocolis cuits",qte:150,unite:"g"},{aliment:"Huile d'olive",qte:15,unite:"ml"}], collation:[{aliment:"Yaourt grec nature",qte:200,unite:"g"},{aliment:"Banane",qte:120,unite:"g"}], diner:[{aliment:"Saumon cuit",qte:150,unite:"g"},{aliment:"Pomme de terre vapeur",qte:300,unite:"g"},{aliment:"Haricots verts cuits",qte:150,unite:"g"},{aliment:"Huile de colza",qte:10,unite:"ml"}] }
  }
];

const REPAS_LABELS = { petitDej:{label:'Petit déjeuner',icon:'🍳'}, dejeuner:{label:'Déjeuner',icon:'🥗'}, collation:{label:'Collation',icon:'🍎'}, diner:{label:'Dîner',icon:'🍽'} };

let patientEnCours = null;
let planEnCours    = null;
let champCiqual    = null;

// ── Kcal ──────────────────────────────────────────────────────────────────
function kcalPour(aliment, qte) {
  const n = aliment.toLowerCase();
  for (const grp of Object.values(CIQUAL)) {
    for (const eq of grp.equivalents) {
      if (eq.aliment.toLowerCase() === n) return Math.round(eq.kcal * qte / 100);
    }
  }
  return null;
}
function totalKcalRepas(items) {
  return items.reduce((s,i) => s + (kcalPour(i.aliment, i.qte) || 0), 0);
}

// Totaux macros/micros pour tout le plan
function totalsPlan(plan) {
  const tot = { kcal:0, prot:0, glu:0, lip:0, fib:0, fer:0, ca:0, vitC:0, vitD:0, b12:0, mg:0, k:0, zn:0 };
  for (const repas of Object.values(plan)) {
    for (const item of repas) {
      const k = kcalPour(item.aliment, item.qte);
      if (k) tot.kcal += k;
      const m = getMacrosMicros(item.aliment, item.qte);
      if (m) { for (const key of Object.keys(m)) tot[key] = +(tot[key] + m[key]).toFixed(1); }
    }
  }
  return tot;
}

// ── Patients list ──────────────────────────────────────────────────────────
function renderPatients() {
  const alertes = JSON.parse(localStorage.getItem('nutridoc_alertes') || '[]');
  const nonLues = alertes.filter(a => !a.lu);
  const az = document.getElementById('alertesZone');
  if (nonLues.length > 0) {
    const RF = { grossesse:'Grossesse',tca:'TCA',diabete:'Diabète',insuffisance_renale:'Insuf. rénale',bariatrique:'Bariatrique',allergies_severes:'Allergies sévères',medicaments:'Médicaments',antecedents:'Antécédents lourds' };
    az.innerHTML = nonLues.map(a => `<div class="alert-alerte_sante" style="margin-bottom:.75rem;"><div class="alert-dot"></div><div class="alert-alerte_sante-text"><span class="alert-alerte_sante-title">Alerte santé — ${a.patient}</span>${a.flags.map(f=>RF[f]||f).join(', ')}</div></div>`).join('');
    alertes.forEach(a => a.lu = true);
    localStorage.setItem('nutridoc_alertes', JSON.stringify(alertes));
  }
  document.getElementById('patientsList').innerHTML = PATIENTS_DEMO.map(p => {
    const t = totalsPlan(p.plan);
    return `<div class="patient-card">
      <div class="patient-info">
        <div class="avatar">${p.prenom[0]+p.nom[0]}</div>
        <div><p class="patient-name">${p.prenom} ${p.nom} — ${p.age} ans</p>
          <p class="patient-meta">${p.poids}kg · ${p.taille}cm · <strong>${t.kcal} kcal/j</strong> · P:${t.prot}g G:${t.glu}g L:${t.lip}g</p></div>
      </div>
      <div class="patient-actions">
        <button class="btn-view" onclick="ouvrirEditeur('${p.id}')">✏ Modifier le plan</button>
        <button class="btn-validate" onclick="validerDirectement('${p.id}')">✓ Valider</button>
      </div>
    </div>`;
  }).join('');
}

// ── Éditeur ────────────────────────────────────────────────────────────────
function ouvrirEditeur(id) {
  patientEnCours = PATIENTS_DEMO.find(p => p.id === id);
  planEnCours    = JSON.parse(JSON.stringify(patientEnCours.plan));
  document.getElementById('editeurTitre').textContent = 'Plan de ' + patientEnCours.prenom + ' ' + patientEnCours.nom;
  renderEditeur();
  document.getElementById('modalEditeur').style.display = 'block';
}

function renderEditeur() {
  const body = document.getElementById('editeurBody');
  const tot  = totalsPlan(planEnCours);
  let html = `<div class="totaux-plan-bar">
    <div class="totaux-macro"><span class="tot-label">Total journalier</span><strong>${tot.kcal} kcal</strong></div>
    <div class="totaux-macro"><span class="tot-label">Protéines</span><strong>${tot.prot}g</strong></div>
    <div class="totaux-macro"><span class="tot-label">Glucides</span><strong>${tot.glu}g</strong></div>
    <div class="totaux-macro"><span class="tot-label">Lipides</span><strong>${tot.lip}g</strong></div>
    <div class="totaux-macro"><span class="tot-label">Fibres</span><strong>${tot.fib}g</strong></div>
  </div>
  <div class="micros-bar">
    <span class="micro-chip">Fe ${tot.fer}mg</span>
    <span class="micro-chip">Ca ${tot.ca}mg</span>
    <span class="micro-chip">Vit C ${tot.vitC}mg</span>
    <span class="micro-chip">Vit D ${tot.vitD}µg</span>
    <span class="micro-chip">B12 ${tot.b12}µg</span>
    <span class="micro-chip">Mg ${tot.mg}mg</span>
    <span class="micro-chip">K ${tot.k}mg</span>
    <span class="micro-chip">Zn ${tot.zn}mg</span>
  </div>`;

  for (const [repasKey, repasData] of Object.entries(REPAS_LABELS)) {
    const items  = planEnCours[repasKey] || [];
    const totalK = totalKcalRepas(items);
    html += `<div class="editeur-repas-block">
      <div class="editeur-repas-header">
        <span>${repasData.icon} <strong>${repasData.label}</strong></span>
        <span class="editeur-kcal-total">${totalK} kcal</span>
      </div>
      <div class="editeur-items" id="items-${repasKey}">`;
    items.forEach((item, idx) => {
      const groupe  = detecterGroupe(item.aliment);
      const grpData = groupe ? CIQUAL[groupe] : null;
      const kcal    = kcalPour(item.aliment, item.qte);
      const macros  = getMacrosMicros(item.aliment, item.qte);
      html += `<div class="editeur-item" id="edititem-${repasKey}-${idx}">
        <input class="editeur-aliment-input" type="text" value="${item.aliment}"
          oninput="updateAliment('${repasKey}',${idx},this.value)" placeholder="Aliment" />
        <div class="groupe-picker">
          <button class="groupe-badge ${grpData ? '' : 'empty'}"
            style="${grpData ? 'background:'+grpData.color+'18;color:'+grpData.color+';border-color:'+grpData.color+'40' : ''}"
            onclick="ouvrirCiqual('${groupe||''}','${repasKey}',${idx})" title="Voir équivalents / changer groupe">
            ${grpData ? grpData.icon+' '+grpData.label : '⊕ Groupe'}
          </button>
        </div>
        <input class="editeur-qte-input" type="number" value="${item.qte}" min="1" step="1"
          oninput="updateQte('${repasKey}',${idx},this.value)" />
        <span class="editeur-unite">${item.unite}</span>
        <span class="editeur-kcal-item">${kcal !== null ? kcal+' kcal' : ''}</span>
        ${macros ? `<span class="editeur-macros-mini">P${macros.prot} G${macros.glu} L${macros.lip}</span>` : ''}
        <button class="editeur-del" onclick="supprimerItem('${repasKey}',${idx})">✕</button>
      </div>`;
    });
    html += `</div><button class="editeur-add-btn" onclick="ajouterItem('${repasKey}')">+ Ajouter un aliment</button></div>`;
  }
  body.innerHTML = html;
}

function updateAliment(repas, idx, val) {
  planEnCours[repas][idx].aliment = val;
  updateItemDisplay(repas, idx);
  updateTotaux();
}
function updateQte(repas, idx, val) {
  planEnCours[repas][idx].qte = parseFloat(val) || 0;
  updateItemDisplay(repas, idx);
  updateTotaux();
}
function updateItemDisplay(repas, idx) {
  const item = planEnCours[repas][idx];
  const el   = document.getElementById('edititem-'+repas+'-'+idx);
  if (!el) return;
  const kcal   = kcalPour(item.aliment, item.qte);
  const macros = getMacrosMicros(item.aliment, item.qte);
  const kcalEl = el.querySelector('.editeur-kcal-item');
  const macEl  = el.querySelector('.editeur-macros-mini');
  if (kcalEl) kcalEl.textContent = kcal !== null ? kcal+' kcal' : '';
  if (macEl && macros) macEl.textContent = 'P'+macros.prot+' G'+macros.glu+' L'+macros.lip;
}
function updateTotaux() {
  const tot = totalsPlan(planEnCours);
  const bar = document.querySelector('.totaux-plan-bar');
  if (!bar) return;
  const vals = bar.querySelectorAll('strong');
  if (vals[0]) vals[0].textContent = tot.kcal+' kcal';
  if (vals[1]) vals[1].textContent = tot.prot+'g';
  if (vals[2]) vals[2].textContent = tot.glu+'g';
  if (vals[3]) vals[3].textContent = tot.lip+'g';
  if (vals[4]) vals[4].textContent = tot.fib+'g';
  const chips = document.querySelectorAll('.micro-chip');
  const microKeys = [['fer','Fe','mg'],['ca','Ca','mg'],['vitC','Vit C','mg'],['vitD','Vit D','µg'],['b12','B12','µg'],['mg','Mg','mg'],['k','K','mg'],['zn','Zn','mg']];
  chips.forEach((c,i) => { if (microKeys[i]) c.textContent = microKeys[i][1]+' '+tot[microKeys[i][0]]+microKeys[i][2]; });
}
function supprimerItem(repas, idx) { planEnCours[repas].splice(idx,1); renderEditeur(); }
function ajouterItem(repas) {
  planEnCours[repas].push({ aliment:'', qte:100, unite:'g' });
  renderEditeur();
  setTimeout(() => {
    const items = document.getElementById('items-'+repas);
    if (items) { const ins = items.querySelectorAll('.editeur-aliment-input'); if (ins.length) ins[ins.length-1].focus(); }
  }, 50);
}
function fermerEditeur() { document.getElementById('modalEditeur').style.display='none'; }
function validerPlan() {
  if (!patientEnCours) return;
  patientEnCours.plan   = planEnCours;
  patientEnCours.statut = 'valide';
  alert('Plan de '+patientEnCours.prenom+' validé et envoyé !');
  // Email livraison plan au patient
  if (typeof Email !== 'undefined') {
    const tot = totalsPlan(planEnCours);
    Email.planLivre(patientEnCours.email || '', {
      prenom:      patientEnCours.prenom,
      diet_nom:    'Dr. Lemaire',
      diet_rpps:   '10 003 456 789',
      kcal:        tot.kcal,
      proteines:   tot.prot,
      visio_dispo: true
    });
  }
  fermerEditeur(); renderPatients();
}
function validerDirectement(id) {
  const p = PATIENTS_DEMO.find(x => x.id===id);
  if (p) { p.statut='valide'; alert('Plan de '+p.prenom+' validé !'); renderPatients(); }
}

// ── CIQUAL popup ──────────────────────────────────────────────────────────
function ouvrirCiqual(groupe, repas, idx) {
  champCiqual = { repas, idx };
  const currentGroupe = groupe || detecterGroupe(planEnCours[repas][idx].aliment) || '';
  renderCiqual(currentGroupe || Object.keys(CIQUAL)[0]);
  document.getElementById('modalCiqual').style.display = 'block';
}

function renderCiqual(groupeKey) {
  const grp = CIQUAL[groupeKey];
  // Onglets groupes
  const tabs = GROUPES_LIST.map(g => `
    <button class="ciqual-tab ${g.key===groupeKey?'active':''}"
      style="${g.key===groupeKey?'border-bottom:2px solid '+g.color+';color:'+g.color:'color:var(--gray)'}"
      onclick="renderCiqual('${g.key}')">${g.icon} <span>${g.label}</span></button>
  `).join('');

  document.getElementById('ciqualTabs').innerHTML = tabs;
  document.getElementById('ciqualGroupLabel').innerHTML = grp.icon + ' ' + grp.label + ' <small style="color:var(--gray);font-weight:400;font-size:0.75rem;">— Table CIQUAL 2020 · cuit</small>';

  document.getElementById('ciqualBody').innerHTML = `
    <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 1fr 1fr;gap:0;font-size:0.7rem;font-weight:500;color:var(--gray);padding:6px 12px;border-bottom:1px solid var(--border);background:#fafafa;">
      <span>Aliment</span><span style="text-align:right">kcal</span><span style="text-align:right">Prot.</span><span style="text-align:right">Glu.</span><span style="text-align:right">Lip.</span><span style="text-align:right">Fib.</span><span style="text-align:right">Équivalence</span>
    </div>
    ${grp.equivalents.map((eq,i) => {
      const refKcal = grp.reference.kcal;
      const equiv   = Math.round(100 * refKcal / eq.kcal);
      return `<div class="ciqual-row2" onclick="choisirEquivalent('${groupeKey}',${i})">
        <div class="ciqual-aliment">${eq.aliment} ${eq.note?'<span class="ciqual-note">('+eq.note+')</span>':''}</div>
        <div class="ciqual-cell kcal-cell">${eq.kcal}</div>
        <div class="ciqual-cell">${eq.prot}g</div>
        <div class="ciqual-cell">${eq.glu}g</div>
        <div class="ciqual-cell">${eq.lip}g</div>
        <div class="ciqual-cell">${eq.fib}g</div>
        <div class="ciqual-cell equiv-cell">≈ ${equiv}${eq.unite} = ${refKcal}kcal</div>
      </div>`;
    }).join('')}
    <div style="padding:8px 12px;font-size:0.68rem;color:var(--gray);border-top:1px solid var(--border);background:#fafafa;">
      Cliquez sur un aliment pour l'utiliser dans le plan · Source : CIQUAL 2020 — Anses
    </div>
  `;
}

function choisirEquivalent(groupe, eqIdx) {
  if (!champCiqual) return;
  const eq = CIQUAL[groupe].equivalents[eqIdx];
  const { repas, idx } = champCiqual;
  planEnCours[repas][idx].aliment = eq.aliment;
  planEnCours[repas][idx].unite   = eq.unite;
  fermerCiqual(); renderEditeur();
}
function fermerCiqual() { document.getElementById('modalCiqual').style.display='none'; champCiqual=null; }

document.addEventListener('DOMContentLoaded', renderPatients);
