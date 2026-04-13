/**
 * pdf-plan.js — NutriDoc
 * Génération PDF du plan alimentaire validé via jsPDF
 * Chargé via CDN — ne nécessite pas de build
 *
 * Usage :
 *   genererPDF(patient, plan, dietitian, options)
 *   ou depuis un bouton : onclick="genererPDF(patientEnCours, planEnCours, dietInfo)"
 * 
 * Dépendances : 
 *   - ciqual-data.js (pour kcalPour, getMacrosMicros si disponibles)
 *   - constants.js (optionnel)
 */

const PDF_CONFIG = {
  colors: {
    dark:       [13,  32,  24],
    green:      [29,  158, 117],
    green_light:[225, 245, 238],
    green2:     [15,  110, 86],
    gray:       [107, 123, 116],
    gray_light: [245, 248, 245],
    white:      [255, 255, 255],
    border:     [229, 231, 235],
    amber:      [245, 158, 11],
    blue:       [59,  130, 246],
    purple:     [107, 70, 193]
  },
  repas: {
    petitDej: { label: 'Petit déjeuner', icon: '🍳', color: [245, 158, 11], order: 1 },
    dejeuner: { label: 'Déjeuner',       icon: '🥗', color: [29,  158, 117], order: 2 },
    collation:{ label: 'Collation',      icon: '🍎', color: [59,  130, 246], order: 3 },
    diner:    { label: 'Dîner',          icon: '🍽️', color: [107, 70, 193], order: 4 }
  }
};

// ── Fonctions internes de calcul (fallback si ciqual-data.js absent) ──
function _kcalPourFallback(aliment, qte) {
  // Fallback basé sur des valeurs approximatives
  const caloriesPar100g = {
    'flocons d\'avoine': 372, 'lait demi-écrémé': 46, 'compote sans sucre': 48,
    'lentilles cuites': 116, 'carottes cuites': 35, 'yaourt nature': 65,
    'huile d\'olive': 884, 'pomme': 52, 'amandes': 579, 'tofu ferme': 144,
    'haricots verts cuits': 30, 'riz blanc cuit': 130, 'huile de colza': 884,
    'blanc de poulet cuit': 165, 'brocolis cuits': 34, 'yaourt grec nature': 115,
    'saumon cuit': 196, 'pomme de terre vapeur': 70, 'banane': 89,
    'beurre de cacahuète': 598, 'œufs entiers': 155, 'pain complet': 224,
    'fromage blanc 0%': 45, 'amande': 579, 'épinard cuit': 23
  };
  const n = aliment.toLowerCase();
  for (const [key, kcal] of Object.entries(caloriesPar100g)) {
    if (n.includes(key)) return Math.round(kcal * qte / 100);
  }
  return Math.round(150 * qte / 100); // valeur par défaut
}

function _getMacrosMicrosFallback(aliment, qte) {
  // Fallback minimal
  return {
    prot: 0, glu: 0, lip: 0, fib: 0,
    fer: 0, ca: 0, vitC: 0, vitD: 0, b12: 0, mg: 0, k: 0, zn: 0
  };
}

// ── Utilisation des fonctions globales si disponibles ──
function _kcalPour(aliment, qte) {
  if (typeof window.kcalPour === 'function') {
    return window.kcalPour(aliment, qte);
  }
  return _kcalPourFallback(aliment, qte);
}

function _getMacrosMicros(aliment, qte) {
  if (typeof window.getMacrosMicros === 'function') {
    return window.getMacrosMicros(aliment, qte);
  }
  return _getMacrosMicrosFallback(aliment, qte);
}

