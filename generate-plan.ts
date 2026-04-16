// ============================================================
//  Supabase Edge Function : generate-plan
//  Chemin : supabase/functions/generate-plan/index.ts
//
//  Déploiement :
//    supabase functions deploy generate-plan
//
//  Variables d'environnement requises (Dashboard → Settings → Secrets) :
//    ANTHROPIC_API_KEY = sk-ant-...
// ============================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { bilan_id } = await req.json();
    if (!bilan_id) {
      return new Response(JSON.stringify({ error: "bilan_id requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ── Auth Supabase ──────────────────────────────────────
    const supabaseUrl  = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;

    const supa = createClient(supabaseUrl, supabaseKey);

    // Vérifier que le demandeur est bien un diét.
    const authHeader = req.headers.get("Authorization");
    const { data: { user } } = await supa.auth.getUser(authHeader?.replace("Bearer ", "") || "");
    if (!user) return new Response(JSON.stringify({ error: "Non authentifié" }), { status: 401, headers: corsHeaders });

    const { data: profile } = await supa.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || !["dietitian", "prescriber"].includes(profile.role)) {
      return new Response(JSON.stringify({ error: "Accès refusé" }), { status: 403, headers: corsHeaders });
    }

    // ── Récupérer le bilan ─────────────────────────────────
    const { data: bilan, error: bilanErr } = await supa
      .from("bilans")
      .select("*")
      .eq("id", bilan_id)
      .single();

    if (bilanErr || !bilan) {
      return new Response(JSON.stringify({ error: "Bilan introuvable" }), { status: 404, headers: corsHeaders });
    }

    // ── Construire le prompt ───────────────────────────────
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

═══ INSTRUCTIONS ═══
Génère un plan structuré en JSON avec exactement ce format :
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
      "matin": { "description": "...", "exemple": "..." },
      "collation_matin": { "description": "...", "exemple": "..." },
      "midi": { "description": "...", "exemple": "...", "grammages": "..." },
      "collation_soir": { "description": "...", "exemple": "..." },
      "soir": { "description": "...", "exemple": "...", "grammages": "..." }
    }
    // 7 jours (Lundi à Dimanche)
  ],
  "conseils": ["conseil 1", "conseil 2", "conseil 3"],
  "aliments_privilegier": ["aliment 1", "aliment 2"],
  "aliments_limiter": ["aliment 1", "aliment 2"],
  "suivi_recommande": "fréquence de suivi recommandée"
}

Adapte précisément aux restrictions alimentaires, allergies et objectif. Inclus des grammages précis pour le midi et le soir. Réponds UNIQUEMENT avec le JSON, sans texte autour.`;

    // ── Appel Anthropic ────────────────────────────────────
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      return new Response(JSON.stringify({ error: "Erreur Anthropic : " + errText }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const anthropicData = await anthropicRes.json();
    const rawText = anthropicData.content?.[0]?.text || "{}";

    // Parser le JSON retourné
    let planIA;
    try {
      planIA = JSON.parse(rawText.replace(/```json|```/g, "").trim());
    } catch {
      planIA = { raw: rawText, erreur: "Format JSON invalide" };
    }

    // ── Sauvegarder dans Supabase ──────────────────────────
    await supa.from("bilans").update({
      plan_ia_propose:   planIA,
      plan_ia_genere_at: new Date().toISOString(),
    }).eq("id", bilan_id);

    return new Response(JSON.stringify({ plan: planIA }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
