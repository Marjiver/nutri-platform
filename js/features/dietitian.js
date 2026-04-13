/**
 * dietitian.js — NutriDoc · Espace diététicien
 * Version corrigée utilisant la table CIQUAL complète de ciqual-data.js
 */

// ── Définition de PATIENTS pour compatibilité avec d'autres modules ─────────
const PATIENTS_DEMO = [
  { 
    id: 'p1', 
    prenom: 'Marie', 
    nom: 'D.', 
    age: 34, 
    objectif: 'perte_poids', 
    activite: 'modere', 
    regime: 'vegetarien', 
    poids: 65, 
    taille: 168, 
    statut: 'en_attente', 
    email: 'marie.d@example.com',
    plan: {
      petitDej: [
        { aliment: "Flocons d'avoine", qte: 60, unite: "g" },
        { aliment: "Lait demi-écrémé", qte: 200, unite: "ml" },
        { aliment: "Compote sans sucre", qte: 100, unite: "g" }
      ],
      dejeuner: [
        { aliment: "Lentilles cuites", qte: 150, unite: "g" },
        { aliment: "Carottes cuites", qte: 100, unite: "g" },
        { aliment: "Yaourt nature", qte: 125, unite: "g" },
        { aliment: "Huile d'olive", qte: 10, unite: "ml" }
      ],
      collation: [
        { aliment: "Pomme", qte: 150, unite: "g" },
        { aliment: "Amandes", qte: 20, unite: "g" }
      ],
      diner: [
        { aliment: "Tofu ferme", qte: 120, unite: "g" },
        { aliment: "Haricots verts cuits", qte: 200, unite: "g" },
        { aliment: "Riz blanc cuit", qte: 80, unite: "g" },
        { aliment: "Huile de colza", qte: 8, unite: "ml" }
      ]
    }
  },
  { 
    id: 'p2', 
    prenom: 'Thomas', 
    nom: 'K.', 
    age: 28, 
    objectif: 'prise_masse', 
    activite: 'actif', 
    regime: '', 
    poids: 72, 
    taille: 180, 
    statut: 'en_attente', 
    email: 'thomas.k@example.com',
    plan: {
      petitDej: [
        { aliment: "Flocons d'avoine", qte: 100, unite: "g" },
        { aliment: "Lait demi-écrémé", qte: 300, unite: "ml" },
        { aliment: "Beurre de cacahuète", qte: 30, unite: "g" },
        { aliment: "Banane", qte: 130, unite: "g" }
      ],
      dejeuner: [
        { aliment: "Blanc de poulet cuit", qte: 180, unite: "g" },
        { aliment: "Riz blanc cuit", qte: 200, unite: "g" },
        { aliment: "Brocolis cuits", qte: 150, unite: "g" },
        { aliment: "Huile d'olive", qte: 15, unite: "ml" }
      ],
      collation: [
        { aliment: "Yaourt grec nature", qte: 200, unite: "g" },
        { aliment: "Banane", qte: 120, unite: "g" }
      ],
      diner: [
        { aliment: "Saumon cuit", qte: 150, unite: "g" },
        { aliment: "Pomme de terre vapeur", qte: 300, unite: "g" },
        { aliment: "Haricots verts cuits", qte: 150, unite: "g" },
        { aliment: "Huile de colza", qte: 10, unite: "ml" }
      ]
    }
  }
];

// ── Alias pour compatibilité avec dossier-patient.js ──────────────────────
const PATIENTS = PATIENTS_DEMO;

// ── Vérification que CIQUAL est chargé ────────────────────────────────────
if (typeof CIQUAL === 'undefined') {
  console.error('[dietitian.js] ❌ CIQUAL non chargé ! Vérifiez que ciqual-data.js est inclus AVANT dietitian.js');
  console.warn('[dietitian.js] ⚠️ Utilisation d\'une base de données réduite en fallback');
  
  // Fallback minimal pour éviter les erreurs complètes
  var CIQUAL = {
    feculents: { label: "Féculents", icon: "🌾", color: "#f59e0b", equivalents: [] },
    proteines_animales: { label: "Protéines", icon: "🥩", color: "#ef4444", equivalents: [] },
    legumes: { label: "Légumes", icon: "🥬", color: "#10b981", equivalents: [] },
    fruits: { label: "Fruits", icon: "🍎", color: "#f97316", equivalents: [] },
    laitiers: { label: "Laitiers", icon: "🥛", color: "#60a5fa", equivalents: [] },
    matieres_grasses: { label: "Matières grasses", icon: "🫒", color: "#a78bfa", equivalents: [] }
  };
}