function _totalsPlan(plan) {
  // Si la fonction globale existe, l'utiliser
  if (typeof window.totalsPlan === 'function') {
    return window.totalsPlan(plan);
  }
  
  // Sinon, calcul manuel
  if (!plan) {
    return { kcal: 0, prot: 0, glu: 0, lip: 0, fib: 0, fer: 0, ca: 0, vitC: 0, vitD: 0, b12: 0, mg: 0, k: 0, zn: 0 };
  }
  
  const tot = { kcal: 0, prot: 0, glu: 0, lip: 0, fib: 0, fer: 0, ca: 0, vitC: 0, vitD: 0, b12: 0, mg: 0, k: 0, zn: 0 };
  
  for (const repas of Object.values(plan)) {
    if (!repas || !Array.isArray(repas)) continue;
    for (const item of repas) {
      const kcal = _kcalPour(item.aliment, item.qte);
      if (kcal) tot.kcal += kcal;
      
      const macros = _getMacrosMicros(item.aliment, item.qte);
      if (macros) {
        tot.prot += macros.prot || 0;
        tot.glu += macros.glu || 0;
        tot.lip += macros.lip || 0;
        tot.fib += macros.fib || 0;
        tot.fer += macros.fer || 0;
        tot.ca += macros.ca || 0;
        tot.vitC += macros.vitC || 0;
        tot.vitD += macros.vitD || 0;
        tot.b12 += macros.b12 || 0;
        tot.mg += macros.mg || 0;
        tot.k += macros.k || 0;
        tot.zn += macros.zn || 0;
      }
    }
  }
  
  // Arrondis
  tot.kcal = Math.round(tot.kcal);
  tot.prot = Math.round(tot.prot * 10) / 10;
  tot.glu = Math.round(tot.glu * 10) / 10;
  tot.lip = Math.round(tot.lip * 10) / 10;
  tot.fib = Math.round(tot.fib * 10) / 10;
  
  return tot;
}

