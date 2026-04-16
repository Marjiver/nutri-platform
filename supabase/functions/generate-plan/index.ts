// ============================================================
//  Supabase Edge Function : generate-plan (OpenAI + CIQUAL)
//  Chemin : supabase/functions/generate-plan/index.ts
//
//  Variables d'environnement requises :
//    OPENAI_API_KEY
//    SUPABASE_URL (fournie automatiquement)
//    SUPABASE_SERVICE_ROLE_KEY (fournie automatiquement)
// ============================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://deno.land/x/openai@v4.24.0/mod.ts";
import { CIQUAL } from "./ciqual-data.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Génère un résumé des aliments CIQUAL pour le prompt (limité pour ne pas exploser le contexte)
function getCiqualSummary(): string {
  const summary: string[] = [];
  for (const group of Object.values(CIQUAL)) {
    const aliments = group.equivalents.slice(0, 8).map((e: any) => e.aliment).join(", ");
    summary.push(`**${group.label}** : ${aliments}...`);
  }
  return summary.join("\n");
}

// Enrichissement optionnel du plan avec les données CIQUAL (ex. ajouter kcal estimé)
function enrichirAvecCiqual(plan: any): any {
  if (!plan.semaine) return plan;
  for (const jour of plan.semaine) {
    for (const repas of ["matin", "collation_matin", "midi", "collation_soir", "soir"]) {
      const item = jour[repas];
      if (item?.description) {
        const mots = item.description.toLowerCase().split(/\s+/);
        let found = null;
        for (const grp of Object.values(CIQUAL)) {
          found = grp.equivalents.find((e: any) =>
            mots.some((m: string) => e.aliment.toLowerCase().includes(m) && m.length > 3)
          );
          if (found) break;
        }
        if (found) {
          item.ciqual_ref = found.aliment;
          item.kcal_estime = found.kcal;
        }
      }
    }
  }
  return plan;
}