// ── GROUPES_LIST depuis CIQUAL ou fallback ─────────────────────────────────
const GROUPES_LIST = (typeof GROUPES_LIST !== 'undefined' && GROUPES_LIST.length > 0)
  ? GROUPES_LIST
  : Object.entries(CIQUAL).map(([k, v]) => ({
      key: k,
      label: v.label,
      icon: v.icon,
      color: v.color
    }));

// ── Labels des repas ──────────────────────────────────────────────────────
const REPAS_LABELS = {
  petitDej: { label: 'Petit déjeuner', icon: '🍳' },
  dejeuner: { label: 'Déjeuner', icon: '🥗' },
  collation: { label: 'Collation', icon: '🍎' },
  diner: { label: 'Dîner', icon: '🍽' }
};

// ── Variables globales ────────────────────────────────────────────────────
let patientEnCours = null;
let planEnCours = null;
let champCiqual = null;

// ── Fonction kcalPour (utilise CIQUAL de ciqual-data.js) ──────────────────
function kcalPour(aliment, qte) {
  if (typeof window.kcalPour === 'function') {
    return window.kcalPour(aliment, qte);
  }
  // Fallback manuel
  if (!aliment) return null;
  const n = aliment.toLowerCase();
  for (const grp of Object.values(CIQUAL)) {
    for (const eq of grp.equivalents) {
      if (eq.aliment && eq.aliment.toLowerCase() === n) {
        return Math.round(eq.kcal * qte / 100);
      }
    }
  }
  return null;
}

// ── Fonction totalKcalRepas ───────────────────────────────────────────────
function totalKcalRepas(items) {
  if (!items || !Array.isArray(items)) return 0;
  return items.reduce((s, i) => s + (kcalPour(i.aliment, i.qte) || 0), 0);
}

// ── Fonction totalsPlan (utilise getMacrosMicros de ciqual-data.js) ────────
function totalsPlan(plan) {
  if (!plan) {
    return { kcal: 0, prot: 0, glu: 0, lip: 0, fib: 0, fer: 0, ca: 0, vitC: 0, vitD: 0, b12: 0, mg: 0, k: 0, zn: 0 };
  }
  
  const tot = { kcal: 0, prot: 0, glu: 0, lip: 0, fib: 0, fer: 0, ca: 0, vitC: 0, vitD: 0, b12: 0, mg: 0, k: 0, zn: 0 };
  
  for (const repas of Object.values(plan)) {
    if (!repas || !Array.isArray(repas)) continue;
    for (const item of repas) {
      const k = kcalPour(item.aliment, item.qte);
      if (k) tot.kcal += k;
      
      // Utiliser la fonction globale getMacrosMicros si disponible
      let m = null;
      if (typeof window.getMacrosMicros === 'function') {
        m = window.getMacrosMicros(item.aliment, item.qte);
      }
      if (m) {
        for (const key of Object.keys(m)) {
          if (tot.hasOwnProperty(key)) {
            tot[key] = +(tot[key] + (m[key] || 0)).toFixed(1);
          }
        }
      }
    }
  }
  return tot;
}

