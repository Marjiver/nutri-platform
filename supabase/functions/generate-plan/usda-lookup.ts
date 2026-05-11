// ============================================================
//  usda-lookup.ts
//  Chemin : supabase/functions/generate-plan/usda-lookup.ts
//
//  Enrichit les aliments du jour_type avec les micronutriments
//  USDA FoodData Central (vitamines, minéraux, oméga-3).
//
//  Stratégie :
//    1. Traduction French → English des noms CIQUAL
//    2. Recherche dans USDA FDC (Foundation Foods + SR Legacy)
//    3. Extraction des nutriments clés par leur ID officiel USDA
//    4. Calcul des valeurs pour la quantité réelle (g/100g × qte)
//
//  Source : USDA FoodData Central — CC0 domaine public
//  API : https://api.nal.usda.gov/fdc/v1/
// ============================================================

// ── IDs nutriments USDA (stables entre les versions) ─────────────────────────
export const USDA_NUTRIENT_IDS = {
  // Macros (cohérence avec CIQUAL)
  energie:      208,
  proteines:    203,
  lipides:      204,
  glucides:     205,
  fibres:       291,
  // Minéraux
  calcium:      301,   // mg
  fer:          303,   // mg
  magnesium:    304,   // mg
  phosphore:    305,   // mg
  potassium:    306,   // mg
  sodium:       307,   // mg
  zinc:         309,   // mg
  selenium:     317,   // µg
  // Vitamines
  vitA:         320,   // µg RAE
  vitC:         401,   // mg
  vitD:         328,   // µg (D2+D3)
  vitE:         323,   // mg alpha-TE
  vitK:         430,   // µg
  vitB1:        404,   // mg Thiamine
  vitB2:        405,   // mg Riboflavine
  vitB3:        406,   // mg Niacine
  vitB5:        410,   // mg Acide pantothénique
  vitB6:        415,   // mg
  vitB9:        417,   // µg Folate total
  vitB12:       418,   // µg
  // Acides gras
  agSatures:    606,   // g
  agMono:       645,   // g
  agPoly:       646,   // g
  omega3_ALA:   851,   // g Alpha-linolénique
  omega3_EPA:   629,   // g Eicosapentaénoïque
  omega3_DHA:   621,   // g Docosahexaénoïque
} as const;

