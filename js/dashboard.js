const OBJECTIF_LABELS = {
  perte_poids: 'Perte de poids', prise_masse: 'Prise de masse',
  equilibre: 'Alimentation équilibrée', energie: 'Améliorer mon énergie', sante: 'Prévention santé'
};
const ACTIVITE_LABELS = {
  sedentaire: 'Sédentaire', leger: 'Légèrement actif', modere: 'Modérément actif', actif: 'Très actif'
};

// ── Recommandations GRATUITES ──────────────────────────────────────────────
function genererRecos(bilan) {
  const objectif = bilan.objectif || 'equilibre';
  const regime   = bilan.regime  || '';

  const menus = {
    perte_poids: [
      { jour: 'Lundi',    repas: 'Salade de lentilles, poulet grillé, yaourt nature' },
      { jour: 'Mardi',    repas: 'Soupe de légumes, œufs pochés, fruit frais' },
      { jour: 'Mercredi', repas: 'Quinoa aux légumes, fromage blanc, amandes' }
    ],
    prise_masse: [
      { jour: 'Lundi',    repas: 'Riz complet, steak haché, avocat, laitage' },
      { jour: 'Mardi',    repas: 'Pâtes complètes, saumon, brocolis, pain complet' },
      { jour: 'Mercredi', repas: 'Patate douce, poulet, haricots rouges, banane' }
    ],
    equilibre: [
      { jour: 'Lundi',    repas: 'Poisson vapeur, riz basmati, haricots verts' },
      { jour: 'Mardi',    repas: 'Tarte aux légumes, salade verte, fruit de saison' },
      { jour: 'Mercredi', repas: 'Lentilles corail, pain complet, yaourt' }
    ],
    energie: [
      { jour: 'Lundi',    repas: 'Flocons d\'avoine, fruits rouges, œuf dur' },
      { jour: 'Mardi',    repas: 'Salade niçoise, pain complet, compote' },
      { jour: 'Mercredi', repas: 'Wok de légumes, nouilles soba, tofu' }
    ],
    sante: [
      { jour: 'Lundi',    repas: 'Sardines, salade de mâche, pain de seigle' },
      { jour: 'Mardi',    repas: 'Curry de légumineuses, riz complet, kiwi' },
      { jour: 'Mercredi', repas: 'Soupe miso, poisson blanc, légumes vapeur' }
    ]
  };
  const conseils = {
    perte_poids: ['Privilégiez les protéines maigres à chaque repas','Buvez 1,5 à 2L d\'eau par jour','Évitez les sucres rapides après 17h'],
    prise_masse: ['Apports en protéines : 1,6 g/kg/jour','Ne sautez jamais le petit-déjeuner','Collation post-entraînement : protéines + glucides'],
    equilibre:   ['Variez les couleurs dans votre assiette','Mangez en pleine conscience, sans écran','5 fruits et légumes par jour minimum'],
    energie:     ['Petit-déjeuner riche en glucides complexes','Collation de 16h pour éviter le coup de fatigue','Limitez la caféine après 14h'],
    sante:       ['Favorisez les oméga-3 (poissons gras, noix)','Réduisez les aliments ultra-transformés','Incluez des fibres à chaque repas']
  };

  const recos = [
    { type: 'menus',   titre: 'Menus proposés cette semaine',  items: menus[objectif]   || menus.equilibre },
    { type: 'conseils',titre: 'Conseils personnalisés',        items: (conseils[objectif] || conseils.equilibre).map(t => ({ texte: t })) }
  ];
  if (regime === 'vegetarien' || regime === 'vegan') {
    recos.push({ type: 'info', titre: 'Attention aux carences fréquentes', items: [
      { texte: 'Vitamine B12 : pensez à la supplémentation' },
      { texte: 'Fer non héminique : associez avec de la vitamine C' },
      { texte: 'Protéines complètes : combinez légumineuses + céréales' }
    ]});
  }
  return recos;
}