// ── Charger jsPDF si nécessaire ──────────────────────────────
async function loadJsPDF() {
  if (window.jspdf) return window.jspdf.jsPDF;
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload  = () => resolve(window.jspdf.jsPDF);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ── Données démo si non fournies ─────────────────────────────
function getDemoData() {
  return {
    patient: {
      prenom: 'Marie', nom: 'Dupont', age: 34,
      poids: 65, taille: 168, objectif: 'Perte de poids',
      ville: 'Angoulême', regime: 'Aucun',
      activite: 'modere', sexe: 'femme',
      email: 'marie.d@mail.fr'
    },
    plan: {
      petitDej: [
        { aliment: 'Flocons d\'avoine', qte: 60, unite: 'g', note: 'avec eau chaude' },
        { aliment: 'Blanc d\'œuf cuit', qte: 120, unite: 'g', note: '4 blancs' },
        { aliment: 'Fraise', qte: 150, unite: 'g', note: 'fraîches' }
      ],
      dejeuner: [
        { aliment: 'Blanc de poulet cuit', qte: 150, unite: 'g', note: 'grillé sans matière grasse' },
        { aliment: 'Riz blanc cuit', qte: 150, unite: 'g', note: 'pesé cuit' },
        { aliment: 'Brocolis cuits', qte: 200, unite: 'g', note: 'à la vapeur' },
        { aliment: 'Huile d\'olive', qte: 10, unite: 'ml', note: 'assaisonnement' }
      ],
      collation: [
        { aliment: 'Yaourt nature 0%', qte: 125, unite: 'g', note: '' },
        { aliment: 'Amandes', qte: 20, unite: 'g', note: 'une petite poignée' }
      ],
      diner: [
        { aliment: 'Saumon cuit', qte: 130, unite: 'g', note: 'à la vapeur ou four' },
        { aliment: 'Lentilles cuites', qte: 150, unite: 'g', note: 'pesées cuites' },
        { aliment: 'Épinards cuits', qte: 150, unite: 'g', note: 'sauté à l\'ail' }
      ]
    },
    dietitian: {
      nom: 'Dr. A. Lemaire', rpps: '10 003 456 789',
      titre: 'Diététicien-Nutritionniste',
      email: 'lemaire@nutridoc.fr', tel: '05 45 XX XX XX',
      cabinet: 'Cabinet NutriDoc Angoulême'
    },
    options: { semaines: 4 }
  };
}

// ── GÉNÉRATEUR PRINCIPAL ──────────────────────────────────────
async function genererPDF(patient, plan, dietitian, options = {}) {
  const btn = document.getElementById('btnGenPDF');
  if (btn) { btn.disabled = true; btn.textContent = 'Génération…'; }

  try {
    const JsPDF = await loadJsPDF();
    const doc   = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Données de secours
    if (!patient) patient = getDemoData().patient;
    if (!plan) plan = getDemoData().plan;
    if (!dietitian) dietitian = getDemoData().dietitian;

    const W  = doc.internal.pageSize.getWidth();   // 210mm
    const H  = doc.internal.pageSize.getHeight();  // 297mm
    const mg = 15;  // marge
    const cw = W - mg * 2;  // largeur contenu

    let page = 1;

    // ── Helpers ──────────────────────────────────────────────
    const setFont = (size, style = 'normal', color = PDF_CONFIG.colors.dark) => {
      doc.setFontSize(size);
      doc.setFont('helvetica', style);
      doc.setTextColor(...color);
    };
    const fillRect = (x, y, w, h, color, radius = 0) => {
      doc.setFillColor(...color);
      if (radius) doc.roundedRect(x, y, w, h, radius, radius, 'F');
      else doc.rect(x, y, w, h, 'F');
    };
    const strokeRect = (x, y, w, h, color, lw = 0.3) => {
      doc.setDrawColor(...color);
      doc.setLineWidth(lw);
      doc.rect(x, y, w, h, 'S');
    };
    const addPageIfNeeded = (y, needed = 30) => {
      if (y + needed > H - 20) {
        doc.addPage();
        page++;
        drawPageFooter(doc, W, H, mg, page, patient, dietitian);
        return mg + 10;
      }
      return y;
    };

    // ── PAGE 1 — COUVERTURE ───────────────────────────────────
    drawCover(doc, W, H, mg, cw, patient, dietitian, options, setFont, fillRect);
    drawPageFooter(doc, W, H, mg, page, patient, dietitian);

    // ── PAGE 2 — RÉCAPITULATIF NUTRITIONNEL ──────────────────
    doc.addPage(); page++;
    let y = drawPageHeader(doc, W, mg, setFont, fillRect, 'Profil & objectifs nutritionnels');
    y = drawProfilSection(doc, y, mg, cw, patient, plan, setFont, fillRect, strokeRect);
    drawPageFooter(doc, W, H, mg, page, patient, dietitian);

    // ── PAGE 3+ — PLAN SEMAINE TYPE ───────────────────────────
    doc.addPage(); page++;
    y = drawPageHeader(doc, W, mg, setFont, fillRect, 'Plan alimentaire — Semaine type');

    const repasOrder = ['petitDej', 'dejeuner', 'collation', 'diner'];
    for (const repasKey of repasOrder) {
      const items = plan[repasKey] || [];
      if (!items.length) continue;
      y = addPageIfNeeded(y, 50);
      y = drawRepasBlock(doc, y, mg, cw, repasKey, items, setFont, fillRect, strokeRect, addPageIfNeeded);
      y += 5;
    }

    // ── PAGE CONSEILS ─────────────────────────────────────────
    y = addPageIfNeeded(y, 80);
    if (y < mg + 15) {
      y = drawPageHeader(doc, W, mg, setFont, fillRect, 'Conseils & recommandations');
    }
    y = drawConseilsSection(doc, y, mg, cw, patient, setFont, fillRect, strokeRect);

    // ── PAGE SIGNATURE ────────────────────────────────────────
    doc.addPage(); page++;
    drawPageHeader(doc, W, mg, setFont, fillRect, 'Validation & signature');
    drawSignaturePage(doc, W, H, mg, cw, patient, dietitian, setFont, fillRect, strokeRect);
    drawPageFooter(doc, W, H, mg, page, patient, dietitian);

    // ── Sauvegarder ──────────────────────────────────────────
    const safeName = (patient.prenom || 'patient').replace(/[^a-z0-9]/gi, '_');
    const fname = `NutriDoc_Plan_${safeName}_${new Date().toISOString().slice(0,10)}.pdf`;
    doc.save(fname);

    if (btn) { btn.disabled = false; btn.textContent = '⬇ Télécharger PDF'; }
    if (typeof window.showToast === 'function') window.showToast('PDF généré avec succès ✓');
    else console.log('[PDF] Généré avec succès');
    return true;

  } catch (err) {
    console.error('[PDF] Erreur :', err);
    if (btn) { btn.disabled = false; btn.textContent = '⬇ Télécharger PDF'; }
    alert('Erreur lors de la génération du PDF : ' + err.message);
    return false;
  }
}

// ── COUVERTURE ───────────────────────────────────────────────
function drawCover(doc, W, H, mg, cw, patient, dietitian, options, setFont, fillRect) {
  // Fond sombre
  fillRect(0, 0, W, H * 0.55, PDF_CONFIG.colors.dark);

  // Bande verte décorative
  fillRect(0, H * 0.55, W, 4, PDF_CONFIG.colors.green);

  // Filigrane CONFIDENTIEL (diagonal)
  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity: 0.06 }));
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(52);
  doc.setFont('helvetica', 'bold');
  doc.text('CONFIDENTIEL', W / 2, H * 0.3, { align: 'center', angle: 45 });
  doc.restoreGraphicsState();

  // Logo NutriDoc
  setFont(28, 'bold', PDF_CONFIG.colors.white);
  doc.text('Nutri', mg, 28);
  setFont(28, 'bolditalic', PDF_CONFIG.colors.green);
  doc.text('Doc', mg + 28, 28);

  // Sous-titre
  setFont(9, 'normal', [93, 202, 165]);
  doc.text('Plateforme nutritionnelle certifiée · CaliDoc Santé', mg, 35);

  // Séparateur
  doc.setDrawColor(...PDF_CONFIG.colors.green);
  doc.setLineWidth(0.3);
  doc.line(mg, 40, W - mg, 40);

  // Titre principal
  setFont(22, 'bold', PDF_CONFIG.colors.white);
  doc.text('PLAN ALIMENTAIRE', mg, 60);
  setFont(22, 'bold', [93, 202, 165]);
  doc.text('PERSONNALISÉ', mg, 72);

  // Info patient
  setFont(11, 'normal', PDF_CONFIG.colors.white);
  doc.text(`${patient.prenom || ''} ${patient.nom || ''}`.trim() || 'Patient', mg, 90);
  setFont(9, 'normal', [150, 170, 160]);
  doc.text(`${patient.age || '—'} ans · ${patient.poids || '—'} kg · ${patient.taille || '—'} cm · ${patient.ville || '—'}`, mg, 98);
  doc.text(`Objectif : ${patient.objectif || '—'}`, mg, 106);

  // Date de création
  setFont(8, 'normal', [100, 130, 115]);
  doc.text(`Plan généré le ${new Date().toLocaleDateString('fr-FR')}`, mg, 114);

  // Badge certifié
  fillRect(W - mg - 55, 54, 55, 22, PDF_CONFIG.colors.green, 3);
  setFont(7, 'bold', PDF_CONFIG.colors.white);
  doc.text('✓ VALIDÉ PAR', W - mg - 27, 62, { align: 'center' });
  setFont(7, 'normal', PDF_CONFIG.colors.white);
  doc.text('Diét. certifié RPPS', W - mg - 27, 68, { align: 'center' });
  doc.text(dietitian.nom || 'Diététicien', W - mg - 27, 74, { align: 'center' });

  // Zone blanche — récapitulatif
  const zy = H * 0.55 + 8;
  setFont(12, 'bold', PDF_CONFIG.colors.dark);
  doc.text('Informations du plan', mg, zy + 8);

  const infos = [
    ['Durée du plan', `${options.semaines || 4} semaines`],
    ['Régime', patient.regime || 'Standard'],
    ['Activité physique', patient.activite || '—'],
    ['Email patient', patient.email || '—'],
    ['Diététicien', dietitian.nom || '—'],
    ['N° RPPS', dietitian.rpps || '—'],
    ['Cabinet', dietitian.cabinet || 'NutriDoc'],
    ['Contact diét.', dietitian.email || '—']
  ];

  let iy = zy + 16;
  infos.forEach(([label, val], i) => {
    if (i % 2 === 0) doc.setFillColor(248, 251, 249);
    else doc.setFillColor(255, 255, 255);
    doc.rect(mg, iy - 5, cw, 8, 'F');
    setFont(8, 'bold', PDF_CONFIG.colors.gray);
    doc.text(label, mg + 2, iy);
    setFont(8, 'normal', PDF_CONFIG.colors.dark);
    doc.text(String(val), mg + 60, iy);
    iy += 9;
  });

  // Disclaimer
  setFont(7, 'italic', PDF_CONFIG.colors.gray);
  const disc = 'Ce plan a été établi à titre de conseil nutritionnel général et ne constitue pas un acte médical. Consultez votre médecin pour tout problème de santé.';
  const lines = doc.splitTextToSize(disc, cw);
  doc.text(lines, mg, H - 20);
}

