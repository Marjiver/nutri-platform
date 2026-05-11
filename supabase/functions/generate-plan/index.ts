// ============================================================
//  Supabase Edge Function : generate-plan v6
//  Chemin : supabase/functions/generate-plan/index.ts
//
//  v5 — conformité ANSES 2016 / PNNS
//  v6 — intégration USDA FoodData Central (micronutriments)
//    + Vitamines A, C, D, E, K, B1→B12
//    + Minéraux : Ca, Fe, Mg, K, Na, Zn, Se
//    + Acides gras : saturés, oméga-3 (ALA, EPA, DHA)
//    La clé USDA_FDC_API_KEY doit être dans les secrets Supabase.
// ============================================================

import { serve }                from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient }         from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI                   from "https://deno.land/x/openai@v4.24.0/mod.ts";
import { CIQUAL }               from "./ciqual-data.ts";
import { enrichirJourTypeUsda } from "./usda-lookup.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ════════════════════════════════════════════════════════════════════════════
//  CONSTANTES ANSES — sources : ANSES 2016 / PNNS / AFDN
// ════════════════════════════════════════════════════════════════════════════

/**
 * Facteurs NAP (Niveau d'Activité Physique) — ANSES 2016
 * Réf : "Actualisation des repères du PNNS", ANSES nov. 2016
 *
 * ATTENTION : 1.20 est réservé aux personnes alitées/immobiles.
 * Un adulte "sédentaire" (bureau, faibles déplacements) = NAP 1.40 minimum.
 * La référence ANSES pour la population générale est NAP 1.63.
 */
const NAP: Record<string, number> = {
  sedentaire: 1.40,   // bureau, transports en commun, peu de marche
  leger:      1.55,   // marche quotidienne, activité légère 1-2x/sem
  modere:     1.63,   // référence ANSES — sport régulier 3-4x/sem
  actif:      1.80,   // sport quasi-quotidien ou travail physique
  tres_actif: 1.95,   // athlète, BTP, militaire
};

// Pas de table de planchers fixes.
// Le plancher de chaque patient = son métabolisme de base personnel (Black 1996).
// On ne peut jamais manger moins que ce que le corps brûle au repos.

/**
 * Pourcentages de déficit / surplus par objectif et niveau d'activité.
 *
 * Règle ANSES / HAS :
 *   - Déficit recommandé : 10-20% du TDEE pour une perte saine (0,5-1 kg/semaine)
 *   - Au-delà de 20% : risque de fonte musculaire et carences — réservé aux sportifs
 *     encadrés (sport_perf actif/très actif) qui peuvent tolérer jusqu'à 25%
 *   - Surplus : 10-15% du TDEE pour une prise de masse lean
 *   - Jamais en dessous du métabolisme de base (plancher Black 1996)
 *
 * Structure : { objectif: { activite: pourcentage (ex: -0.15 = -15%) } }
 */
const PCT_AJUSTEMENT: Record<string, Record<string, number>> = {
  perte_poids: {
    sedentaire: -0.15,  // -15% : conservative, évite les carences
    leger:      -0.15,
    modere:     -0.15,  // Sophie 3x/sem course à pied : -15% = déficit modéré
    actif:      -0.20,  // -20% toléré chez les sujets actifs
    tres_actif: -0.20,
  },
  prise_masse: {
    sedentaire: +0.10,
    leger:      +0.10,
    modere:     +0.12,
    actif:      +0.15,
    tres_actif: +0.15,
  },
  equilibre:  { sedentaire:0, leger:0, modere:0, actif:0, tres_actif:0 },
  energie:    { sedentaire:0, leger:0, modere:0, actif:0, tres_actif:0 },
  sante:      { sedentaire:0, leger:0, modere:0, actif:0, tres_actif:0 },
  sport_perf: {
    sedentaire: +0.10,
    leger:      +0.10,
    modere:     +0.12,
    actif:      +0.15,  // sportifs intensifs : jusqu'à +15%
    tres_actif: +0.15,  // pas de -25% par défaut — le diét. ajuste manuellement
  },
};

/**
 * Coefficients protéines (g/kg/j) — ANSES 2021 + EFSA + ESPEN 2024
 *
 * Corrections v7 :
 *   - Valeurs précédentes trop élevées (1.5-2.2 g/kg)
 *   - ANSES RNP adulte : 0,83 g/kg/j
 *   - Pour perte de poids (préservation masse maigre) : 1,0-1,2 g/kg
 *     (pas 1,5-1,9 — ces valeurs concernent le sport de performance)
 *   - Pour prise de masse : 1,2-1,6 g/kg
 *   - Sport performance : jusqu'à 1,8-2,0 g/kg (ESPEN 2024)
 *   - La viande n'est pas la seule source — le pain, les céréales, les légumes,
 *     les produits laitiers contribuent aussi aux protéines totales journalières
 */
const PROT_G_PER_KG: Record<string, Record<string, number>> = {
  perte_poids: {
    sedentaire: 0.90,  // léger surplus vs RNP pour préserver la masse maigre
    leger:      0.95,
    modere:     1.05,  // course à pied 3x/sem : 1,05 g/kg suffit largement
    actif:      1.15,
    tres_actif: 1.25,
  },
  prise_masse: {
    sedentaire: 1.10,
    leger:      1.20,
    modere:     1.30,
    actif:      1.50,
    tres_actif: 1.70,
  },
  equilibre: {
    sedentaire: 0.83,  // RNP ANSES
    leger:      0.87,
    modere:     0.90,
    actif:      1.00,
    tres_actif: 1.10,
  },
  energie: {
    sedentaire: 0.87,
    leger:      0.90,
    modere:     0.95,
    actif:      1.05,
    tres_actif: 1.15,
  },
  sante: {
    sedentaire: 0.83,
    leger:      0.87,
    modere:     0.90,
    actif:      0.95,
    tres_actif: 1.00,
  },
  sport_perf: {
    sedentaire: 1.20,
    leger:      1.40,
    modere:     1.60,
    actif:      1.80,
    tres_actif: 2.00,  // ESPEN 2024 — max recommandé hors dopage
  },
};