// ── Traduction des termes CIQUAL français → mots-clés anglais USDA ───────────
// Couvre les aliments les plus fréquents dans les plans générés.
// Structure : [terme_fr, terme_en_usda]
const TRADUCTIONS: [string, string][] = [
  // Viandes
  ["poulet", "chicken"],
  ["blanc de poulet", "chicken breast"],
  ["cuisse de poulet", "chicken thigh"],
  ["dinde", "turkey"],
  ["bœuf", "beef"],
  ["veau", "veal"],
  ["porc", "pork"],
  ["jambon", "ham"],
  ["agneau", "lamb"],
  ["lapin", "rabbit"],
  // Poissons & fruits de mer
  ["saumon", "salmon"],
  ["thon", "tuna"],
  ["cabillaud", "cod"],
  ["lieu", "pollock"],
  ["sardine", "sardine"],
  ["maquereau", "mackerel"],
  ["truite", "trout"],
  ["crevette", "shrimp"],
  ["moule", "mussel"],
  ["calamar", "squid"],
  // Œufs & produits laitiers
  ["œuf", "egg"],
  ["lait", "milk"],
  ["yaourt", "yogurt"],
  ["fromage blanc", "fromage blanc"],
  ["skyr", "skyr"],
  ["fromage", "cheese"],
  ["beurre", "butter"],
  ["crème fraîche", "cream"],
  // Céréales & féculents
  ["riz blanc", "rice white"],
  ["riz complet", "rice brown"],
  ["riz basmati", "rice basmati"],
  ["pâtes", "pasta"],
  ["pâtes complètes", "pasta whole wheat"],
  ["pain complet", "bread whole wheat"],
  ["pain blanc", "bread white"],
  ["pain de seigle", "rye bread"],
  ["farine", "flour"],
  ["flocons d'avoine", "oat"],
  ["quinoa", "quinoa"],
  ["boulgour", "bulgur"],
  ["semoule", "semolina"],
  ["polenta", "polenta"],
  ["millet", "millet"],
  ["maïs", "corn"],
  // Légumineuses
  ["lentilles", "lentils"],
  ["pois chiche", "chickpea"],
  ["haricot rouge", "kidney bean"],
  ["haricot blanc", "navy bean"],
  ["fèves", "fava bean"],
  ["tofu", "tofu"],
  // Légumes
  ["carotte", "carrot"],
  ["brocolis", "broccoli"],
  ["épinard", "spinach"],
  ["courgette", "zucchini"],
  ["tomate", "tomato"],
  ["haricot vert", "green bean"],
  ["poivron", "bell pepper"],
  ["oignon", "onion"],
  ["ail", "garlic"],
  ["pomme de terre", "potato"],
  ["patate douce", "sweet potato"],
  ["poireau", "leek"],
  ["chou", "cabbage"],
  ["chou-fleur", "cauliflower"],
  ["champignon", "mushroom"],
  ["aubergine", "eggplant"],
  ["concombre", "cucumber"],
  ["salade verte", "lettuce"],
  ["mâche", "mache"],
  ["radis", "radish"],
  ["betterave", "beet"],
  ["céleri", "celery"],
  ["fenouil", "fennel"],
  // Fruits
  ["pomme", "apple"],
  ["poire", "pear"],
  ["banane", "banana"],
  ["orange", "orange"],
  ["citron", "lemon"],
  ["kiwi", "kiwi"],
  ["fraise", "strawberry"],
  ["framboise", "raspberry"],
  ["myrtille", "blueberry"],
  ["raisin", "grape"],
  ["mangue", "mango"],
  ["ananas", "pineapple"],
  ["pêche", "peach"],
  ["abricot", "apricot"],
  ["pastèque", "watermelon"],
  ["melon", "cantaloupe"],
  // Oléagineux & graisses
  ["amande", "almond"],
  ["noix", "walnut"],
  ["noisette", "hazelnut"],
  ["noix de cajou", "cashew"],
  ["pistache", "pistachio"],
  ["huile d'olive", "olive oil"],
  ["huile de colza", "canola oil"],
  ["huile de tournesol", "sunflower oil"],
  ["huile de noix", "walnut oil"],
  ["avocat", "avocado"],
  // Sucres & divers
  ["miel", "honey"],
  ["sucre", "sugar"],
  ["chocolat", "chocolate"],
  ["confiture", "jam"],
];

// ── Structure de retour USDA ──────────────────────────────────────────────────
export interface UsdaMicronutrients {
  // Minéraux (mg sauf sélénium en µg)
  calcium_mg?:   number;
  fer_mg?:       number;
  magnesium_mg?: number;
  potassium_mg?: number;
  sodium_mg?:    number;
  zinc_mg?:      number;
  selenium_ug?:  number;
  // Vitamines
  vitA_ug?:   number;  // RAE
  vitC_mg?:   number;
  vitD_ug?:   number;
  vitE_mg?:   number;
  vitK_ug?:   number;
  vitB1_mg?:  number;
  vitB2_mg?:  number;
  vitB3_mg?:  number;
  vitB6_mg?:  number;
  vitB9_ug?:  number;  // folate
  vitB12_ug?: number;
  // Acides gras
  agSatures_g?:   number;
  omega3_ALA_g?:  number;
  omega3_EPA_g?:  number;
  omega3_DHA_g?:  number;
  omega3_total_g?: number;
  // Méta
  usda_food_name?:  string;
  usda_fdc_id?:     number;
  usda_data_type?:  string;
  usda_source:      "FDC" | "non_trouvé";
}

// ── Traduction d'un nom CIQUAL français → terme anglais ───────────────────────
function traduire(nomFr: string): string {
  const lower = nomFr.toLowerCase();
  // Chercher la traduction la plus longue (match le plus précis)
  let best = "";
  let bestEn = "";
  for (const [fr, en] of TRADUCTIONS) {
    if (lower.includes(fr) && fr.length > best.length) {
      best   = fr;
      bestEn = en;
    }
  }
  // Fallback : envoyer le terme français directement (FDC gère parfois)
  return bestEn || nomFr;
}

// ── Extraction d'un nutriment depuis la liste USDA ────────────────────────────
function getNutrient(
  nutrients: Array<{ nutrientId: number; value: number }>,
  id: number,
): number | undefined {
  const n = nutrients.find(n => n.nutrientId === id);
  return n ? Math.round(n.value * 100) / 100 : undefined;
}