// ── EN-TÊTE DE PAGE ──────────────────────────────────────────
function drawPageHeader(doc, W, mg, setFont, fillRect, title) {
  fillRect(0, 0, W, 18, PDF_CONFIG.colors.dark);
  fillRect(0, 18, W, 2, PDF_CONFIG.colors.green);

  setFont(7, 'normal', [93, 202, 165]);
  doc.text('NutriDoc', mg, 8);
  setFont(7, 'bold', PDF_CONFIG.colors.white);
  doc.text(title.toUpperCase(), mg + 18, 8);
  setFont(7, 'normal', [100, 130, 115]);
  doc.text(new Date().toLocaleDateString('fr-FR'), W - mg, 8, { align: 'right' });

  return 28;
}

// ── PIED DE PAGE ──────────────────────────────────────────────
function drawPageFooter(doc, W, H, mg, page, patient, dietitian) {
  doc.setDrawColor(...PDF_CONFIG.colors.border);
  doc.setLineWidth(0.2);
  doc.line(mg, H - 12, W - mg, H - 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF_CONFIG.colors.gray);
  doc.text(`CONFIDENTIEL · Plan de ${patient.prenom || ''} ${patient.nom || ''} · Validé par ${dietitian.nom || ''}`, mg, H - 7);
  doc.text(`Page ${page}`, W - mg, H - 7, { align: 'right' });
}