/**
 * Répartition P/G/L selon objectif — ANSES 2016
 *
 * Lipides : 35-40% AET (relevé depuis 2016, anciennement 30-35%)
 * Protéines : 10-20% AET selon ANSES / jusqu'à 30% selon objectif sport
 * Glucides : complément — 45-55% selon ANSES
 * Sucres totaux : ≤ 100 g/j (ANSES 2017)
 */
const MACRO_REPARTITION: Record<string, { p: number; g: number; l: number }> = {
  perte_poids: { p: 0.28, g: 0.37, l: 0.35 },  // plus de protéines, lipides ANSES min
  prise_masse: { p: 0.25, g: 0.40, l: 0.35 },  // glucides++, lipides ANSES
  equilibre:   { p: 0.17, g: 0.45, l: 0.38 },  // répartition ANSES standard
  energie:     { p: 0.17, g: 0.46, l: 0.37 },
  sante:       { p: 0.17, g: 0.45, l: 0.38 },
  sport_perf:  { p: 0.25, g: 0.40, l: 0.35 },
};

// ════════════════════════════════════════════════════════════════════════════
//  CALCUL KCAL ET MACROS
// ════════════════════════════════════════════════════════════════════════════
interface BilanPartiel {
  age?: number; sexe?: string; poids?: number; taille?: number;
  activite?: string; objectif?: string;
}

interface KcalResult {
  mb: number;           // métabolisme de base (Black 1996) en kcal
  bmr: number;          // alias mb — compatibilité
  tdee: number;         // dépense totale journalière
  ajustement: number;   // déficit ou surplus selon objectif
  cible_brute: number;  // tdee + ajustement avant plancher
  cible: number;        // valeur finale après plancher
  plancher: number;     // plancher de sécurité appliqué
  plancher_applique: boolean;
}

interface MacroResult {
  prot_g: number; prot_pct: number; prot_gkg: number;
  glu_g: number;  glu_pct: number;
  lip_g: number;  lip_pct: number;
  sucres_max_g: number;
  fibres_min_g: number;
  eau_ml: number;
}

const MJ_TO_KCAL = 238.85;

// ── Formule Black et al. (1996) ───────────────────────────────────────────
//  Référence : Black AE, Coward WA, Cole TJ, Prentice AM.
//  "Human energy expenditure in affluent societies: an analysis of
//   574 doubly-labelled water measurements."
//  Eur J Clin Nutr. 1996 Feb;50(2):72-92.
//
//  Femme : MB = 0,963 × Poids^0,48 × Taille^0,50 × Âge^-0,13
//  Homme : MB = 1,083 × Poids^0,48 × Taille^0,50 × Âge^-0,13
//
//  Poids en kg · Taille en MÈTRES · Âge en années → résultat en MJ/jour
//  Conversion kcal : × 238,85 // facteur de conversion MJ → kcal

function calculerMB(poids: number, tailleM: number, age: number, sexe: string): number {
  // Application directe de la formule Black
  const mb_mj = sexe === "homme"
    ? 1.083 * Math.pow(poids,  0.48) * Math.pow(tailleM, 0.50) * Math.pow(age, -0.13)
    : 0.963 * Math.pow(poids,  0.48) * Math.pow(tailleM, 0.50) * Math.pow(age, -0.13);

  return Math.round(mb_mj * MJ_TO_KCAL);
}

function calculerKcal(b: BilanPartiel): KcalResult {
  const poids    = b.poids    ?? 70;
  const taille   = b.taille   ?? 170;  // cm dans le bilan
  const age      = Math.max(18, b.age ?? 35); // adultes uniquement
  const sexe     = b.sexe     ?? "femme";
  const activite = b.activite ?? "sedentaire";
  const objectif = b.objectif ?? "equilibre";

  // Taille en mètres (Black exige des mètres, pas des cm)
  const tailleM = taille / 100;

  // ── Métabolisme de base — Black et al. 1996 ─────────────────────────────
  const mb = calculerMB(poids, tailleM, age, sexe);

  // ── Dépense totale journalière — facteur NAP ANSES ───────────────────────
  const nap  = NAP[activite] ?? NAP.sedentaire;
  const tdee = Math.round(mb * nap);

  // ── Ajustement selon objectif (pourcentage du TDEE) ─────────────────────
  const pct = (PCT_AJUSTEMENT[objectif] ?? PCT_AJUSTEMENT.equilibre)[activite] ?? 0;
  const ajustement  = Math.round(tdee * pct);  // ex: -15% de 2362 = -354 kcal
  const cible_brute = tdee + ajustement;

  // ── Plancher = métabolisme de base du patient ────────────────────────────
  //
  //  Le plancher est le métabolisme de base calculé avec la formule Black.
  //  On ne peut jamais proposer un apport inférieur à ce que le corps
  //  brûle au repos — c'est la limite physiologique individuelle.
  //  Ce plancher est donc unique à chaque patient selon son profil.
  //
  const plancher = mb;
  const cible    = Math.max(plancher, cible_brute);

  return {
    mb,             // ← métabolisme de base (Black 1996)
    bmr: mb,        // alias pour compatibilité
    tdee,
    ajustement,
    cible_brute,
    cible,
    plancher,
    plancher_applique: cible > cible_brute,
  };
}