// ── Charger le profil réel du diététicien depuis Supabase ─────────────────
async function loadDietProfile() {
  const headerEl = document.getElementById('dietHeader');
  const subEl = document.getElementById('dietSubHeader');

  // Tentative Supabase
  try {
    if (typeof _supa !== 'undefined' && _supa) {
      const { data: { user } } = await _supa.auth.getUser();
      if (user) {
        const { data: profile } = await _supa.from('profiles').select('*').eq('id', user.id).single();
        if (profile) {
          window._dietProfile = profile;
          const prenom = profile.prenom || '';
          const nom = (profile.nom || '').toUpperCase();
          const rpps = profile.rpps || '—';
          if (headerEl) headerEl.textContent = 'Bonjour, ' + prenom + ' ' + nom + ' 👋';
          if (subEl) subEl.innerHTML = 'Diététicien certifié · RPPS ' + rpps + ' · <span style="color:var(--green);font-weight:500;">●</span> Actif';
          return;
        }
      }
    }
  } catch (e) {
    console.warn('loadDietProfile Supabase:', e);
  }

  // Fallback localStorage (mode démo / local)
  try {
    const stored = localStorage.getItem('nutridoc_dieteticien');
    if (stored) {
      const p = JSON.parse(stored);
      window._dietProfile = p;
      const prenom = p.prenom || '';
      const nom = (p.nom || '').toUpperCase();
      const rpps = p.rpps || '—';
      if (headerEl) headerEl.textContent = 'Bonjour, ' + prenom + ' ' + nom + ' 👋';
      if (subEl) subEl.innerHTML = 'Diététicien certifié · RPPS ' + rpps + ' · <span style="color:var(--green);font-weight:500;">●</span> Actif';
      return;
    }
  } catch (e) {
    console.warn('loadDietProfile localStorage:', e);
  }

  // Aucune donnée — rediriger vers login
  if (headerEl) headerEl.textContent = 'Bonjour 👋';
  if (subEl) subEl.textContent = 'Redirection vers la connexion…';
  if (window.location.protocol !== 'file:') {
    setTimeout(() => { window.location.href = 'login.html?role=dietitian'; }, 1500);
  } else {
    if (subEl) subEl.innerHTML = '<span style="color:var(--amber,#f97316);">⚠ Mode local — connectez-vous d\'abord via <a href="login.html?role=dietitian">login.html</a></span>';
  }
}

// ── Patients list ─────────────────────────────────────────────────────────
function renderPatients() {
  const alertes = JSON.parse(localStorage.getItem('nutridoc_alertes') || '[]');
  const nonLues = alertes.filter(a => !a.lu);
  const az = document.getElementById('alertesZone');
  
  if (az && nonLues.length > 0) {
    const RF = {
      grossesse: 'Grossesse',
      tca: 'TCA',
      diabete: 'Diabète',
      insuffisance_renale: 'Insuf. rénale',
      bariatrique: 'Bariatrique',
      allergies_severes: 'Allergies sévères',
      medicaments: 'Médicaments',
      antecedents: 'Antécédents lourds'
    };
    az.innerHTML = nonLues.map(a => `
      <div class="alert-alerte_sante" style="margin-bottom:.75rem;">
        <div class="alert-dot"></div>
        <div class="alert-alerte_sante-text">
          <span class="alert-alerte_sante-title">Alerte santé — ${a.patient}</span>
          ${a.flags.map(f => RF[f] || f).join(', ')}
        </div>
      </div>
    `).join('');
    alertes.forEach(a => a.lu = true);
    localStorage.setItem('nutridoc_alertes', JSON.stringify(alertes));
  }
  
  const patientsList = document.getElementById('patientsList');
  if (!patientsList) return;
  
  patientsList.innerHTML = PATIENTS_DEMO.map(p => {
    const t = totalsPlan(p.plan);
    return `
      <div class="patient-card">
        <div class="patient-info">
          <div class="avatar">${p.prenom[0]}${p.nom[0]}</div>
          <div>
            <p class="patient-name">${p.prenom} ${p.nom} — ${p.age} ans</p>
            <p class="patient-meta">${p.poids}kg · ${p.taille}cm · <strong>${t.kcal} kcal/j</strong> · P:${t.prot}g G:${t.glu}g L:${t.lip}g</p>
          </div>
        </div>
        <div class="patient-actions">
          <button class="btn-view" onclick="ouvrirEditeur('${p.id}')">✏ Modifier le plan</button>
          <button class="btn-validate" onclick="validerDirectement('${p.id}')">✓ Valider</button>
        </div>
      </div>
    `;
  }).join('');
}