// ── SECTION PROFIL ────────────────────────────────────────────
function drawProfilSection(doc, y, mg, cw, patient, plan, setFont, fillRect, strokeRect) {
  // Calcul IMC
  const imc = (patient.taille && patient.poids && patient.taille > 0) 
    ? (patient.poids / Math.pow(patient.taille / 100, 2)).toFixed(1) 
    : '—';
  const imcCat = parseFloat(imc) < 18.5 ? 'Insuffisance pondérale' :
                 parseFloat(imc) < 25 ? 'Poids normal' :
                 parseFloat(imc) < 30 ? 'Surpoids' : 'Obésité';

  // Calcul besoins caloriques (Harris-Benedict)
  const _p = parseFloat(patient.poids) || 65;
  const _t = parseFloat(patient.taille) || 165;
  const _a = parseInt(patient.age) || 30;
  const bmr = patient.sexe === 'homme'
    ? 88.4 + (13.4 * _p) + (4.8 * _t) - (5.7 * _a)
    : 447.6 + (9.25 * _p) + (3.1 * _t) - (4.3 * _a);
  const NIVEAUX = { sedentaire: 1.2, leger: 1.375, modere: 1.55, actif: 1.725 };
  const coeff = NIVEAUX[patient.activite?.toLowerCase()] || 1.55;
  const tdee = Math.round(bmr * coeff);
  const cibles = {
    perte_poids: Math.round(tdee * 0.85),
    prise_masse: Math.round(tdee * 1.1),
    equilibre: tdee
  };
  const kcalCible = cibles[patient.objectif?.toLowerCase().replace(/ /g, '_')] || tdee;

  // Calcul totaux réels du plan (utilisation de _totalsPlan interne)
  const totals = _totalsPlan(plan);
  const totKcal = totals.kcal;
  const totProt = totals.prot;
  const totGlu = totals.glu;
  const totLip = totals.lip;

  // Métriques
  const metrics = [
    { label: 'IMC', value: imc, sub: imcCat, color: PDF_CONFIG.colors.green },
    { label: 'Dépense estimée', value: tdee + ' kcal', sub: 'TDEE / jour', color: PDF_CONFIG.colors.green2 },
    { label: 'Objectif calorique', value: kcalCible + ' kcal', sub: patient.objectif || '—', color: PDF_CONFIG.colors.green },
    { label: 'Apport du plan', value: (totKcal || kcalCible) + ' kcal', sub: 'Calculé sur le plan', color: PDF_CONFIG.colors.green2 }
  ];

  const bw = cw / 4 - 3;
  metrics.forEach((m, i) => {
    const mx = mg + i * (bw + 4);
    doc.setFillColor(...PDF_CONFIG.colors.gray_light);
    doc.roundedRect(mx, y, bw, 24, 2, 2, 'F');
    doc.setDrawColor(...m.color);
    doc.setLineWidth(0.4);
    doc.line(mx, y, mx + bw, y);
    setFont(11, 'bold', m.color);
    doc.text(m.value, mx + bw / 2, y + 11, { align: 'center' });
    setFont(7, 'normal', PDF_CONFIG.colors.gray);
    doc.text(m.label, mx + bw / 2, y + 18, { align: 'center' });
    doc.text(m.sub, mx + bw / 2, y + 22, { align: 'center' });
  });
  y += 30;

  // Répartition macros
  if (totProt > 0 || totGlu > 0 || totLip > 0) {
    setFont(9, 'bold', PDF_CONFIG.colors.dark);
    doc.text('Répartition macronutriments (journée type)', mg, y + 6);
    y += 10;
    
    const macroData = [
      { label: 'Protéines', val: totProt, unit: 'g', color: [29, 158, 117], kcal: totProt * 4 },
      { label: 'Glucides', val: totGlu, unit: 'g', color: [245, 158, 11], kcal: totGlu * 4 },
      { label: 'Lipides', val: totLip, unit: 'g', color: [59, 130, 246], kcal: totLip * 9 }
    ];
    const totalKcalM = macroData.reduce((s, m) => s + m.kcal, 1);
    macroData.forEach((m, i) => {
      const mx = mg + i * (cw / 3 + 2);
      const pct = Math.round(m.kcal / totalKcalM * 100);
      doc.setFillColor(...m.color);
      doc.roundedRect(mx, y, cw / 3 - 2, 18, 2, 2, 'F');
      setFont(11, 'bold', PDF_CONFIG.colors.white);
      doc.text(`${m.val}g`, mx + (cw / 3 - 2) / 2, y + 9, { align: 'center' });
      setFont(7, 'normal', PDF_CONFIG.colors.white);
      doc.text(`${m.label} · ${pct}%`, mx + (cw / 3 - 2) / 2, y + 14.5, { align: 'center' });
    });
    y += 25;
  }

  return y;
}