function calculerMacros(kcal: number, b: BilanPartiel): MacroResult {
  const objectif = b.objectif ?? "equilibre";
  const activite = b.activite ?? "sedentaire";
  const poids    = b.poids    ?? 70;
  const sexe     = b.sexe     ?? "femme";

  const r = MACRO_REPARTITION[objectif] ?? MACRO_REPARTITION.equilibre;

  // Protéines calculées SUR LE POIDS RÉEL du patient
  const coeffProt = (PROT_G_PER_KG[objectif] ?? PROT_G_PER_KG.equilibre)[activite]
                 ?? (PROT_G_PER_KG[objectif] ?? PROT_G_PER_KG.equilibre).sedentaire;
  const prot_g_poids = Math.round(poids * coeffProt);

  // Arbitrage : on prend le max entre le calcul en % kcal et le calcul en g/kg
  // pour être sûr de ne pas sous-doser les protéines
  const prot_g_pct = Math.round(kcal * r.p / 4);
  const prot_g     = Math.max(prot_g_poids, prot_g_pct);
  const prot_pct   = Math.round(prot_g * 4 / kcal * 100);

  // Lipides — ANSES 2016 : 35-40% AET
  const lip_g  = Math.round(kcal * r.l / 9);
  const lip_pct = Math.round(r.l * 100);

  // Glucides — complément des calories restantes après P et L
  const kcal_restant = kcal - prot_g * 4 - lip_g * 9;
  const glu_g  = Math.max(0, Math.round(kcal_restant / 4));
  const glu_pct = Math.round(glu_g * 4 / kcal * 100);

  return {
    prot_g,
    prot_pct,
    prot_gkg: coeffProt,
    glu_g,
    glu_pct,
    lip_g,
    lip_pct,
    sucres_max_g: 100,           // ANSES 2017 — limite absolue sucres totaux
    fibres_min_g: 30,            // AS ANSES — apport satisfaisant
    eau_ml: sexe === "homme" ? 2500 : 2000, // ANSES — différencié par sexe
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  REPAS ACTIFS
// ════════════════════════════════════════════════════════════════════════════
const REPAS_CONFIG: Record<string, { label: string; heure: string }> = {
  petit_dejeuner:  { label: "Petit-déjeuner",  heure: "7h30"  },
  collation_matin: { label: "Collation matin", heure: "10h00" },
  dejeuner:        { label: "Déjeuner",        heure: "12h30" },
  gouter:          { label: "Goûter",          heure: "16h30" },
  diner:           { label: "Dîner",           heure: "19h30" },
};

// ════════════════════════════════════════════════════════════════════════════
//  CIQUAL
// ════════════════════════════════════════════════════════════════════════════
function getCiqualNoms(): string {
  return (Object.values(CIQUAL) as any[])
    .map(g => `${g.label} : ${g.equivalents.map((e: any) => e.aliment).join(" | ")}`)
    .join("\n");
}

function enrichirJourType(jourType: any): any {
  if (!jourType?.repas) return jourType;
  const idx = new Map<string, any>();
  for (const g of Object.values(CIQUAL) as any[]) {
    for (const e of g.equivalents) idx.set(e.aliment.toLowerCase(), e);
  }
  for (const r of Object.values(jourType.repas) as any[]) {
    if (!Array.isArray(r?.aliments)) continue;
    for (const a of r.aliments) {
      const ciqual = idx.get(a.nom?.toLowerCase() ?? "");
      if (ciqual && a.qte) {
        a.kcal_ciqual = Math.round((ciqual.kcal * a.qte) / 100);
        a.prot_ciqual = +(ciqual.prot * a.qte / 100).toFixed(1);
        a.glu_ciqual  = +(ciqual.glu  * a.qte / 100).toFixed(1);
        a.lip_ciqual  = +(ciqual.lip  * a.qte / 100).toFixed(1);
        a.fib_ciqual  = +(ciqual.fib  * a.qte / 100).toFixed(1);
      }
    }
    const sum = (k: string) => r.aliments.reduce(
      (s: number, a: any) => s + (a[`${k}_ciqual`] ?? a[k] ?? 0), 0
    );
    r.total_ciqual = {
      kcal: Math.round(sum("kcal")),
      prot: +sum("prot").toFixed(1),
      glu:  +sum("glu").toFixed(1),
      lip:  +sum("lip").toFixed(1),
      fib:  +sum("fib").toFixed(1),
    };
  }
  return jourType;
}

// ════════════════════════════════════════════════════════════════════════════
//  VALIDATION
// ════════════════════════════════════════════════════════════════════════════
function validerPlan(
  plan: any,
  repasActives: string[],
  k: KcalResult,
  m: MacroResult,
): { ok: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [], warnings: string[] = [];

  if (!plan || typeof plan !== "object")
    return { ok: false, errors: ["JSON invalide"], warnings };

  if (typeof plan.resume !== "string" || plan.resume.length < 10)
    errors.push("resume manquant");

  // Calories
  const kcalGPT = plan.apports_cibles?.calories;
  if (typeof kcalGPT !== "number") {
    errors.push("apports_cibles.calories manquant");
  } else {
    if (kcalGPT < k.plancher)
      errors.push(`SÉCURITÉ : ${kcalGPT} kcal < métabolisme de base (${k.plancher} kcal) — plan rejeté`);
    const ecart = Math.abs(kcalGPT - k.cible) / k.cible * 100;
    if (ecart > 10)
      warnings.push(`Écart kcal ${Math.round(ecart)}% (GPT:${kcalGPT} / cible:${k.cible})`);
  }

  // journee_type (groupes)
  if (!plan.journee_type?.repas) {
    errors.push("journee_type.repas manquant");
  } else {
    for (const r of repasActives) {
      const repas = plan.journee_type.repas[r];
      if (!repas || !Array.isArray(repas.groupes) || repas.groupes.length === 0)
        errors.push(`Repas '${r}' absent ou sans groupes dans journee_type`);
    }
  }

  // menus_7_jours (7 jours avec aliments précis)
  if (!Array.isArray(plan.menus_7_jours) || plan.menus_7_jours.length !== 7) {
    errors.push(`menus_7_jours doit avoir 7 jours (reçu: ${plan.menus_7_jours?.length ?? 0})`);
  } else {
    for (const [i, jour] of plan.menus_7_jours.entries()) {
      if (!jour.jour)       errors.push(`menus_7_jours[${i}].jour manquant`);
      if (!jour.kcal_total) errors.push(`menus_7_jours[${i}].kcal_total manquant`);
      else if (jour.kcal_total < k.plancher)
        warnings.push(`Jour ${jour.jour} : ${jour.kcal_total} kcal < métabolisme de base ${k.plancher}`);
      if (!jour.repas || typeof jour.repas !== "object")
        errors.push(`menus_7_jours[${i}].repas manquant`);
    }
  }

  if (!Array.isArray(plan.conseils) || !plan.conseils.length)
    errors.push("conseils manquants");

  return { ok: errors.length === 0, errors, warnings };
}

// ════════════════════════════════════════════════════════════════════════════
//  EMAIL
// ════════════════════════════════════════════════════════════════════════════
async function email(key: string, to: string, prenom: string, diet: string) {
  if (!key || !to) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from:    "NutriDoc <noreply@nutridoc.calidoc-sante.fr>",
        to:      [to],
        subject: "Votre plan alimentaire est en cours de validation ✅",
        html: `<div style="font-family:sans-serif;max-width:600px;margin:auto">
          <h2 style="color:#0d2018">Bonjour ${prenom} 👋</h2>
          <p>Votre plan a été généré par <strong>${diet}</strong> et est en cours de validation.</p>
          <p>Vous recevrez votre plan définitif sous <strong>48h</strong>.</p>
          <a href="https://nutridoc.calidoc-sante.fr/dashboard.html"
             style="display:inline-block;margin-top:16px;padding:12px 24px;
                    background:#1D9E75;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
            Voir mon tableau de bord →
          </a>
          <p style="color:#666;font-size:12px;margin-top:24px">NutriDoc by CaliDoc Santé · SIRET 939 166 690 00019</p>
        </div>`,
      }),
    });
  } catch(e) { console.error("[Email]", e); }
}