// ── Éditeur de plan ───────────────────────────────────────────────────────
function ouvrirEditeur(id) {
  patientEnCours = PATIENTS_DEMO.find(p => p.id === id);
  planEnCours = JSON.parse(JSON.stringify(patientEnCours.plan));
  const editeurTitre = document.getElementById('editeurTitre');
  if (editeurTitre) editeurTitre.textContent = 'Plan de ' + patientEnCours.prenom + ' ' + patientEnCours.nom;
  renderEditeur();
  const modal = document.getElementById('modalEditeur');
  if (modal) modal.style.display = 'block';
}

function renderEditeur() {
  const body = document.getElementById('editeurBody');
  if (!body) return;
  
  const tot = totalsPlan(planEnCours);
  let html = `
    <div class="totaux-plan-bar">
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
    </div>
  `;

  for (const [repasKey, repasData] of Object.entries(REPAS_LABELS)) {
    const items = planEnCours[repasKey] || [];
    const totalK = totalKcalRepas(items);
    html += `
      <div class="editeur-repas-block">
        <div class="editeur-repas-header">
          <span>${repasData.icon} <strong>${repasData.label}</strong></span>
          <span class="editeur-kcal-total">${totalK} kcal</span>
        </div>
        <div class="editeur-items" id="items-${repasKey}">
    `;
    
    items.forEach((item, idx) => {
      const groupe = typeof detecterGroupe === 'function' ? detecterGroupe(item.aliment) : null;
      const grpData = groupe && CIQUAL[groupe] ? CIQUAL[groupe] : null;
      const kcal = kcalPour(item.aliment, item.qte);
      const macros = typeof getMacrosMicros === 'function' ? getMacrosMicros(item.aliment, item.qte) : null;
      
      html += `
        <div class="editeur-item" id="edititem-${repasKey}-${idx}">
          <input class="editeur-aliment-input" type="text" value="${(item.aliment || '').replace(/"/g, '&quot;')}"
            oninput="updateAliment('${repasKey}',${idx},this.value)" placeholder="Aliment" />
          <div class="groupe-picker">
            <button class="groupe-badge ${grpData ? '' : 'empty'}"
              style="${grpData ? 'background:' + grpData.color + '18;color:' + grpData.color + ';border-color:' + grpData.color + '40' : ''}"
              onclick="ouvrirCiqual('${groupe || ''}','${repasKey}',${idx})" title="Voir équivalents / changer groupe">
              ${grpData ? grpData.icon + ' ' + grpData.label : '⊕ Groupe'}
            </button>
          </div>
          <input class="editeur-qte-input" type="number" value="${item.qte}" min="1" step="1"
            oninput="updateQte('${repasKey}',${idx},this.value)" />
          <span class="editeur-unite">${item.unite || 'g'}</span>
          <span class="editeur-kcal-item">${kcal !== null ? kcal + ' kcal' : ''}</span>
          ${macros ? `<span class="editeur-macros-mini">P${macros.prot} G${macros.glu} L${macros.lip}</span>` : ''}
          <button class="editeur-del" onclick="supprimerItem('${repasKey}',${idx})">✕</button>
        </div>
      `;
    });
    
    html += `
        </div>
        <button class="editeur-add-btn" onclick="ajouterItem('${repasKey}')">+ Ajouter un aliment</button>
      </div>
    `;
  }
  body.innerHTML = html;
}

function updateAliment(repas, idx, val) {
  if (!planEnCours[repas] || !planEnCours[repas][idx]) return;
  planEnCours[repas][idx].aliment = val;
  updateItemDisplay(repas, idx);
  updateTotaux();
}

function updateQte(repas, idx, val) {
  if (!planEnCours[repas] || !planEnCours[repas][idx]) return;
  planEnCours[repas][idx].qte = parseFloat(val) || 0;
  updateItemDisplay(repas, idx);
  updateTotaux();
}