// ── BLOC REPAS ────────────────────────────────────────────────
function drawRepasBlock(doc, y, mg, cw, repasKey, items, setFont, fillRect, strokeRect, addPageIfNeeded) {
  const cfg = PDF_CONFIG.repas[repasKey] || { label: repasKey, color: PDF_CONFIG.colors.green };

  // En-tête repas
  fillRect(mg, y, cw, 10, cfg.color, 2);
  setFont(9, 'bold', PDF_CONFIG.colors.white);
  doc.text(cfg.label.toUpperCase(), mg + 4, y + 7);

  // Calcul total kcal repas
  let repasKcal = 0;
  items.forEach(item => {
    repasKcal += _kcalPour(item.aliment, item.qte) || 0;
  });
  setFont(8, 'bold', PDF_CONFIG.colors.white);
  doc.text(`${repasKcal} kcal`, mg + cw - 4, y + 7, { align: 'right' });
  y += 12;

  // Tableau aliments
  const colW = [cw * 0.4, cw * 0.15, cw * 0.15, cw * 0.3];
  const headers = ['Aliment', 'Quantité', 'Kcal', 'Note'];

  // Header tableau
  doc.setFillColor(245, 248, 245);
  doc.rect(mg, y, cw, 7, 'F');
  headers.forEach((h, i) => {
    setFont(7, 'bold', PDF_CONFIG.colors.gray);
    const x = mg + colW.slice(0, i).reduce((a, b) => a + b, 0) + 2;
    doc.text(h, x, y + 5);
  });
  y += 8;

  items.forEach((item, idx) => {
    y = addPageIfNeeded(y, 10);
    if (idx % 2 === 0) {
      doc.setFillColor(252, 254, 252);
      doc.rect(mg, y - 1, cw, 8, 'F');
    }
    const itemKcal = _kcalPour(item.aliment, item.qte);
    const macros = _getMacrosMicros(item.aliment, item.qte);

    setFont(8, 'normal', PDF_CONFIG.colors.dark);
    doc.text(item.aliment || '—', mg + 2, y + 5);
    setFont(8, 'bold', cfg.color);
    doc.text(`${item.qte}${item.unite || 'g'}`, mg + colW[0] + 2, y + 5);
    setFont(8, 'normal', PDF_CONFIG.colors.dark);
    doc.text(itemKcal !== null ? `${itemKcal}` : '—', mg + colW[0] + colW[1] + 2, y + 5);
    setFont(7, 'normal', PDF_CONFIG.colors.gray);
    const note = item.note || (macros ? `P:${macros.prot}g G:${macros.glu}g L:${macros.lip}g` : '');
    const noteLines = doc.splitTextToSize(note, colW[3] - 4);
    doc.text(noteLines[0] || '', mg + colW[0] + colW[1] + colW[2] + 2, y + 5);
    y += 9;
  });

  // Ligne de séparation
  doc.setDrawColor(...PDF_CONFIG.colors.border);
  doc.setLineWidth(0.2);
  doc.line(mg, y, mg + cw, y);
  return y + 3;
}