serve(async (req) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { bilan_id } = await req.json();
    if (!bilan_id) {
      return new Response(JSON.stringify({ error: "bilan_id requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Auth Supabase avec support de la clé service_role ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY")!;

    const supa = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "") || "";

    let isServiceRole = false;
    let userId: string | null = null;

    // Si le token correspond à la clé service_role, on bypass l'auth
    if (token === supabaseKey) {
      isServiceRole = true;
    } else {
      // Vérification normale par JWT
      const { data: { user }, error: userError } = await supa.auth.getUser(token);
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Non authentifié" }), {
          status: 401,
          headers: corsHeaders,
        });
      }
      userId = user.id;

      // Vérification du rôle (uniquement pour les utilisateurs normaux)
      const { data: profile } = await supa.from("profiles").select("role").eq("id", userId).single();
      if (!profile || !["dietitian", "prescriber"].includes(profile.role)) {
        return new Response(JSON.stringify({ error: "Accès refusé" }), {
          status: 403,
          headers: corsHeaders,
        });
      }
    }

    // ── Récupérer le bilan ─────────────────────────────────
    const { data: bilan, error: bilanErr } = await supa
      .from("bilans")
      .select("*")
      .eq("id", bilan_id)
      .single();

    if (bilanErr || !bilan) {
      return new Response(JSON.stringify({ error: "Bilan introuvable" }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    // ── Construire le prompt (avec CIQUAL) ─────────────────
    const IMC = bilan.poids && bilan.taille
      ? Math.round(bilan.poids / Math.pow(bilan.taille / 100, 2) * 10) / 10
      : null;

    const OBJECTIF_LABELS: Record<string, string> = {
      perte_poids: "Perte de poids / de gras",
      prise_masse: "Prise de masse musculaire",
      equilibre:   "Alimentation équilibrée",
      energie:     "Amélioration de l'énergie",
      sante:       "Prévention santé",
      sport_perf:  "Performance sportive",
    };

    const ACTIVITE_LABELS: Record<string, string> = {
      sedentaire:  "Sédentaire",
      leger:       "Légèrement actif (1-2x/semaine)",
      modere:      "Modérément actif (3-4x/semaine)",
      actif:       "Très actif (5+x/semaine)",
      tres_actif:  "Extrêmement actif",
    };

    const ciqualSummary = getCiqualSummary();

    const prompt = `Tu es un diététicien RPPS expert. Génère une proposition de plan alimentaire sur 7 jours pour ce patient.

═══ PROFIL PATIENT ═══
Prénom / Nom : ${bilan.prenom || "?"} ${bilan.nom || ""}
Âge : ${bilan.age || "?"} ans | Sexe : ${bilan.sexe || "?"}
Ville : ${bilan.ville || "?"}

═══ MORPHOLOGIE ═══
Taille : ${bilan.taille || "?"}cm | Poids : ${bilan.poids || "?"}kg
Poids objectif : ${bilan.poids_objectif ? bilan.poids_objectif + "kg" : "non précisé"}
IMC calculé : ${IMC || "inconnu"}

═══ OBJECTIF & ACTIVITÉ ═══
Objectif : ${OBJECTIF_LABELS[bilan.objectif] || bilan.objectif || "équilibre"}
Niveau d'activité : ${ACTIVITE_LABELS[bilan.activite] || bilan.activite || "non précisé"}
Sport pratiqué : ${bilan.sport || "non précisé"}
Fréquence sport : ${bilan.sport_freq ? bilan.sport_freq + "x/semaine" : "—"}
Durée par séance : ${bilan.sport_duree ? bilan.sport_duree + " min" : "—"}

═══ MODE DE VIE ═══
Travail : ${bilan.travail || "non précisé"}
Sommeil : ${bilan.sommeil || "non précisé"}
Hydratation : ${bilan.hydratation || "non précisé"}
Tabagisme : ${bilan.tabagisme || "non précisé"}
Fringales : ${bilan.fringales || "non précisé"}

═══ HABITUDES ALIMENTAIRES ACTUELLES ═══
Repas par jour : ${bilan.temps_repas || "3"}
Matin : ${bilan.repas_matin || "non précisé"}
Midi : ${bilan.repas_midi || "non précisé"}
Soir : ${bilan.repas_soir || "non précisé"}
Budget alimentaire : ${bilan.budget || "non précisé"}

═══ RESTRICTIONS / ALERTES ═══
Régime : ${bilan.regime || "aucun"}
Allergies : ${bilan.allergies || "aucune"}
Aversions : ${bilan.aversions || "aucune"}
Alertes santé : ${bilan.alertes_sante?.length ? bilan.alertes_sante.join(", ") : "aucune"}

═══ BASE DE DONNÉES CIQUAL (aliments disponibles) ═══
Voici les aliments réels que tu dois utiliser impérativement. Leurs valeurs nutritionnelles sont issues de la table CIQUAL 2020.
Pour chaque repas, choisis un ou plusieurs aliments parmi cette liste. Utilise les noms exacts ci-dessous.

${ciqualSummary}

═══ INSTRUCTIONS ═══
Génère un plan structuré en JSON avec exactement ce format. Les descriptions doivent contenir des aliments de la liste CIQUAL, avec des quantités en grammes réalistes.

{
  "resume": "Résumé du profil et de la stratégie (2-3 phrases)",
  "apports_cibles": {
    "calories": 2000,
    "proteines_g": 120,
    "glucides_g": 220,
    "lipides_g": 65,
    "note": "explication courte"
  },
  "semaine": [
    {
      "jour": "Lundi",
      "matin": { "description": "ex: 50g de Flocons d'avoine avec 150ml de Lait demi-écrémé", "exemple": "" },
      "collation_matin": { "description": "ex: 1 pomme", "exemple": "" },
      "midi": { "description": "ex: 150g de Riz complet cuit + 120g de Blanc de poulet cuit + 100g de Brocolis cuits", "exemple": "", "grammages": "150g riz, 120g poulet, 100g brocolis" },
      "collation_soir": { "description": "ex: 30g d'Amandes", "exemple": "" },
      "soir": { "description": "ex: 200g de Lentilles cuites + 150g de Poivron rouge cuit", "exemple": "", "grammages": "200g lentilles, 150g poivron" }
    }
    // 7 jours (Lundi à Dimanche)
  ],
  "conseils": ["conseil 1", "conseil 2", "conseil 3"],
  "aliments_privilegier": ["aliment 1", "aliment 2"],
  "aliments_limiter": ["aliment 1", "aliment 2"],
  "suivi_recommande": "fréquence de suivi recommandée"
}

Adapte précisément aux restrictions alimentaires, allergies et objectif. Utilise UNIQUEMENT des noms d'aliments présents dans la liste CIQUAL. Réponds UNIQUEMENT avec le JSON, sans texte autour.`;

    // ── Appel OpenAI ───────────────────────────────────────
    const openai = new OpenAI({ apiKey: openaiKey });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    let rawText = completion.choices[0].message.content || "{}";
    rawText = rawText.replace(/```json|```/g, "").trim();

    let planIA;
    try {
      planIA = JSON.parse(rawText);
    } catch {
      planIA = { raw: rawText, erreur: "Format JSON invalide" };
    }

    // Enrichissement optionnel avec CIQUAL
    planIA = enrichirAvecCiqual(planIA);

    // ── Sauvegarder dans Supabase ──────────────────────────
    await supa.from("bilans").update({
      plan_ia_propose:   planIA,
      plan_ia_genere_at: new Date().toISOString(),
    }).eq("id", bilan_id);

    return new Response(JSON.stringify({ plan: planIA }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});