function afficherRecos(recos) {
  const grid = document.getElementById('recoGrid');
  if (!grid) return;
  grid.innerHTML = recos.map(reco => {
    const isMenu = reco.type === 'menus';
    const isInfo = reco.type === 'info';
    const items = reco.items.map(item => isMenu
      ? '<li><span class="jour-label">' + item.jour + '</span><span class="repas-text">' + item.repas + '</span></li>'
      : '<li><span class="ok">✓</span>' + item.texte + '</li>'
    ).join('');
    return '<div class="reco-card' + (isInfo ? ' reco-info' : '') + '"><h4>' + reco.titre + '</h4><ul class="reco-list">' + items + '</ul></div>';
  }).join('');
}

// ── Plan PAYANT avec grammages ─────────────────────────────────────────────
function genererPlan(bilan) {
  const objectif = bilan.objectif || 'equilibre';
  const regime   = bilan.regime   || '';
  const poids    = parseFloat(bilan.poids)   || 70;
  const taille   = parseFloat(bilan.taille)  || 170;
  const activite = bilan.activite || 'modere';
  const sexe     = bilan.sexe     || 'autre';

  // Besoins caloriques estimés (Mifflin-St Jeor)
  let bmr = sexe === 'homme'
    ? 10 * poids + 6.25 * taille - 5 * 30 + 5
    : 10 * poids + 6.25 * taille - 5 * 30 - 161;
  const coeff = { sedentaire: 1.2, leger: 1.375, modere: 1.55, actif: 1.725 };
  let tdee = Math.round(bmr * (coeff[activite] || 1.55));
  if (objectif === 'perte_poids') tdee = Math.round(tdee * 0.85);
  if (objectif === 'prise_masse') tdee = Math.round(tdee * 1.1);

  // Repas selon objectif & régime
  const vegan = regime === 'vegan';
  const vege  = regime === 'vegetarien' || vegan;

  const plans = {
    prise_masse: {
      petitDej: [
        { aliment: vege ? 'Flocons d\'avoine' : 'Pain de mie complet', qte: 120, unite: 'g' },
        { aliment: vege ? 'Lait de soja' : 'Lait demi-écrémé UHT', qte: 200, unite: 'ml' },
        { aliment: vege ? 'Beurre d\'amande' : 'Beurre à 82% MG, doux', qte: 20, unite: 'g' },
        { aliment: 'Fromage blanc nature 3% MG', qte: 150, unite: 'g' },
        { aliment: 'Compote de fruits sans sucres ajoutés', qte: 100, unite: 'g' }
      ],
      collation: [
        { aliment: 'Pain de mie complet', qte: 80, unite: 'g', note: '209 kcal' },
        { aliment: vege ? 'Lait de soja' : 'Lait demi-écrémé UHT', qte: 200, unite: 'ml' },
        { aliment: 'Beurre de cacahuète ou pâte d\'arachide', qte: 20, unite: 'g' },
        { aliment: 'Compote de fruits', qte: 100, unite: 'g' },
        { aliment: 'Sirop d\'agave', qte: 8, unite: 'g' }
      ],
      ideesDejeuner: [
        {
          label: 'Option A — Volaille & féculents',
          aliments: [
            { aliment: vege ? 'Tofu ferme' : 'Volaille cuite (aliment moyen)', qte: 150, unite: 'g', note: '249 kcal' },
            { aliment: 'Pomme de terre ou équivalent', qte: 400, unite: 'g' },
            { aliment: 'Légume cuit (aliment moyen)', qte: 100, unite: 'g' },
            { aliment: 'Fromage (aliment moyen)', qte: 30, unite: 'g' },
            { aliment: 'Huile de colza', qte: 15, unite: 'g' },
            { aliment: 'Fruit cru (aliment moyen)', qte: 150, unite: 'g' }
          ]
        },
        {
          label: 'Option B — Poisson & riz',
          aliments: [
            { aliment: vege ? 'Lentilles cuites' : 'Saumon ou poisson gras', qte: 150, unite: 'g' },
            { aliment: 'Riz complet cuit', qte: 200, unite: 'g' },
            { aliment: 'Brocolis ou légumes verts', qte: 150, unite: 'g' },
            { aliment: 'Huile d\'olive', qte: 10, unite: 'ml' },
            { aliment: 'Fruit de saison', qte: 150, unite: 'g' }
          ]
        }
      ],
      ideesDiner: [
        {
          label: 'Option A — Protéines & légumes',
          aliments: [
            { aliment: vege ? 'Tofu soyeux' : 'Volaille cuite', qte: 100, unite: 'g', note: '166 kcal' },
            { aliment: 'Pomme de terre', qte: 400, unite: 'g' },
            { aliment: 'Légume cuit', qte: 100, unite: 'g' },
            { aliment: 'Huile', qte: 15, unite: 'g' },
            { aliment: 'Compote', qte: 100, unite: 'g' }
          ]
        },
        {
          label: 'Option B — Œufs & féculents',
          aliments: [
            { aliment: vegan ? 'Pois chiches cuits' : 'Œufs entiers', qte: vegan ? 150 : 150, unite: 'g', note: vegan ? '' : '3 œufs' },
            { aliment: 'Pâtes complètes cuites', qte: 200, unite: 'g' },
            { aliment: 'Courgettes ou légumes doux', qte: 150, unite: 'g' },
            { aliment: 'Huile d\'olive', qte: 10, unite: 'ml' }
          ]
        }
      ]
    },
    perte_poids: {
      petitDej: [
        { aliment: 'Flocons d\'avoine', qte: 50, unite: 'g' },
        { aliment: vege ? 'Lait végétal non sucré' : 'Lait demi-écrémé', qte: 150, unite: 'ml' },
        { aliment: 'Fruits rouges (frais ou surgelés)', qte: 100, unite: 'g' },
        { aliment: vegan ? 'Yaourt soja nature' : 'Yaourt nature 0%', qte: 125, unite: 'g' }
      ],
      collation: [
        { aliment: 'Amandes ou noix', qte: 20, unite: 'g' },
        { aliment: 'Fruit frais de saison', qte: 120, unite: 'g' }
      ],
      ideesDejeuner: [
        {
          label: 'Option A — Salade protéinée',
          aliments: [
            { aliment: vege ? 'Œufs durs' : 'Blanc de poulet grillé', qte: 120, unite: 'g' },
            { aliment: 'Salade verte (mâche, roquette)', qte: 100, unite: 'g' },
            { aliment: 'Tomates cerises', qte: 100, unite: 'g' },
            { aliment: 'Concombre', qte: 80, unite: 'g' },
            { aliment: 'Huile d\'olive', qte: 10, unite: 'ml' },
            { aliment: 'Pain de seigle', qte: 40, unite: 'g' }
          ]
        },
        {
          label: 'Option B — Légumineuses & légumes',
          aliments: [
            { aliment: 'Lentilles vertes cuites', qte: 150, unite: 'g' },
            { aliment: 'Carottes rapées', qte: 100, unite: 'g' },
            { aliment: 'Épinards frais', qte: 80, unite: 'g' },
            { aliment: 'Fromage blanc 0%', qte: 100, unite: 'g' },
            { aliment: 'Huile de colza', qte: 8, unite: 'ml' }
          ]
        }
      ],
      ideesDiner: [
        {
          label: 'Option A — Poisson vapeur',
          aliments: [
            { aliment: vege ? 'Tofu fumé' : 'Poisson blanc vapeur', qte: 130, unite: 'g' },
            { aliment: 'Haricots verts', qte: 200, unite: 'g' },
            { aliment: 'Pomme de terre vapeur', qte: 150, unite: 'g' },
            { aliment: 'Huile d\'olive', qte: 8, unite: 'ml' }
          ]
        },
        {
          label: 'Option B — Soupe & protéines',
          aliments: [
            { aliment: 'Soupe de légumes maison', qte: 300, unite: 'ml' },
            { aliment: vegan ? 'Pois chiches cuits' : 'Fromage blanc 0%', qte: 150, unite: 'g' },
            { aliment: 'Pain complet', qte: 30, unite: 'g' }
          ]
        }
      ]
    }
  };

  // Objectifs non spécifiés → utilise perte_poids comme base équilibre
  const planData = plans[objectif] || plans.perte_poids;

  return { planData, tdee, objectif, prenom: bilan.prenom || '' };
}