// ── SECTION CONSEILS ─────────────────────────────────────────
function drawConseilsSection(doc, y, mg, cw, patient, setFont, fillRect, strokeRect) {
  const conseils = [
    {
      titre: '💧 Hydratation',
      texte: 'Boire 1,5 à 2 litres d\'eau par jour, répartis tout au long de la journée. Privilégiez l\'eau plate ou gazeuse sans sucre.'
    },
    {
      titre: '⏰ Rythme alimentaire',
      texte: 'Maintenez des horaires de repas réguliers. Évitez de sauter des repas. Mangez lentement et sans distraction.'
    },
    {
      titre: '🍳 Cuisson & préparation',
      texte: 'Privilégiez les cuissons douces : vapeur, four, poêle anti-adhérente. Limitez les fritures et panures.'
    },
    {
      titre: '🛒 Courses & planification',
      texte: 'Préparez vos repas à l\'avance. Lisez les étiquettes nutritionnelles. Faites vos courses avec une liste.'
    },
    {
      titre: '💪 Sport & plan alimentaire',
      texte: 'Sur les jours d\'entraînement, augmentez légèrement les glucides du repas pré-séance (+20-30%).'
    },
    {
      titre: '⚠️ Avertissements importants',
      texte: 'Ce plan est personnalisé mais indicatif. En cas de malaise, consultez votre médecin.'
    }
  ];

  setFont(12, 'bold', PDF_CONFIG.colors.dark);
  doc.text('Conseils & recommandations', mg, y);
  y += 8;

  const bw = cw / 2 - 4;
  conseils.forEach((c, i) => {
    const col = i % 2;
    const cx = mg + col * (bw + 8);
    if (col === 0 && i > 0) y += 28;

    fillRect(cx, y - 4, bw, 26, PDF_CONFIG.colors.gray_light, 2);
    doc.setDrawColor(...PDF_CONFIG.colors.green);
    doc.setLineWidth(0.5);
    doc.line(cx, y - 4, cx, y + 22);

    setFont(8, 'bold', PDF_CONFIG.colors.dark);
    doc.text(c.titre, cx + 4, y + 2);
    setFont(7, 'normal', PDF_CONFIG.colors.gray);
    const lines = doc.splitTextToSize(c.texte, bw - 6);
    doc.text(lines.slice(0, 3), cx + 4, y + 8);
  });

  return y + 32;
}