// ── Calcul pour la quantité réelle (pour 100g → pour qteG) ───────────────────
function scale(val: number | undefined, qteG: number): number | undefined {
  return val !== undefined ? Math.round(val * qteG / 100 * 100) / 100 : undefined;
}

// ── Lookup principal ──────────────────────────────────────────────────────────
export async function lookupUsda(
  nomCiqual: string,
  qteG: number,
  apiKey: string,
): Promise<UsdaMicronutriments> {
  const terme = traduire(nomCiqual);

  try {
    const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("query",   terme);
    url.searchParams.set("dataType","Foundation,SR Legacy");
    url.searchParams.set("pageSize","1");

    const res = await fetch(url.toString(), {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(4000), // 4s max pour ne pas ralentir la génération
    });

    if (!res.ok) {
      console.warn(`[USDA] HTTP ${res.status} pour "${terme}"`);
      return { usda_source: "non_trouvé" };
    }

    const data = await res.json();
    const food = data?.foods?.[0];

    if (!food) {
      console.warn(`[USDA] Aucun résultat pour "${terme}" (traduit de "${nomCiqual}")`);
      return { usda_source: "non_trouvé" };
    }

    const nts: Array<{ nutrientId: number; value: number }> =
      food.foodNutrients ?? [];

    // Extraire et scaler chaque nutriment pour la quantité réelle
    const result: UsdaMicronutriments = {
      // Minéraux
      calcium_mg:   scale(getNutrient(nts, USDA_NUTRIENT_IDS.calcium),    qteG),
      fer_mg:       scale(getNutrient(nts, USDA_NUTRIENT_IDS.fer),         qteG),
      magnesium_mg: scale(getNutrient(nts, USDA_NUTRIENT_IDS.magnesium),   qteG),
      potassium_mg: scale(getNutrient(nts, USDA_NUTRIENT_IDS.potassium),   qteG),
      sodium_mg:    scale(getNutrient(nts, USDA_NUTRIENT_IDS.sodium),      qteG),
      zinc_mg:      scale(getNutrient(nts, USDA_NUTRIENT_IDS.zinc),        qteG),
      selenium_ug:  scale(getNutrient(nts, USDA_NUTRIENT_IDS.selenium),    qteG),
      // Vitamines
      vitA_ug:      scale(getNutrient(nts, USDA_NUTRIENT_IDS.vitA),        qteG),
      vitC_mg:      scale(getNutrient(nts, USDA_NUTRIENT_IDS.vitC),        qteG),
      vitD_ug:      scale(getNutrient(nts, USDA_NUTRIENT_IDS.vitD),        qteG),
      vitE_mg:      scale(getNutrient(nts, USDA_NUTRIENT_IDS.vitE),        qteG),
      vitK_ug:      scale(getNutrient(nts, USDA_NUTRIENT_IDS.vitK),        qteG),
      vitB1_mg:     scale(getNutrient(nts, USDA_NUTRIENT_IDS.vitB1),       qteG),
      vitB2_mg:     scale(getNutrient(nts, USDA_NUTRIENT_IDS.vitB2),       qteG),
      vitB3_mg:     scale(getNutrient(nts, USDA_NUTRIENT_IDS.vitB3),       qteG),
      vitB6_mg:     scale(getNutrient(nts, USDA_NUTRIENT_IDS.vitB6),       qteG),
      vitB9_ug:     scale(getNutrient(nts, USDA_NUTRIENT_IDS.vitB9),       qteG),
      vitB12_ug:    scale(getNutrient(nts, USDA_NUTRIENT_IDS.vitB12),      qteG),
      // Acides gras
      agSatures_g:  scale(getNutrient(nts, USDA_NUTRIENT_IDS.agSatures),   qteG),
      omega3_ALA_g: scale(getNutrient(nts, USDA_NUTRIENT_IDS.omega3_ALA),  qteG),
      omega3_EPA_g: scale(getNutrient(nts, USDA_NUTRIENT_IDS.omega3_EPA),  qteG),
      omega3_DHA_g: scale(getNutrient(nts, USDA_NUTRIENT_IDS.omega3_DHA),  qteG),
      // Méta
      usda_food_name:  food.description,
      usda_fdc_id:     food.fdcId,
      usda_data_type:  food.dataType,
      usda_source:     "FDC",
    };

    // Oméga-3 total = ALA + EPA + DHA
    const ala = result.omega3_ALA_g ?? 0;
    const epa = result.omega3_EPA_g ?? 0;
    const dha = result.omega3_DHA_g ?? 0;
    if (ala || epa || dha) {
      result.omega3_total_g = Math.round((ala + epa + dha) * 100) / 100;
    }

    console.log(`[USDA] ✅ "${nomCiqual}" → "${food.description}" (fdcId:${food.fdcId})`);
    return result;

  } catch (err) {
    // Timeout ou erreur réseau → on log et on continue sans bloquer
    console.warn(`[USDA] Erreur pour "${nomCiqual}" :`, err);
    return { usda_source: "non_trouvé" };
  }
}