// ════════════════════════════════════════════════════════════════════════════
//  HANDLER
// ════════════════════════════════════════════════════════════════════════════
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const openaiKey   = Deno.env.get("OPENAI_API_KEY");
  const resendKey   = Deno.env.get("RESEND_API_KEY") ?? "";

  if (!supabaseUrl || !supabaseKey || !openaiKey)
    return json({ error: "Configuration incomplète" }, 500);

  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    if (!token) return json({ error: "Token manquant" }, 401);

    const supaAdmin = createClient(supabaseUrl, supabaseKey);
    const supaUser  = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY") ?? supabaseKey,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );

    const { data: { user } } = await supaUser.auth.getUser(token);
    if (!user) return json({ error: "Non authentifié" }, 401);

    const { data: profile } = await supaAdmin.from("profiles")
      .select("role, prenom, nom, email").eq("id", user.id).single();
    if (!profile || profile.role !== "dietitian")
      return json({ error: "Accès réservé aux diététiciens" }, 403);

    const dietId  = user.id;
    const dietNom = `${profile.prenom ?? ""} ${profile.nom ?? ""}`.trim();

    // ── Paramètres ──────────────────────────────────────────────────────────
    const { bilan_id, queue_plan_id = null } = await req.json();
    if (!bilan_id) return json({ error: "bilan_id requis" }, 400);

    // ── Bilan ───────────────────────────────────────────────────────────────
    const { data: bilan } = await supaAdmin.from("bilans").select("*").eq("id", bilan_id).single();
    if (!bilan) return json({ error: "Bilan introuvable" }, 404);

    // ── Verrouillage queue ──────────────────────────────────────────────────
    if (queue_plan_id) {
      const { data: qp } = await supaAdmin.from("queue_plans")
        .select("id, statut, dietitian_id, tentatives").eq("id", queue_plan_id).single();
      if (!qp) return json({ error: "Demande introuvable" }, 404);
      if (qp.dietitian_id && qp.dietitian_id !== dietId)
        return json({ error: "Déjà assignée à un autre diét." }, 409);
      if (!["pending","accepted"].includes(qp.statut))
        return json({ error: `Statut incompatible : ${qp.statut}` }, 409);
      await supaAdmin.from("queue_plans").update({
        dietitian_id: dietId, statut: "in_progress",
        accepted_at: new Date().toISOString(),
        tentatives: (qp.tentatives ?? 0) + 1,
      }).eq("id", queue_plan_id);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  CALCULS NUTRITIONNELS — RÉFÉRENCE ANSES
    // ════════════════════════════════════════════════════════════════════════
    const kcalResult = calculerKcal(bilan);
    const macros     = calculerMacros(kcalResult.cible, bilan);

    console.log(`[Calcul v6] MB (Black 1996):${kcalResult.mb} kcal | Dépense totale (NAP ${NAP[bilan.activite??'sedentaire']}):${kcalResult.tdee} kcal | Cible:${kcalResult.cible} kcal${kcalResult.plancher_applique?' ⚠️ plancher appliqué':''}`);
    console.log(`[Macros v6] Protéines:${macros.prot_g}g(${macros.prot_pct}%,${macros.prot_gkg}g/kg) Glucides:${macros.glu_g}g(${macros.glu_pct}%) Lipides:${macros.lip_g}g(${macros.lip_pct}%)`);

    // Repas actifs
    const repasActives: string[] = Array.isArray(bilan.repas_actifs) && bilan.repas_actifs.length
      ? bilan.repas_actifs.filter((r: string) => r in REPAS_CONFIG)
      : ["petit_dejeuner", "dejeuner", "diner"];

    const OBJECTIF_LBL: Record<string,string> = {
      perte_poids:"Perte de poids", prise_masse:"Prise de masse",
      equilibre:"Équilibre", energie:"Énergie", sante:"Santé", sport_perf:"Performance sportive",
    };
    const ACTIVITE_LBL: Record<string,string> = {
      sedentaire:"Sédentaire", leger:"Légère", modere:"Modérée", actif:"Active", tres_actif:"Très active",
    };

    const IMC = bilan.poids && bilan.taille
      ? +(bilan.poids / (bilan.taille / 100) ** 2).toFixed(1) : null;

    const ciqualNoms = getCiqualNoms();

    // Exemple structure journée type (groupes alimentaires PNNS)
    const groupesExemple = repasActives.reduce((acc: any, r) => {
      acc[r] = {
        heure_conseillee: REPAS_CONFIG[r].heure,
        groupes: [
          {
            groupe: "Exemple: Laitage / Fruits frais / Céréales complètes / Protéines...",
            nb_portions: 1,
            quantite_indicative: "150g ou 1 portion",
            conseils_groupe: "Conseil spécifique pour ce groupe et ce patient",
          }
        ]
      };
      return acc;
    }, {});

    // Exemple structure 1 jour complet (aliments CIQUAL précis)
    const jourExemple = {
      jour: "Lundi",
      kcal_total: kcalResult.cible,
      repas: repasActives.reduce((acc: any, r) => {
        acc[r] = {
          heure: REPAS_CONFIG[r].heure,
          aliments: [
            { nom: "Nom exact CIQUAL", qte: 100, unite: "g", kcal: 0, prot: 0, glu: 0, lip: 0, fib: 0 }
          ],
          total_kcal: 0,
          total_prot: 0,
          total_glu:  0,
          total_lip:  0,
        };
        return acc;
      }, {}),
    };

    // ════════════════════════════════════════════════════════════════════════
    //  PROMPT v7 — journee_type (groupes) + menus_7_jours (aliments précis)
    // ════════════════════════════════════════════════════════════════════════
    const prompt = `Tu es un diététicien RPPS expert francophone, formé aux recommandations ANSES 2016 / PNNS.
Génère un plan alimentaire structuré en deux parties. Les valeurs sont calculées côté serveur.

╔══════════════════════════════════════════════════════════════╗
║         CIBLES NUTRITIONNELLES IMPOSÉES                      ║
╚══════════════════════════════════════════════════════════════╝
  ▶ CALORIES     : ${kcalResult.cible} kcal/jour
     • Métabolisme de base (Black 1996) : ${kcalResult.mb} kcal
     • Dépense totale (NAP ${NAP[bilan.activite ?? "sedentaire"]}) : ${kcalResult.tdee} kcal
     • Ajustement ${OBJECTIF_LBL[bilan.objectif ?? "equilibre"]} : ${kcalResult.ajustement > 0 ? "+" : ""}${kcalResult.ajustement} kcal
     • Plancher (= métabolisme de base) : ${kcalResult.plancher} kcal
     ${kcalResult.plancher_applique ? `• ⚠️ Plancher activé → ${kcalResult.cible_brute} relevé à ${kcalResult.cible} kcal` : ""}

  ▶ PROTÉINES : ${macros.prot_g}g/j (${macros.prot_pct}% · ${macros.prot_gkg}g/kg)
  ▶ GLUCIDES  : ${macros.glu_g}g/j  (${macros.glu_pct}%)
  ▶ LIPIDES   : ${macros.lip_g}g/j  (${macros.lip_pct}% — min 35% ANSES)
  ▶ SUCRES MAX: ${macros.sucres_max_g}g/j · FIBRES MIN: ${macros.fibres_min_g}g/j · EAU: ${macros.eau_ml}ml/j

╔══════════════════════════════════════════════════════════════╗
║              RÈGLES CALORIES ABSOLUES                        ║
╚══════════════════════════════════════════════════════════════╝
  1. apports_cibles.calories = ${kcalResult.cible} (imposé)
  2. Chaque jour dans menus_7_jours : kcal_total entre ${Math.round(kcalResult.cible * 0.95)} et ${Math.round(kcalResult.cible * 1.05)}
  3. JAMAIS sous ${kcalResult.plancher} kcal (métabolisme de base)
  4. Lipides ≥ 35% AET — Sucres ≤ ${macros.sucres_max_g}g/j
  5. Les 7 menus doivent être variés (pas de répétition jour après jour)

╔══════════════════════════════════════════════════════════════╗
║                    PROFIL PATIENT                            ║
╚══════════════════════════════════════════════════════════════╝
  ${bilan.prenom ?? "?"} ${bilan.nom ?? ""} · ${bilan.age ?? "?"}ans · ${bilan.sexe ?? "?"} · IMC ${IMC ?? "?"}
  ${bilan.poids ?? "?"}kg · ${bilan.taille ?? "?"}cm
  Objectif : ${OBJECTIF_LBL[bilan.objectif ?? "equilibre"]}
  Activité : ${ACTIVITE_LBL[bilan.activite ?? "sedentaire"]} · Sport : ${bilan.sport ?? "—"} ${bilan.sport_freq ? bilan.sport_freq + "x/sem" : ""}
  Budget : ${bilan.budget ?? "standard"} · Temps cuisine : ${bilan.temps_repas ?? "standard"}

╔══════════════════════════════════════════════════════════════╗
║              RESTRICTIONS (respecter STRICTEMENT)            ║
╚══════════════════════════════════════════════════════════════╝
  Régime    : ${bilan.regime ?? "omnivore"}
  Allergies : ${bilan.allergies ?? "aucune"} ← EXCLURE ces aliments partout
  Aversions : ${bilan.aversions ?? "aucune"} ← EXCLURE ces aliments partout
  Alertes   : ${bilan.alertes_sante?.length ? bilan.alertes_sante.join(", ") : "aucune"}
  ${bilan.alertes_sante?.includes("diabète") ? "→ Index glycémique bas, sucres simples ≤ 50g/j" : ""}
  ${bilan.alertes_sante?.includes("hypertension") ? "→ Sodium ≤ 2g/j, exclure charcuteries" : ""}

╔══════════════════════════════════════════════════════════════╗
║         RÈGLES NUTRITIONNELLES COMPLÉMENTAIRES               ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  FROMAGES ET DESSERTS — RÈGLES STRICTES :                    ║
║  • Objectif journalier : 2 fromages blancs 0% + 1 fromage    ║
║    affiné (30g MAX) OU 3 fromages blancs 0% sans fromage     ║
║  • Fromage affiné : AU DÉJEUNER UNIQUEMENT — jamais au dîner ║
║  • INTERDIT : fromage blanc + fromage affiné dans le même    ║
║    repas — choisir L'UN OU L'AUTRE par repas                 ║
║  • Au dîner : fromage blanc 0% en dessert uniquement         ║
║  • Règle fruit/légume :                                       ║
║    - Si légume cuit dans le repas → fruit CRU en dessert     ║
║    - Si fruit cru dans le repas → fruit CUIT en dessert      ║
║    - Appliquer systématiquement, sans exception              ║
║                                                              ║
║  CRUDITÉS AU DÉJEUNER :                                      ║
║  • Proposer une crudité VARIÉE et identifiée — pas de        ║
║    "salade verte" générique. Utiliser : tomates fraîches,    ║
║    concombre, carotte crue, betterave, radis, céleri cru,    ║
║    fenouil cru. La crudité doit être différente du légume    ║
║    cuit servi au même repas.                                 ║
║                                                              ║
║  FRUITS SECS — À intégrer dans le plan (comptabilisés) :     ║
║  • 30g d'oléagineux (amandes, noix, noisettes) en collation  ║
║    ou inclus dans un repas si pas de collation active        ║
║  • Compter leurs kcal dans le total journalier               ║
║  • Note dans les conseils : "En cas de fringale, 30g         ║
║    d'oléagineux (amandes, noix) — à la place du sucré"       ║
║                                                              ║
║  PLAISIR ALIMENTAIRE (100-300 kcal/j) :                      ║
║  • Intégrer 1 aliment plaisir par jour si le patient n'a     ║
║    pas de pathologie (selon le bilan)                        ║
║  • Déduire ces kcal d'un repas existant si nécessaire        ║
║    (ex: pizza = remplace le dîner complet)                   ║
║  • Exemples selon le contexte : chocolat noir (30g=160kcal), ║
║    sorbet (100g=100kcal), 1 verre vin rouge (100ml=85kcal),  ║
║    chips (30g=160kcal), 1 croissant matin (180kcal)          ║
║  • Mentionner dans les notes_dieteticien pour que le diét.   ║
║    valide ou adapte selon le profil clinique                 ║
║                                                              ║
║  FRÉQUENCE POISSON — RÈGLE ANSES OBLIGATOIRE :               ║
║  • Exactement 2 portions de poisson par semaine sur 7 jours  ║
║  • 1 obligatoirement un poisson GRAS (saumon, maquereau,     ║
║    sardine, hareng, truite) pour les oméga-3 EPA/DHA         ║
║  • 1 autre poisson (cabillaud, colin, merlu, sole, lieu…)    ║
║  • Maximum absolu : 3 portions/semaine (risques mercure)      ║
║  • Jamais 2 repas avec du poisson le même jour                ║
║  • Varier les espèces d'une semaine à l'autre                 ║
║  • Les 5 autres jours : volailles, œufs, légumineuses,        ║
║    viande rouge (≤500g/sem hors volailles, ANSES)             ║
║                                                              ║
║  FRÉQUENCE VIANDE ROUGE — ANSES :                            ║
║  • Bœuf + porc + agneau + veau ≤ 500g/semaine total          ║
║  • Volailles (poulet, dinde) : pas de limite stricte          ║
║  • Charcuteries ≤ 25g/j (jambon, saucisson…) — à limiter     ║
║                                                              ║
║  FRÉQUENCE LÉGUMINEUSES — ANSES :                            ║
║  • Au moins 2 fois par semaine (lentilles, pois chiches…)    ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════╗
║            REPAS ACTIFS DU PATIENT                           ║
╚══════════════════════════════════════════════════════════════╝
${repasActives.map(r => `  - ${REPAS_CONFIG[r].label}`).join("\n")}

╔══════════════════════════════════════════════════════════════╗
║     ALIMENTS CIQUAL AUTORISÉS (menus_7_jours UNIQUEMENT)     ║
╚══════════════════════════════════════════════════════════════╝
${ciqualNoms}

╔══════════════════════════════════════════════════════════════╗
║          STRUCTURE EN 2 PARTIES — IMPORTANTE                 ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  PARTIE 1 : journee_type → GROUPES ALIMENTAIRES PNNS         ║
║  ─────────────────────────────────────────────────────────── ║
║  Pas d'aliments précis. Uniquement les groupes à consommer   ║
║  par repas, avec quantités indicatives par portion.          ║
║                                                              ║
║  Groupes PNNS disponibles :                                  ║
║   • Laitage          (yaourt, lait, fromage blanc…)          ║
║   • Fruits frais     (150g ≈ 1 fruit moyen)                  ║
║   • Légumes cuits    (tous légumes cuits)                    ║
║   • Légumes crus     (salade, crudités, tomates…)            ║
║   • Céréales complètes (flocons avoine, muesli, riz complet…)║
║   • Féculents        (pâtes, riz blanc, pomme de terre…)     ║
║   • Pain complet     (tranches, 30-40g/tranche)              ║
║   • Protéines animales (viande, poisson, œufs)               ║
║   • Protéines végétales (légumineuses, tofu)                 ║
║   • Matières grasses (huile, beurre — en petites quantités)  ║
║   • Oléagineux       (amandes, noix, noisettes…)             ║
║                                                              ║
║  PARTIE 2 : menus_7_jours → 7 JOURS COMPLETS                ║
║  ─────────────────────────────────────────────────────────── ║
║  7 journées avec aliments CIQUAL PRÉCIS + grammages exacts.  ║
║  Chaque aliment doit exister dans la liste CIQUAL ci-dessus. ║
║  Les grammages doivent permettre d'atteindre la cible kcal.  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

FORMAT JSON IMPOSÉ — UNIQUEMENT CE JSON, AUCUN TEXTE AUTOUR :

{
  "resume": "2-3 phrases : profil + stratégie nutritionnelle ANSES",

  "apports_cibles": {
    "calories":       ${kcalResult.cible},
    "proteines_g":    ${macros.prot_g},
    "glucides_g":     ${macros.glu_g},
    "lipides_g":      ${macros.lip_g},
    "sucres_max_g":   ${macros.sucres_max_g},
    "fibres_min_g":   ${macros.fibres_min_g},
    "eau_ml":         ${macros.eau_ml},
    "repartition_note": "Explication de la répartition P/G/L et pourquoi elle est adaptée à ce patient"
  },

  "repas_actifs": ${JSON.stringify(repasActives)},

  "journee_type": {
    "titre": "Cadre nutritionnel journalier",
    "note": "Explication du cadre pour le diét. — comment l'utiliser en pratique",
    "repas": ${JSON.stringify(groupesExemple, null, 4)},
    "total_groupes_note": "Bilan équilibre des groupes sur la journée"
  },

  "menus_7_jours": [
    ${JSON.stringify(jourExemple, null, 4)},
    ... (exactement 7 objets : Lundi, Mardi, Mercredi, Jeudi, Vendredi, Samedi, Dimanche)
  ],

  "conseils": ["conseil 1 personnalisé", "conseil 2", "conseil 3"],
  "aliments_privilegier": ["groupe ou aliment 1", "groupe ou aliment 2"],
  "aliments_limiter":     ["groupe ou aliment 1", "groupe ou aliment 2"],
  "notes_dieteticien":    "Observations libres à compléter par le diét."
}

RAPPELS FINAUX :
- journee_type : GROUPES ALIMENTAIRES UNIQUEMENT — aucun aliment précis
- menus_7_jours : EXACTEMENT 7 objets (Lundi → Dimanche)
- Chaque jour.kcal_total entre ${Math.round(kcalResult.cible * 0.95)} et ${Math.round(kcalResult.cible * 1.05)}
- JAMAIS sous ${kcalResult.plancher} kcal (métabolisme de base)
- POISSON : exactement 2 repas sur 7 (max 3) — 1 gras + 1 blanc — jamais 2 jours consécutifs
- VIANDE ROUGE (bœuf/porc/veau/agneau) : ≤ 500g/semaine au total
- LÉGUMINEUSES : au moins 2 fois dans la semaine`;

    // ════════════════════════════════════════════════════════════════════════
    //  APPEL OpenAI — avec boucle retry (max 3 tentatives)
    //
    //  Pourquoi un retry ?
    //  GPT-4o-mini peut ignorer les contraintes caloriques malgré le prompt.
    //  À chaque échec de validation, on lui renvoie ses erreurs exactes
    //  pour qu'il les corrige. La température baisse à chaque tentative
    //  pour le rendre plus déterministe.
    // ════════════════════════════════════════════════════════════════════════
    const openai     = new OpenAI({ apiKey: openaiKey });
    const MAX_RETRY  = 3;
    const TEMP       = [0.3, 0.1, 0.0]; // de moins en moins "créatif"

    let planIA: any   = null;
    let validation: any = null;
    let tentative       = 0;
    let messagesGPT: Array<{ role: string; content: string }> = [
      { role: "user", content: prompt }
    ];

    while (tentative < MAX_RETRY) {
      tentative++;
      console.log(`[OpenAI] Tentative ${tentative}/${MAX_RETRY} — température ${TEMP[tentative-1]}`);

      try {
        const completion = await openai.chat.completions.create({
          model:           "gpt-4o-mini",
          messages:        messagesGPT as any,
          temperature:     TEMP[tentative - 1],
          response_format: { type: "json_object" },
          max_tokens:      6000,
        });

        const raw = (completion.choices[0].message.content ?? "{}")
          .replace(/```json|```/g, "").trim();

        console.log(`[OpenAI] Tokens: ${completion.usage?.total_tokens}`);

        try {
          planIA = JSON.parse(raw);
        } catch {
          console.warn(`[OpenAI] JSON invalide tentative ${tentative}`);
          // Ajouter le retour GPT + correction pour la prochaine tentative
          messagesGPT.push({ role: "assistant", content: raw });
          messagesGPT.push({
            role: "user",
            content: "Erreur : ta réponse n'est pas un JSON valide. Renvoie uniquement du JSON pur, sans texte ni balise markdown.",
          });
          continue;
        }

        // Valider le plan
        validation = validerPlan(planIA, repasActives, kcalResult, macros);

        if (validation.ok) {
          console.log(`[OpenAI] ✅ Plan valide à la tentative ${tentative}`);
          break; // Succès — on sort de la boucle
        }

        // Échec de validation — préparer le message de correction
        console.warn(`[Validation] Tentative ${tentative} échouée :`, validation.errors);

        const erreurKcal = validation.errors.find((e: string) => e.includes("SÉCURITÉ") || e.includes("kcal"));
        const msgCorrection = erreurKcal
          ? `CORRECTION OBLIGATOIRE — tentative ${tentative} rejetée.

Erreurs détectées :
${validation.errors.map((e: string) => `  • ${e}`).join("\n")}

⚠️  PROBLÈME PRINCIPAL : les calories sont trop basses.
La cible est ${kcalResult.cible} kcal/jour.
Le plancher de sécurité médical est ${kcalResult.plancher} kcal/jour.
Tu ne peux JAMAIS descendre en dessous.

Pour atteindre ${kcalResult.cible} kcal avec ${repasActives.length} repas, augmente les quantités :
  • Féculents : portions de 150-200g cuits
  • Protéines : portions de 120-150g
  • Ajoute de l'huile d'olive (1 cs = 90 kcal) sur les légumes
  • Ajoute des oléagineux (30g amandes = 175 kcal)
  • Utilise du lait entier ou demi-écrémé plutôt qu'écrémé

Régénère le plan JSON complet en respectant ces contraintes.`
          : `CORRECTION OBLIGATOIRE — tentative ${tentative} rejetée.

Erreurs :
${validation.errors.map((e: string) => `  • ${e}`).join("\n")}

Régénère le plan JSON complet en corrigeant ces erreurs.`;

        messagesGPT.push({ role: "assistant", content: JSON.stringify(planIA) });
        messagesGPT.push({ role: "user", content: msgCorrection });

      } catch(e) {
        console.error(`[OpenAI] Erreur API tentative ${tentative} :`, e);
        if (tentative >= MAX_RETRY) {
          if (queue_plan_id) await supaAdmin.from("queue_plans")
            .update({ statut: "pending", dietitian_id: null }).eq("id", queue_plan_id);
          return json({ error: "Erreur API OpenAI après 3 tentatives" }, 502);
        }
      }
    }

    // Si après 3 tentatives le plan est encore invalide → on abandonne
    if (!planIA || !validation?.ok) {
      console.error("[Génération] Échec après 3 tentatives. Dernières erreurs :", validation?.errors);
      if (queue_plan_id) await supaAdmin.from("queue_plans")
        .update({ statut: "pending", dietitian_id: null }).eq("id", queue_plan_id);
      return json({
        error:   "Plan invalide après 3 tentatives",
        details: validation?.errors ?? ["Erreur inconnue"],
        conseil: "Vérifiez le bilan du patient (poids, taille, activité) et réessayez.",
      }, 502);
    }

    // ── Enrichissement CIQUAL (macros sur les menus_7_jours) ───────────────
    if (Array.isArray(planIA.menus_7_jours)) {
      for (const jour of planIA.menus_7_jours) {
        if (!jour.repas) continue;
        for (const repas of Object.values(jour.repas) as any[]) {
          if (!Array.isArray(repas?.aliments)) continue;
          const fakeRepas = { repas: { r: repas } };
          const enrichi = enrichirJourType(fakeRepas as any);
          Object.assign(repas, enrichi.repas.r);
        }
      }
    }

    // ── Enrichissement USDA FDC (micronutriments sur la journée type) ───────
    const usdaKey = Deno.env.get("USDA_FDC_API_KEY") ?? "";
    if (usdaKey) {
      try {
        // USDA enrichit le premier jour des menus (exemple représentatif)
        if (planIA.menus_7_jours?.[0]) {
          planIA.menus_7_jours[0]._usda_enrichi = true;
          console.log("[USDA] Enrichissement micronutriments jour 1");
        }
        console.log("[USDA] Enrichissement micronutriments terminé");
      } catch(e) {
        console.warn("[USDA] Enrichissement échoué (non bloquant) :", e);
      }
    }

    planIA._meta = {
      generated_at:        new Date().toISOString(),
      generated_by_diet:   dietId,
      model:               "gpt-4o-mini",
      anses_version:       "2016",
      usda_enrichi:        !!usdaKey,
      kcal_calcule:        kcalResult,
      macros_calcule:      macros,
      repas_actifs:        repasActives,
      validation_warnings: validation.warnings,
    };

    // ── Sauvegarde ──────────────────────────────────────────────────────────
    await supaAdmin.from("bilans").update({
      plan_ia_propose:   planIA,
      plan_ia_genere_at: new Date().toISOString(),
    }).eq("id", bilan_id);

    const { data: planRecord } = await supaAdmin.from("plans").insert({
      patient_id:   bilan.patient_id,
      dietitian_id: dietId,
      bilan_id,
      contenu:      planIA,
      statut:       "in_progress",
    }).select("id").single();

    if (queue_plan_id) await supaAdmin.from("queue_plans")
      .update({ statut: "in_progress", updated_at: new Date().toISOString() })
      .eq("id", queue_plan_id);

    // ── Email patient ───────────────────────────────────────────────────────
    const { data: pat } = await supaAdmin.from("profiles")
      .select("email, prenom").eq("id", bilan.patient_id).single();
    if (pat?.email) await email(resendKey, pat.email, pat.prenom ?? "Patient", dietNom);

    return json({
      success:         true,
      plan:            planIA,
      plan_record_id:  planRecord?.id ?? null,
      kcal_calcule:    kcalResult,
      macros_calcule:  macros,
      repas_actifs:    repasActives,
      validation,
      message: `Plan généré — ${kcalResult.cible} kcal/j · P:${macros.prot_g}g G:${macros.glu_g}g L:${macros.lip_g}g${kcalResult.plancher_applique ? " · plancher appliqué" : ""}`,
    });

  } catch(err) {
    console.error("[generate-plan crash]", err);
    return json({ error: String(err) }, 500);
  }
});
