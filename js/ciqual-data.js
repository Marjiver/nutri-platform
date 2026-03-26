// Table CIQUAL 2020 — Anses — valeurs pour 100g/ml EN CUIT
// Macros: proteines(g), glucides(g), lipides(g), fibres(g)
// Micros: fer(mg), calcium(mg), vitC(mg), vitD(µg), vitB12(µg), magnesium(mg), potassium(mg), zinc(mg)

const CIQUAL = {
  glucides_feculents: {
    label: "Féculents & céréales", color: "#f59e0b", icon: "🌾",
    reference: { aliment: "Pomme de terre vapeur", kcal: 70, qte: 100, unite: "g" },
    equivalents: [
      { aliment:"Pomme de terre vapeur",   kcal:70,  qte:100, unite:"g", note:"cuite",  prot:1.9, glu:14.7, lip:0.1, fib:1.8, fer:0.3, ca:7,   vitC:13, vitD:0,   b12:0,   mg:22,  k:418,  zn:0.3 },
      { aliment:"Riz blanc cuit",          kcal:130, qte:100, unite:"g", note:"cuit",   prot:2.7, glu:28.2, lip:0.3, fib:0.3, fer:0.2, ca:10,  vitC:0,  vitD:0,   b12:0,   mg:12,  k:35,   zn:0.5 },
      { aliment:"Pâtes cuites",            kcal:131, qte:100, unite:"g", note:"cuites", prot:5.0, glu:25.7, lip:0.9, fib:1.8, fer:0.8, ca:10,  vitC:0,  vitD:0,   b12:0,   mg:25,  k:44,   zn:0.6 },
      { aliment:"Quinoa cuit",             kcal:120, qte:100, unite:"g", note:"cuit",   prot:4.4, glu:21.3, lip:1.9, fib:2.8, fer:1.5, ca:17,  vitC:0,  vitD:0,   b12:0,   mg:64,  k:172,  zn:1.1 },
      { aliment:"Pain complet",            kcal:224, qte:100, unite:"g", note:"",       prot:8.5, glu:41.3, lip:2.5, fib:6.5, fer:2.5, ca:23,  vitC:0,  vitD:0,   b12:0,   mg:68,  k:230,  zn:1.8 },
      { aliment:"Pain blanc baguette",     kcal:270, qte:100, unite:"g", note:"",       prot:8.8, glu:54.8, lip:1.4, fib:2.3, fer:1.3, ca:23,  vitC:0,  vitD:0,   b12:0,   mg:22,  k:110,  zn:0.8 },
      { aliment:"Flocons d'avoine",        kcal:372, qte:100, unite:"g", note:"cru",    prot:13.5,glu:59.7, lip:6.9, fib:10.3,fer:3.9, ca:54,  vitC:0,  vitD:0,   b12:0,   mg:130, k:362,  zn:3.6 },
      { aliment:"Lentilles cuites",        kcal:116, qte:100, unite:"g", note:"cuites", prot:9.0, glu:17.5, lip:0.4, fib:7.9, fer:3.3, ca:19,  vitC:1.5,vitD:0,   b12:0,   mg:36,  k:369,  zn:1.3 },
      { aliment:"Pois chiches cuits",      kcal:164, qte:100, unite:"g", note:"cuits",  prot:8.9, glu:22.5, lip:4.0, fib:7.6, fer:2.9, ca:49,  vitC:0,  vitD:0,   b12:0,   mg:48,  k:291,  zn:1.5 },
      { aliment:"Haricots rouges cuits",   kcal:100, qte:100, unite:"g", note:"cuits",  prot:6.9, glu:13.7, lip:0.5, fib:8.7, fer:2.0, ca:28,  vitC:0,  vitD:0,   b12:0,   mg:45,  k:340,  zn:1.0 },
      { aliment:"Patate douce cuite",      kcal:76,  qte:100, unite:"g", note:"cuite",  prot:1.4, glu:17.7, lip:0.1, fib:2.5, fer:0.5, ca:26,  vitC:16, vitD:0,   b12:0,   mg:20,  k:390,  zn:0.3 },
      { aliment:"Semoule cuite",           kcal:138, qte:100, unite:"g", note:"cuite",  prot:4.9, glu:27.4, lip:0.6, fib:1.4, fer:0.8, ca:13,  vitC:0,  vitD:0,   b12:0,   mg:16,  k:58,   zn:0.5 },
    ]
  },
  proteines_animales: {
    label: "Protéines animales", color: "#ef4444", icon: "🥩",
    reference: { aliment: "Blanc de poulet cuit", kcal: 165, qte: 100, unite: "g" },
    equivalents: [
      { aliment:"Blanc de poulet cuit",    kcal:165, qte:100, unite:"g", note:"cuit",   prot:31.0,glu:0,    lip:3.6, fib:0,   fer:0.7, ca:13,  vitC:0,  vitD:0.1, b12:0.3, mg:29,  k:280,  zn:1.0 },
      { aliment:"Dinde cuite",             kcal:160, qte:100, unite:"g", note:"cuite",  prot:29.9,glu:0,    lip:4.0, fib:0,   fer:1.5, ca:22,  vitC:0,  vitD:0.1, b12:0.4, mg:28,  k:298,  zn:3.1 },
      { aliment:"Bœuf haché 5% MG cuit",  kcal:175, qte:100, unite:"g", note:"cuit",   prot:26.1,glu:0,    lip:7.5, fib:0,   fer:2.7, ca:18,  vitC:0,  vitD:0.5, b12:2.1, mg:24,  k:318,  zn:5.4 },
      { aliment:"Saumon cuit",             kcal:196, qte:100, unite:"g", note:"cuit",   prot:27.0,glu:0,    lip:10.0,fib:0,   fer:0.5, ca:14,  vitC:0,  vitD:11.0,b12:3.2, mg:33,  k:490,  zn:0.6 },
      { aliment:"Thon au naturel",         kcal:116, qte:100, unite:"g", note:"égoutté",prot:25.5,glu:0,    lip:1.0, fib:0,   fer:1.3, ca:10,  vitC:0,  vitD:5.4, b12:2.2, mg:30,  k:237,  zn:0.7 },
      { aliment:"Cabillaud cuit",          kcal:96,  qte:100, unite:"g", note:"cuit",   prot:21.2,glu:0,    lip:0.9, fib:0,   fer:0.4, ca:16,  vitC:0,  vitD:1.2, b12:1.2, mg:38,  k:390,  zn:0.5 },
      { aliment:"Œuf entier cuit",         kcal:155, qte:100, unite:"g", note:"~2 œufs",prot:12.4,glu:0.6,  lip:10.6,fib:0,   fer:1.8, ca:50,  vitC:0,  vitD:2.0, b12:1.3, mg:12,  k:130,  zn:1.3 },
      { aliment:"Jambon blanc dégraissé",  kcal:107, qte:100, unite:"g", note:"",       prot:17.8,glu:1.3,  lip:3.3, fib:0,   fer:0.6, ca:5,   vitC:0,  vitD:0.2, b12:0.4, mg:21,  k:280,  zn:1.6 },
      { aliment:"Crevettes cuites",        kcal:99,  qte:100, unite:"g", note:"cuites", prot:20.9,glu:0.9,  lip:1.1, fib:0,   fer:0.5, ca:70,  vitC:0,  vitD:0,   b12:1.2, mg:40,  k:220,  zn:1.6 },
      { aliment:"Sardines au naturel",     kcal:135, qte:100, unite:"g", note:"",       prot:20.4,glu:0,    lip:5.3, fib:0,   fer:2.9, ca:382, vitC:0,  vitD:4.8, b12:8.9, mg:38,  k:397,  zn:1.3 },
    ]
  },
  proteines_vegetales: {
    label: "Protéines végétales", color: "#22c55e", icon: "🌱",
    reference: { aliment: "Tofu ferme", kcal: 144, qte: 100, unite: "g" },
    equivalents: [
      { aliment:"Tofu ferme",              kcal:144, qte:100, unite:"g", note:"",       prot:17.3,glu:2.3,  lip:8.7, fib:0.3, fer:5.4, ca:350, vitC:0,  vitD:0,   b12:0,   mg:58,  k:121,  zn:1.6 },
      { aliment:"Tofu soyeux",             kcal:55,  qte:100, unite:"g", note:"",       prot:5.3, glu:2.4,  lip:2.7, fib:0.2, fer:0.8, ca:130, vitC:0,  vitD:0,   b12:0,   mg:22,  k:101,  zn:0.5 },
      { aliment:"Tempeh",                  kcal:192, qte:100, unite:"g", note:"",       prot:18.5,glu:9.4,  lip:10.8,fib:4.1, fer:2.7, ca:111, vitC:0,  vitD:0,   b12:0,   mg:81,  k:412,  zn:1.1 },
      { aliment:"Edamame cuit",            kcal:122, qte:100, unite:"g", note:"cuit",   prot:11.9,glu:8.9,  lip:5.2, fib:5.2, fer:2.3, ca:63,  vitC:6.1,vitD:0,   b12:0,   mg:64,  k:436,  zn:1.4 },
      { aliment:"Seitan",                  kcal:142, qte:100, unite:"g", note:"",       prot:25.0,glu:7.0,  lip:2.0, fib:0.3, fer:1.9, ca:14,  vitC:0,  vitD:0,   b12:0,   mg:16,  k:65,   zn:0.3 },
    ]
  },
  legumes: {
    label: "Légumes", color: "#10b981", icon: "🥦",
    reference: { aliment: "Haricots verts cuits", kcal: 30, qte: 100, unite: "g" },
    equivalents: [
      { aliment:"Haricots verts cuits",    kcal:30,  qte:100, unite:"g", note:"cuits",  prot:1.8, glu:4.3,  lip:0.2, fib:3.4, fer:1.0, ca:37,  vitC:12, vitD:0,   b12:0,   mg:25,  k:230,  zn:0.2 },
      { aliment:"Brocolis cuits",          kcal:27,  qte:100, unite:"g", note:"cuits",  prot:2.8, glu:2.6,  lip:0.4, fib:2.6, fer:0.8, ca:40,  vitC:62, vitD:0,   b12:0,   mg:18,  k:293,  zn:0.4 },
      { aliment:"Carottes cuites",         kcal:35,  qte:100, unite:"g", note:"cuites", prot:0.8, glu:7.2,  lip:0.2, fib:2.5, fer:0.4, ca:30,  vitC:4,  vitD:0,   b12:0,   mg:13,  k:280,  zn:0.2 },
      { aliment:"Courgettes cuites",       kcal:18,  qte:100, unite:"g", note:"cuites", prot:1.3, glu:2.1,  lip:0.3, fib:1.1, fer:0.4, ca:18,  vitC:9,  vitD:0,   b12:0,   mg:18,  k:264,  zn:0.3 },
      { aliment:"Épinards cuits",          kcal:23,  qte:100, unite:"g", note:"cuits",  prot:2.9, glu:1.6,  lip:0.4, fib:2.4, fer:2.2, ca:99,  vitC:10, vitD:0,   b12:0,   mg:57,  k:466,  zn:0.5 },
      { aliment:"Poivron rouge cuit",      kcal:27,  qte:100, unite:"g", note:"cuit",   prot:0.9, glu:4.7,  lip:0.3, fib:1.9, fer:0.4, ca:10,  vitC:81, vitD:0,   b12:0,   mg:14,  k:211,  zn:0.2 },
      { aliment:"Tomate crue",             kcal:18,  qte:100, unite:"g", note:"",       prot:0.9, glu:3.1,  lip:0.2, fib:1.2, fer:0.3, ca:10,  vitC:14, vitD:0,   b12:0,   mg:11,  k:237,  zn:0.2 },
      { aliment:"Champignons cuits",       kcal:26,  qte:100, unite:"g", note:"cuits",  prot:2.2, glu:2.3,  lip:0.7, fib:1.5, fer:0.5, ca:5,   vitC:2,  vitD:0.1, b12:0,   mg:12,  k:356,  zn:0.5 },
      { aliment:"Aubergine cuite",         kcal:28,  qte:100, unite:"g", note:"cuite",  prot:1.0, glu:4.7,  lip:0.2, fib:2.5, fer:0.3, ca:12,  vitC:1,  vitD:0,   b12:0,   mg:14,  k:230,  zn:0.2 },
      { aliment:"Poireau cuit",            kcal:27,  qte:100, unite:"g", note:"cuit",   prot:1.5, glu:3.9,  lip:0.3, fib:1.9, fer:1.1, ca:30,  vitC:7,  vitD:0,   b12:0,   mg:14,  k:180,  zn:0.2 },
    ]
  },
  fruits: {
    label: "Fruits", color: "#f97316", icon: "🍎",
    reference: { aliment: "Pomme", kcal: 52, qte: 100, unite: "g" },
    equivalents: [
      { aliment:"Pomme",                   kcal:52,  qte:100, unite:"g", note:"",       prot:0.3, glu:12.8, lip:0.2, fib:2.4, fer:0.1, ca:6,   vitC:5,  vitD:0,   b12:0,   mg:5,   k:107,  zn:0.0 },
      { aliment:"Banane",                  kcal:89,  qte:100, unite:"g", note:"",       prot:1.1, glu:20.2, lip:0.3, fib:2.6, fer:0.3, ca:5,   vitC:9,  vitD:0,   b12:0,   mg:27,  k:358,  zn:0.2 },
      { aliment:"Orange",                  kcal:47,  qte:100, unite:"g", note:"",       prot:0.9, glu:9.4,  lip:0.1, fib:2.4, fer:0.1, ca:40,  vitC:53, vitD:0,   b12:0,   mg:10,  k:181,  zn:0.1 },
      { aliment:"Fraises",                 kcal:32,  qte:100, unite:"g", note:"",       prot:0.7, glu:5.7,  lip:0.3, fib:2.0, fer:0.4, ca:16,  vitC:59, vitD:0,   b12:0,   mg:13,  k:154,  zn:0.1 },
      { aliment:"Kiwi",                    kcal:61,  qte:100, unite:"g", note:"",       prot:1.1, glu:11.7, lip:0.6, fib:3.0, fer:0.3, ca:34,  vitC:93, vitD:0,   b12:0,   mg:17,  k:312,  zn:0.1 },
      { aliment:"Myrtilles",               kcal:57,  qte:100, unite:"g", note:"",       prot:0.7, glu:12.1, lip:0.3, fib:2.4, fer:0.3, ca:6,   vitC:10, vitD:0,   b12:0,   mg:6,   k:77,   zn:0.2 },
      { aliment:"Mangue",                  kcal:65,  qte:100, unite:"g", note:"",       prot:0.6, glu:14.8, lip:0.4, fib:1.8, fer:0.2, ca:11,  vitC:28, vitD:0,   b12:0,   mg:10,  k:168,  zn:0.1 },
      { aliment:"Compote sans sucre",      kcal:48,  qte:100, unite:"g", note:"",       prot:0.3, glu:11.5, lip:0.1, fib:1.9, fer:0.1, ca:5,   vitC:2,  vitD:0,   b12:0,   mg:4,   k:90,   zn:0.0 },
    ]
  },
  laitiers: {
    label: "Produits laitiers", color: "#60a5fa", icon: "🥛",
    reference: { aliment: "Yaourt nature", kcal: 65, qte: 100, unite: "g" },
    equivalents: [
      { aliment:"Yaourt nature",           kcal:65,  qte:100, unite:"g", note:"",       prot:3.9, glu:5.2,  lip:3.4, fib:0,   fer:0.1, ca:120, vitC:0,  vitD:0.1, b12:0.4, mg:11,  k:155,  zn:0.5 },
      { aliment:"Fromage blanc 0%",        kcal:45,  qte:100, unite:"g", note:"",       prot:8.0, glu:4.0,  lip:0.2, fib:0,   fer:0.1, ca:118, vitC:0,  vitD:0,   b12:0.3, mg:8,   k:130,  zn:0.5 },
      { aliment:"Yaourt grec nature",      kcal:115, qte:100, unite:"g", note:"",       prot:9.0, glu:4.1,  lip:7.0, fib:0,   fer:0,   ca:110, vitC:0,  vitD:0.1, b12:0.5, mg:11,  k:141,  zn:0.5 },
      { aliment:"Lait demi-écrémé",        kcal:46,  qte:100, unite:"ml",note:"",       prot:3.3, glu:4.8,  lip:1.6, fib:0,   fer:0,   ca:120, vitC:0,  vitD:0.1, b12:0.5, mg:11,  k:150,  zn:0.4 },
      { aliment:"Emmental râpé",           kcal:380, qte:100, unite:"g", note:"",       prot:28.0,glu:0.5,  lip:29.0,fib:0,   fer:0.4, ca:1100,vitC:0,  vitD:0.4, b12:1.5, mg:44,  k:77,   zn:4.0 },
      { aliment:"Feta",                    kcal:264, qte:100, unite:"g", note:"",       prot:14.2,glu:4.1,  lip:21.3,fib:0,   fer:0.7, ca:493, vitC:0,  vitD:0.1, b12:1.2, mg:19,  k:62,   zn:2.9 },
    ]
  },
  matieres_grasses: {
    label: "Matières grasses", color: "#a78bfa", icon: "🫒",
    reference: { aliment: "Huile d'olive", kcal: 884, qte: 100, unite: "ml" },
    equivalents: [
      { aliment:"Huile d'olive",           kcal:884, qte:100, unite:"ml",note:"1cs=9g=80kcal", prot:0, glu:0, lip:99.9,fib:0, fer:0.6, ca:1,   vitC:0,  vitD:0,   b12:0,   mg:0,   k:1,    zn:0 },
      { aliment:"Huile de colza",          kcal:884, qte:100, unite:"ml",note:"1cs=9g=80kcal", prot:0, glu:0, lip:99.9,fib:0, fer:0,   ca:0,   vitC:0,  vitD:0,   b12:0,   mg:0,   k:0,    zn:0 },
      { aliment:"Beurre",                  kcal:745, qte:100, unite:"g", note:"1cs=15g=112kcal",prot:0.6,glu:0.6,lip:82.0,fib:0, fer:0,   ca:15,  vitC:0,  vitD:1.5, b12:0.1, mg:2,   k:26,   zn:0.1 },
      { aliment:"Avocat",                  kcal:160, qte:100, unite:"g", note:"",       prot:2.0, glu:1.8,  lip:15.4,fib:6.7, fer:0.6, ca:12,  vitC:10, vitD:0,   b12:0,   mg:29,  k:485,  zn:0.6 },
      { aliment:"Amandes",                 kcal:579, qte:100, unite:"g", note:"",       prot:21.2,glu:6.9,  lip:49.9,fib:12.5,fer:3.7, ca:264, vitC:0,  vitD:0,   b12:0,   mg:270, k:733,  zn:3.1 },
      { aliment:"Noix",                    kcal:654, qte:100, unite:"g", note:"",       prot:15.2,glu:2.6,  lip:65.2,fib:6.7, fer:2.9, ca:98,  vitC:1,  vitD:0,   b12:0,   mg:158, k:441,  zn:3.1 },
      { aliment:"Beurre de cacahuète",     kcal:598, qte:100, unite:"g", note:"",       prot:24.1,glu:20.0, lip:51.0,fib:6.0, fer:1.9, ca:49,  vitC:0,  vitD:0,   b12:0,   mg:170, k:649,  zn:2.9 },
    ]
  },
  boissons: {
    label: "Boissons", color: "#38bdf8", icon: "💧",
    reference: { aliment: "Eau", kcal: 0, qte: 100, unite: "ml" },
    equivalents: [
      { aliment:"Eau",                     kcal:0,   qte:100, unite:"ml",note:"",       prot:0,   glu:0,    lip:0,   fib:0,   fer:0,   ca:0,   vitC:0,  vitD:0,   b12:0,   mg:0,   k:0,    zn:0 },
      { aliment:"Lait demi-écrémé",        kcal:46,  qte:100, unite:"ml",note:"",       prot:3.3, glu:4.8,  lip:1.6, fib:0,   fer:0,   ca:120, vitC:0,  vitD:0.1, b12:0.5, mg:11,  k:150,  zn:0.4 },
      { aliment:"Jus d'orange pressé",     kcal:45,  qte:100, unite:"ml",note:"",       prot:0.7, glu:9.9,  lip:0.2, fib:0.2, fer:0.2, ca:11,  vitC:40, vitD:0,   b12:0,   mg:11,  k:200,  zn:0.1 },
      { aliment:"Lait végétal soja",       kcal:44,  qte:100, unite:"ml",note:"",       prot:3.3, glu:2.7,  lip:1.8, fib:0,   fer:0.4, ca:120, vitC:0,  vitD:1.0, b12:0.4, mg:13,  k:118,  zn:0.3 },
    ]
  }
};