function updateItemDisplay(repas, idx) {
  const item = planEnCours[repas][idx];
  if (!item) return;
  const el = document.getElementById('edititem-' + repas + '-' + idx);
  if (!el) return;
  const kcal = kcalPour(item.aliment, item.qte);
  const macros = typeof getMacrosMicros === 'function' ? getMacrosMicros(item.aliment, item.qte) : null;
  const kcalEl = el.querySelector('.editeur-kcal-item');
  const macEl = el.querySelector('.editeur-macros-mini');
  if (kcalEl) kcalEl.textContent = kcal !== null ? kcal + ' kcal' : '';
  if (macEl && macros) macEl.textContent = 'P' + macros.prot + ' G' + macros.glu + ' L' + macros.lip;
}

function updateTotaux() {
  const tot = totalsPlan(planEnCours);
  const bar = document.querySelector('.totaux-plan-bar');
  if (!bar) return;
  const vals = bar.querySelectorAll('strong');
  if (vals[0]) vals[0].textContent = tot.kcal + ' kcal';
  if (vals[1]) vals[1].textContent = tot.prot + 'g';
  if (vals[2]) vals[2].textContent = tot.glu + 'g';
  if (vals[3]) vals[3].textContent = tot.lip + 'g';
  if (vals[4]) vals[4].textContent = tot.fib + 'g';
  
  const chips = document.querySelectorAll('.micro-chip');
  const microKeys = [
    ['fer', 'Fe', 'mg'], ['ca', 'Ca', 'mg'], ['vitC', 'Vit C', 'mg'],
    ['vitD', 'Vit D', 'µg'], ['b12', 'B12', 'µg'], ['mg', 'Mg', 'mg'],
    ['k', 'K', 'mg'], ['zn', 'Zn', 'mg']
  ];
  chips.forEach((c, i) => {
    if (c && microKeys[i]) {
      c.textContent = microKeys[i][1] + ' ' + tot[microKeys[i][0]] + microKeys[i][2];
    }
  });
}

function supprimerItem(repas, idx) {
  if (planEnCours[repas]) planEnCours[repas].splice(idx, 1);
  renderEditeur();
}

function ajouterItem(repas) {
  if (!planEnCours[repas]) planEnCours[repas] = [];
  planEnCours[repas].push({ aliment: '', qte: 100, unite: 'g' });
  renderEditeur();
  setTimeout(() => {
    const items = document.getElementById('items-' + repas);
    if (items) {
      const ins = items.querySelectorAll('.editeur-aliment-input');
      if (ins.length) ins[ins.length - 1].focus();
    }
  }, 50);
}

function fermerEditeur() {
  const modal = document.getElementById('modalEditeur');
  if (modal) modal.style.display = 'none';
}

function validerPlan() {
  if (!patientEnCours) return;
  patientEnCours.plan = planEnCours;
  patientEnCours.statut = 'valide';
  alert('Plan de ' + patientEnCours.prenom + ' validé et envoyé !');
  
  if (typeof Email !== 'undefined' && Email.planLivre) {
    const tot = totalsPlan(planEnCours);
    Email.planLivre(patientEnCours.email || '', {
      prenom: patientEnCours.prenom,
      diet_nom: window._dietProfile?.prenom + ' ' + window._dietProfile?.nom || 'Votre diét.',
      diet_rpps: '10 003 456 789',
      kcal: tot.kcal,
      proteines: tot.prot,
      visio_dispo: true
    });
  }
  fermerEditeur();
  renderPatients();
}

function validerDirectement(id) {
  const p = PATIENTS_DEMO.find(x => x.id === id);
  if (p) {
    p.statut = 'valide';
    alert('Plan de ' + p.prenom + ' validé !');
    renderPatients();
  }
}

// ── CIQUAL popup ─────────────────────────────────────────────────────────
function ouvrirCiqual(groupe, repas, idx) {
  champCiqual = { repas, idx };
  const currentGroupe = groupe || (typeof detecterGroupe === 'function' ? detecterGroupe(planEnCours[repas][idx].aliment) : '');
  renderCiqual(currentGroupe || (GROUPES_LIST.length > 0 ? GROUPES_LIST[0].key : 'feculents'));
  const modal = document.getElementById('modalCiqual');
  if (modal) modal.style.display = 'block';
}