// ── Enrichissement d'un jour_type complet ────────────────────────────────────
// Appelle lookupUsda pour chaque aliment du jour_type en parallèle
// (Promise.all avec limite pour ne pas saturer l'API FDC)
export async function enrichirJourTypeUsda(
  jourType: any,
  apiKey: string,
): Promise<any> {
  if (!jourType?.repas || !apiKey) return jourType;

  // Collecter tous les aliments à enrichir
  const taches: Array<{
    repasKey: string;
    alimentIdx: number;
    nom: string;
    qte: number;
  }> = [];

  for (const [repasKey, repas] of Object.entries(jourType.repas) as any[]) {
    if (!Array.isArray(repas?.aliments)) continue;
    for (const [i, aliment] of repas.aliments.entries()) {
      if (aliment.nom && aliment.qte) {
        taches.push({ repasKey, alimentIdx: i, nom: aliment.nom, qte: aliment.qte });
      }
    }
  }

  // Exécuter en parallèle par batch de 5 pour respecter les limites API FDC
  const BATCH = 5;
  const resultats = new Map<string, UsdaMicronutrients>();

  for (let i = 0; i < taches.length; i += BATCH) {
    const batch = taches.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(t => lookupUsda(t.nom, t.qte, apiKey))
    );
    batch.forEach((t, j) => {
      if (results[j].usda_source === "FDC") {
        resultats.set(`${t.repasKey}_${t.alimentIdx}`, results[j]);
      }
    });
    // Petite pause entre les batches pour éviter le rate limit
    if (i + BATCH < taches.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  // Injecter les résultats dans le jour_type
  for (const [repasKey, repas] of Object.entries(jourType.repas) as any[]) {
    if (!Array.isArray(repas?.aliments)) continue;
    for (const [i, aliment] of repas.aliments.entries()) {
      const usda = resultats.get(`${repasKey}_${i}`);
      if (usda) aliment.usda = usda;
    }

    // Calculer les totaux micronutriments du repas
    const somme = (key: string) =>
      repas.aliments.reduce((s: number, a: any) => s + (a.usda?.[key] ?? 0), 0);

    const hasMicro = repas.aliments.some((a: any) => a.usda?.usda_source === "FDC");
    if (hasMicro) {
      repas.total_micronutriments = {
        calcium_mg:   +somme("calcium_mg").toFixed(1),
        fer_mg:       +somme("fer_mg").toFixed(2),
        magnesium_mg: +somme("magnesium_mg").toFixed(1),
        potassium_mg: +somme("potassium_mg").toFixed(1),
        vitC_mg:      +somme("vitC_mg").toFixed(1),
        vitD_ug:      +somme("vitD_ug").toFixed(2),
        vitB12_ug:    +somme("vitB12_ug").toFixed(2),
        omega3_total_g: +somme("omega3_total_g").toFixed(3),
      };
    }
  }

  // Total micronutriments de la journée entière
  const totJour: Record<string, number> = {};
  const repasListe = Object.values(jourType.repas) as any[];
  for (const repas of repasListe) {
    if (!repas.total_micronutriments) continue;
    for (const [k, v] of Object.entries(repas.total_micronutriments)) {
      totJour[k] = +(((totJour[k] ?? 0) + (v as number)).toFixed(2));
    }
  }
  if (Object.keys(totJour).length > 0) {
    jourType.total_micronutriments_jour = totJour;
  }

  return jourType;
}

// ── Alias pour compatibilité TS ───────────────────────────────────────────────
export type UsdaMicronutrients = UsdaMicronutriments;