function renderMealBlock(icon, titre, aliments, cssClass) {
  const rows = aliments.map(a =>
    '<li>' +
      '<span class="aliment-name">' + a.aliment + '</span>' +
      '<span class="aliment-qte">' + a.qte + a.unite + (a.note ? ' <span class="aliment-note">— ' + a.note + '</span>' : '') + '</span>' +
    '</li>'
  ).join('');
  return '<div class="meal-block ' + (cssClass||'') + '"><div class="meal-block-header"><span class="meal-icon">' + icon + '</span><strong>' + titre + '</strong></div><ul class="meal-items">' + rows + '</ul></div>';
}

function renderIdeesRepas(titre, idees) {
  const opts = idees.map(opt =>
    '<div class="repas-option"><div class="repas-option-label">' + opt.label + '</div>' +
    opt.aliments.map(a =>
      '<div class="aliment-row"><span class="aliment-name">' + a.aliment + '</span><span class="aliment-qte">' + a.qte + a.unite + (a.note ? ' <span class="aliment-note">— ' + a.note + '</span>' : '') + '</span></div>'
    ).join('') + '</div>'
  ).join('');
  return '<div class="repas-ideas-section"><div class="repas-ideas-title">' + titre + '</div>' + opts + '</div>';
}

function afficherPlanDebloque(bilan) {
  document.getElementById('planLocked').classList.add('hidden');
  document.getElementById('planPending').classList.add('hidden');
  document.getElementById('planUnlocked').classList.remove('hidden');

  const { planData, tdee, objectif, prenom } = genererPlan(bilan);

  const content = document.getElementById('planContent');
  content.innerHTML =
    '<div class="plan-header-info">' +
      '<div class="plan-patient">' + (prenom ? 'Plan de ' + prenom : 'Votre plan') + ' — ' + (OBJECTIF_LABELS[objectif] || objectif) + '</div>' +
      '<div class="plan-kcal-total">Apport journalier estimé : <strong>' + tdee + ' kcal</strong></div>' +
    '</div>' +
    renderMealBlock('🍳', 'Petit déjeuner', planData.petitDej) +
    renderIdeesRepas('Idées déjeuner (à alterner)', planData.ideesDejeuner) +
    renderMealBlock('🍎', 'Collation 16h', planData.collation) +
    renderIdeesRepas('Idées dîner (à alterner)', planData.ideesDiner) +
    '<p class="plan-note">Les grammages sont exprimés en poids cuit sauf mention contraire. Ce plan a été validé et signé par votre diététicien.</p>';
}