const GROUPES_LIST = Object.entries(CIQUAL).map(([k,v]) => ({ key:k, label:v.label, icon:v.icon, color:v.color }));

function detecterGroupe(nomAliment) {
  const n = nomAliment.toLowerCase();
  if (/riz|pât|pasta|pomme de terre|patate|quinoa|pain|lentill|pois chich|haricot rouge|semoule|flocon|soba/.test(n)) return 'glucides_feculents';
  if (/poulet|dinde|bœuf|boeuf|porc|saumon|thon|cabillaud|sardine|jambon|crevette|œuf|oeuf/.test(n)) return 'proteines_animales';
  if (/tofu|tempeh|seitan|edamame/.test(n)) return 'proteines_vegetales';
  if (/brocoli|courgette|haricot vert|carotte|épinard|poivron|tomate|salade|concombre|champignon|aubergine|poireau|fenouil/.test(n)) return 'legumes';
  if (/pomme|banane|orange|fraise|framboise|myrtille|kiwi|poire|raisin|mangue|ananas|compote|fruit/.test(n)) return 'fruits';
  if (/yaourt|fromage blanc|lait|emmental|chèvre|feta|mozzarella|laitage/.test(n)) return 'laitiers';
  if (/huile|beurre|avocat|amande|noix|cacahuète|chia|lin|graines/.test(n)) return 'matieres_grasses';
  if (/eau|jus|boisson/.test(n)) return 'boissons';
  return null;
}

function getMacrosMicros(nomAliment, qte) {
  const n = nomAliment.toLowerCase();
  for (const grp of Object.values(CIQUAL)) {
    for (const eq of grp.equivalents) {
      if (eq.aliment.toLowerCase() === n) {
        const f = qte / 100;
        return {
          prot:  +(eq.prot * f).toFixed(1),
          glu:   +(eq.glu  * f).toFixed(1),
          lip:   +(eq.lip  * f).toFixed(1),
          fib:   +(eq.fib  * f).toFixed(1),
          fer:   +(eq.fer  * f).toFixed(1),
          ca:    Math.round(eq.ca * f),
          vitC:  Math.round(eq.vitC * f),
          vitD:  +(eq.vitD * f).toFixed(1),
          b12:   +(eq.b12  * f).toFixed(1),
          mg:    Math.round(eq.mg * f),
          k:     Math.round(eq.k * f),
          zn:    +(eq.zn * f).toFixed(1),
        };
      }
    }
  }
  return null;
}