function renderCiqual(groupeKey) {
  const grp = CIQUAL[groupeKey];
  if (!grp) return;
  
  const tabs = GROUPES_LIST.map(g => `
    <button class="ciqual-tab ${g.key === groupeKey ? 'active' : ''}"
      style="${g.key === groupeKey ? 'border-bottom:2px solid ' + g.color + ';color:' + g.color : 'color:var(--gray)'}"
      onclick="renderCiqual('${g.key}')">${g.icon} <span>${g.label}</span></button>
  `).join('');

  const tabsContainer = document.getElementById('ciqualTabs');
  const groupLabel = document.getElementById('ciqualGroupLabel');
  const body = document.getElementById('ciqualBody');
  
  if (tabsContainer) tabsContainer.innerHTML = tabs;
  if (groupLabel) groupLabel.innerHTML = grp.icon + ' ' + grp.label + ' <small style="color:var(--gray);font-weight:400;font-size:0.75rem;">— Table CIQUAL 2020 · cuit</small>';
  
  if (body) {
    body.innerHTML = `
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 1fr 1fr;gap:0;font-size:0.7rem;font-weight:500;color:var(--gray);padding:6px 12px;border-bottom:1px solid var(--border);background:#fafafa;">
        <span>Aliment</span><span style="text-align:right">kcal</span><span style="text-align:right">Prot.</span><span style="text-align:right">Glu.</span><span style="text-align:right">Lip.</span><span style="text-align:right">Fib.</span><span style="text-align:right">Équivalence</span>
      </div>
      ${grp.equivalents.map((eq, i) => {
        const refKcal = grp.reference.kcal;
        const equiv = Math.round(100 * refKcal / eq.kcal);
        return `
          <div class="ciqual-row2" onclick="choisirEquivalent('${groupeKey}',${i})">
            <div class="ciqual-aliment">${eq.aliment} ${eq.note ? '<span class="ciqual-note">(' + eq.note + ')</span>' : ''}</div>
            <div class="ciqual-cell kcal-cell">${eq.kcal}</div>
            <div class="ciqual-cell">${eq.prot}g</div>
            <div class="ciqual-cell">${eq.glu}g</div>
            <div class="ciqual-cell">${eq.lip}g</div>
            <div class="ciqual-cell">${eq.fib}g</div>
            <div class="ciqual-cell equiv-cell">≈ ${equiv}${eq.unite} = ${refKcal}kcal</div>
          </div>
        `;
      }).join('')}
      <div style="padding:8px 12px;font-size:0.68rem;color:var(--gray);border-top:1px solid var(--border);background:#fafafa;">
        Cliquez sur un aliment pour l'utiliser dans le plan · Source : CIQUAL 2020 — Anses
      </div>
    `;
  }
}

function choisirEquivalent(groupe, eqIdx) {
  if (!champCiqual) return;
  const eq = CIQUAL[groupe].equivalents[eqIdx];
  const { repas, idx } = champCiqual;
  if (planEnCours[repas] && planEnCours[repas][idx]) {
    planEnCours[repas][idx].aliment = eq.aliment;
    planEnCours[repas][idx].unite = eq.unite;
  }
  fermerCiqual();
  renderEditeur();
}

function fermerCiqual() {
  const modal = document.getElementById('modalCiqual');
  if (modal) modal.style.display = 'none';
  champCiqual = null;
}

// ── Initialisation ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  console.log('[dietitian.js] Initialisation...');
  console.log('[dietitian.js] CIQUAL chargé :', typeof CIQUAL !== 'undefined' ? Object.keys(CIQUAL).length + ' groupes' : 'NON');
  renderPatients();
  loadDietProfile();
});

// Exports globaux
window.ouvrirEditeur = ouvrirEditeur;
window.validerDirectement = validerDirectement;
window.validerPlan = validerPlan;
window.fermerEditeur = fermerEditeur;
window.ajouterItem = ajouterItem;
window.supprimerItem = supprimerItem;
window.updateAliment = updateAliment;
window.updateQte = updateQte;
window.ouvrirCiqual = ouvrirCiqual;
window.renderCiqual = renderCiqual;
window.choisirEquivalent = choisirEquivalent;
window.fermerCiqual = fermerCiqual;
window.kcalPour = kcalPour;
window.totalsPlan = totalsPlan;