// ── Paiement simulé ────────────────────────────────────────────────────────
function simulerPaiement() {
  document.getElementById('modalOverlay').classList.remove('hidden');
}
function fermerModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
}
function confirmerPaiement() {
  const btn = document.getElementById('btnConfirm');
  btn.textContent = 'Traitement…';
  btn.disabled = true;
  setTimeout(() => {
    fermerModal();
    const bilan = JSON.parse(localStorage.getItem('nutridoc_bilan') || '{}');
    bilan.paiement = 'confirme';
    bilan.statut   = 'attente_validation';
    localStorage.setItem('nutridoc_bilan', JSON.stringify(bilan));
    document.getElementById('planLocked').classList.add('hidden');
    document.getElementById('planPending').classList.remove('hidden');
    setTimeout(() => simulerValidation(bilan), 3000);
  }, 1800);
}
function simulerValidation(bilan) {
  bilan.statut = 'valide';
  localStorage.setItem('nutridoc_bilan', JSON.stringify(bilan));
  afficherPlanDebloque(bilan);
}

// ── Init ───────────────────────────────────────────────────────────────────

// ── Init avec Supabase ou localStorage ───────────────────────
async function initDashboard() {
  let bilan;
  if (typeof MODE_SUPA !== 'undefined' && MODE_SUPA) {
    bilan = await getBilan();
    if (!bilan) { window.location.href = 'login.html'; return; }
  } else {
    bilan = JSON.parse(localStorage.getItem('nutridoc_bilan') || '{}');
  }
  initWithBilan(bilan);
}