// ── PAGE SIGNATURE ────────────────────────────────────────────
function drawSignaturePage(doc, W, H, mg, cw, patient, dietitian, setFont, fillRect, strokeRect) {
  let y = 28;

  // Attestation
  fillRect(mg, y, cw, 50, PDF_CONFIG.colors.gray_light, 3);
  doc.setDrawColor(...PDF_CONFIG.colors.green);
  doc.setLineWidth(0.5);
  doc.rect(mg, y, cw, 50, 'S');

  setFont(11, 'bold', PDF_CONFIG.colors.dark);
  doc.text('Attestation de plan nutritionnel validé', mg + cw / 2, y + 10, { align: 'center' });
  setFont(9, 'normal', PDF_CONFIG.colors.dark);
  doc.text(`Je soussigné(e), ${dietitian.nom || 'le diététicien'}, diététicien(ne)-nutritionniste,`, mg + 4, y + 20);
  doc.text(`certifie avoir élaboré et validé ce plan alimentaire personnalisé pour`, mg + 4, y + 27);
  setFont(9, 'bold', PDF_CONFIG.colors.dark);
  doc.text(`${patient.prenom || ''} ${patient.nom || ''}`.trim() || 'le patient', mg + 4, y + 34);
  setFont(9, 'normal', PDF_CONFIG.colors.dark);
  doc.text(`en date du ${new Date().toLocaleDateString('fr-FR')}.`, mg + 4 + doc.getTextWidth(`${patient.prenom || ''} ${patient.nom || ''}`.trim() || 'le patient') + 2, y + 34);
  setFont(8, 'normal', PDF_CONFIG.colors.gray);
  doc.text(`Numéro RPPS : ${dietitian.rpps || '—'}`, mg + 4, y + 42);
  y += 58;

  // Coordonnées diét
  setFont(10, 'bold', PDF_CONFIG.colors.dark);
  doc.text('Coordonnées du diététicien', mg, y + 6);
  y += 12;

  const coordsDiet = [
    ['Nom & titre', `${dietitian.nom || '—'} · ${dietitian.titre || 'Diét.-Nutritionniste'}`],
    ['N° RPPS', dietitian.rpps || '—'],
    ['Cabinet', dietitian.cabinet || 'Cabinet NutriDoc'],
    ['Email', dietitian.email || '—'],
    ['Téléphone', dietitian.tel || '—']
  ];
  coordsDiet.forEach(([l, v], i) => {
    if (i % 2 === 0) {
      doc.setFillColor(248, 251, 249);
      doc.rect(mg, y - 3, cw, 8, 'F');
    }
    setFont(8, 'bold', PDF_CONFIG.colors.gray);
    doc.text(l, mg + 2, y + 3);
    setFont(8, 'normal', PDF_CONFIG.colors.dark);
    doc.text(String(v), mg + 55, y + 3);
    y += 9;
  });

  y += 8;

  // Zone signature
  setFont(8, 'normal', PDF_CONFIG.colors.gray);
  doc.text('Signature du diététicien :', mg, y);
  doc.setDrawColor(...PDF_CONFIG.colors.border);
  doc.setLineWidth(0.3);
  doc.rect(mg, y + 5, 70, 25, 'S');
  doc.text('Date : _____ / _____ / _______', mg + 80, y + 18);

  y += 40;

  // QR Code simulé
  fillRect(W - mg - 30, y - 30, 30, 30, PDF_CONFIG.colors.gray_light, 2);
  setFont(6, 'normal', PDF_CONFIG.colors.gray);
  doc.text('Vérifier en ligne', W - mg - 15, y + 4, { align: 'center' });
  doc.text('nutridoc.fr', W - mg - 15, y + 8, { align: 'center' });

  // Mentions légales
  y += 15;
  setFont(7, 'italic', PDF_CONFIG.colors.gray);
  const mentions = [
    'Ce document est confidentiel et destiné exclusivement à la personne désignée ci-dessus.',
    'Données de santé protégées conformément au RGPD et à la loi Informatique et Libertés.',
    'Plan généré via la plateforme NutriDoc by CaliDoc Santé — contact@calidoc-sante.fr'
  ];
  mentions.forEach(m => {
    doc.text(m, mg, y);
    y += 5;
  });
}

// ── RACCOURCIS ────────────────────────────────────────────────
function initPDFButton(containerId, patient, plan, dietitian) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const btn = document.createElement('button');
  btn.id = 'btnGenPDF';
  btn.className = 'btn-validate';
  btn.innerHTML = '⬇ Télécharger PDF';
  btn.style.cssText = 'display:flex;align-items:center;gap:.4rem;';
  btn.onclick = () => genererPDF(patient, plan, dietitian);
  el.appendChild(btn);
}

function genererPDFDemo() {
  const d = getDemoData();
  return genererPDF(d.patient, d.plan, d.dietitian, d.options);
}

// Exports globaux
window.genererPDF = genererPDF;
window.initPDFButton = initPDFButton;
window.genererPDFDemo = genererPDFDemo;