function initWithBilan(bilan) {
  // bilan passé en paramètre

  if (bilan.prenom) {
    document.getElementById('greetingName').textContent = 'Bonjour ' + bilan.prenom + ' \uD83D\uDC4B';
    document.getElementById('userTag').textContent = bilan.prenom;
  }

  if (bilan.objectif) document.getElementById('infoObjectif').textContent = OBJECTIF_LABELS[bilan.objectif] || bilan.objectif;
  if (bilan.activite) document.getElementById('infoActivite').textContent = ACTIVITE_LABELS[bilan.activite] || bilan.activite;
  document.getElementById('infoRegime').textContent = bilan.regime || 'Aucune restriction';
  if (bilan.poids && bilan.taille) {
    const h = bilan.taille / 100;
    document.getElementById('infoImc').textContent = (bilan.poids / (h * h)).toFixed(1);
  }

  const statut = bilan.statut || 'nouveau';
  const dot = document.getElementById('statusDot');
  const val = document.getElementById('statusValue');
  const eta = document.getElementById('statusEta');

  if (statut === 'redflag') {
    dot.style.background = '#f97316';
    val.textContent = 'Dossier transmis à un diététicien spécialisé';
    eta.textContent = '';
  } else if (statut === 'valide') {
    dot.className = 'status-dot validated';
    val.textContent = 'Plan complet validé et disponible';
    eta.textContent = '✓';
  } else {
    dot.className = 'status-dot pending';
    val.textContent = 'Recommandations disponibles';
    eta.textContent = 'Gratuit';
  }

  afficherRecos(genererRecos(bilan));

  if (statut === 'valide') afficherPlanDebloque(bilan);
  else if (bilan.paiement === 'confirme') {
    document.getElementById('planLocked').classList.add('hidden');
    document.getElementById('planPending').classList.remove('hidden');
  }
});

// ── Chat patient ──────────────────────────────────────────────────────────────
function activerChat() {
  const bilan = JSON.parse(localStorage.getItem('nutridoc_bilan') || '{}');
  // Simulation paiement instantané
  bilan.chatActif = true;
  localStorage.setItem('nutridoc_bilan', JSON.stringify(bilan));
  document.getElementById('chatLocked').classList.add('hidden');
  document.getElementById('chatUnlocked').classList.remove('hidden');
  // Afficher nom du diét si disponible
  const profil = JSON.parse(localStorage.getItem('nutridoc_dieteticien') || '{}');
  if (profil.prenom) {
    document.getElementById('chatDietName').textContent = profil.prenom + ' ' + (profil.nom || '').toUpperCase();
  }
}

function patientSendMsg() {
  const inp = document.getElementById('patientChatInput');
  const texte = inp.value.trim();
  if (!texte) return;
  const box = document.getElementById('patientChatMessages');
  const heure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const div = document.createElement('div');
  div.className = 'chat-msg patient';
  div.innerHTML = '<div class="chat-bubble">' + texte + '</div><div class="chat-msg-time">' + heure + '</div>';
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  inp.value = '';
  // Réponse automatique simulée
  setTimeout(() => {
    const rep = document.createElement('div');
    rep.className = 'chat-msg diet';
    rep.innerHTML = '<div class="chat-bubble">Merci pour votre message, je vous réponds dans les plus brefs délais !</div><div class="chat-msg-time">' + heure + '</div>';
    box.appendChild(rep);
    box.scrollTop = box.scrollHeight;
  }, 1200);
}

// Restaurer état chat si déjà activé

// ── Init avec Supabase ou localStorage ───────────────────────
async function initDashboard() {
  let bilan;
  if (typeof MODE_SUPA !== 'undefined' && MODE_SUPA) {
    bilan = await getBilan();
    if (!bilan) { window.location.href = 'login.html'; return; }
  } else {
    bilan = JSON.parse(localStorage.getItem('nutridoc_bilan') || '{}');
  }
  initWithBilan(bilan);
}

function initWithBilan(bilan) {
  // bilan passé en paramètre
  if (bilan.chatActif) {
    document.getElementById('chatLocked')?.classList.add('hidden');
    document.getElementById('chatUnlocked')?.classList.remove('hidden');
  }
}, true);


document.addEventListener('DOMContentLoaded', initDashboard);
