// ============================================================
//  Supabase Edge Function : generate-plan v2
//  Chemin : supabase/functions/generate-plan/index.ts
//
//  Déclencheur : diététicien connecté qui sélectionne une
//  demande dans son dashboard et clique "Générer le plan IA".
//
//  Flux complet :
//    1. Vérification JWT → rôle dietitian obligatoire
//    2. Récupération du bilan patient
//    3. Vérification que la demande queue_plans est valide
//    4. Passage en statut in_progress (queue_plans)
//    5. Génération IA (OpenAI GPT-4o-mini + CIQUAL)
//    6. Validation de la structure JSON retournée
//    7. Insertion dans la table plans
//    8. Mise à jour bilans + queue_plans
//    9. Notification email patient (Resend)
//
//  Variables d'environnement requises (Supabase > Settings > Edge Functions) :
//    OPENAI_API_KEY            → clé API OpenAI
//    RESEND_API_KEY            → clé API Resend (optionnelle)
//    SUPABASE_URL              → fournie automatiquement
//    SUPABASE_SERVICE_ROLE_KEY → fournie automatiquement
// ============================================================

import { serve }        from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI           from "https://deno.land/x/openai@v4.24.0/mod.ts";
import { CIQUAL }       from "./ciqual-data.ts";

// ── CORS ──────────────────────────────────────────────────────────────────────
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

// ── CIQUAL : liste complète des noms d'aliments pour le prompt ────────────────
// On envoie TOUS les noms (pas seulement 8 par groupe) pour que GPT n'hallucine
// pas d'aliments hors liste.  On n'envoie pas les valeurs nutritionnelles ici
// (trop de tokens) — l'enrichissement CIQUAL se fait après, côté serveur.
function getCiqualNoms(): string {
  const lignes: string[] = [];
  for (const groupe of Object.values(CIQUAL) as any[]) {
    const noms = groupe.equivalents.map((e: any) => e.aliment).join(" | ");
    lignes.push(`${groupe.label} : ${noms}`);
  }
  return lignes.join("\n");
}

// ── CIQUAL : enrichissement post-génération ───────────────────────────────────
// Après que GPT a généré le plan, on cherche les correspondances exactes dans
// CIQUAL pour ajouter les kcal et la référence officielle à chaque repas.
function enrichirAvecCiqual(plan: any): any {
  if (!Array.isArray(plan?.semaine)) return plan;

  // Index plat pour recherche rapide { "Riz blanc cuit": { kcal, prot, ... } }
  const index = new Map<string, any>();
  for (const groupe of Object.values(CIQUAL) as any[]) {
    for (const eq of groupe.equivalents) {
      index.set(eq.aliment.toLowerCase(), eq);
    }
  }

  const repasKeys = ["matin", "collation_matin", "midi", "collation_soir", "soir"];

  for (const jour of plan.semaine) {
    for (const cle of repasKeys) {
      const item = jour[cle];
      if (!item?.description) continue;

      const desc = item.description.toLowerCase();
      let kcalTotal = 0;
      let refs: string[] = [];

      // Cherche chaque aliment CIQUAL dans la description du repas
      for (const [nom, eq] of index.entries()) {
        if (desc.includes(nom)) {
          // Extraction de la quantité si format "Xg de AlimentNom"
          const regex = new RegExp(`(\\d+)\\s*g.*?${nom.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
          const match = item.description.match(regex);
          const qte = match ? parseInt(match[1]) : 100;
          kcalTotal += Math.round((eq.kcal * qte) / 100);
          refs.push(eq.aliment);
        }
      }

      if (refs.length > 0) {
        item.ciqual_refs = refs;
        item.kcal_estime = kcalTotal > 0 ? kcalTotal : undefined;
      }
    }
  }

  return plan;
}

// ── VALIDATION de la structure JSON retournée par GPT ─────────────────────────
type ValidationResult = { ok: boolean; errors: string[] };

function validerPlan(plan: any): ValidationResult {
  const errors: string[] = [];

  if (!plan || typeof plan !== "object") {
    return { ok: false, errors: ["Le plan n'est pas un objet JSON valide"] };
  }
  if (typeof plan.resume !== "string" || plan.resume.length < 10) {
    errors.push("Champ 'resume' manquant ou trop court");
  }
  if (!plan.apports_cibles || typeof plan.apports_cibles.calories !== "number") {
    errors.push("Champ 'apports_cibles.calories' manquant ou non numérique");
  } else if (plan.apports_cibles.calories < 800 || plan.apports_cibles.calories > 5000) {
    errors.push(`Calories hors plage réaliste : ${plan.apports_cibles.calories} kcal`);
  }
  if (!Array.isArray(plan.semaine)) {
    errors.push("Champ 'semaine' manquant ou non tableau");
  } else {
    if (plan.semaine.length !== 7) {
      errors.push(`Le plan doit contenir 7 jours, reçu : ${plan.semaine.length}`);
    }
    const repasAttendus = ["matin", "midi", "soir"];
    for (const [i, jour] of plan.semaine.entries()) {
      for (const repas of repasAttendus) {
        if (!jour[repas]?.description) {
          errors.push(`Jour ${i + 1} (${jour.jour || "?"}): repas '${repas}' manquant`);
        }
      }
    }
  }
  if (!Array.isArray(plan.conseils) || plan.conseils.length === 0) {
    errors.push("Champ 'conseils' manquant ou vide");
  }

  return { ok: errors.length === 0, errors };
}

// ── NOTIFICATION EMAIL (Resend) ───────────────────────────────────────────────
// Non bloquant : si l'envoi échoue, on log mais on ne fait pas rater la fonction.
async function envoyerEmailPatient(
  resendKey: string,
  email: string,
  prenom: string,
  dietNom: string,
): Promise<void> {
  if (!resendKey || !email) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "NutriDoc <noreply@nutridoc.calidoc-sante.fr>",
        to:   [email],
        subject: "Votre plan alimentaire est en cours de validation ✅",
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:auto">
            <h2 style="color:#0d2018">Bonjour ${prenom} 👋</h2>
            <p>Votre plan alimentaire a été généré par <strong>${dietNom}</strong> et est maintenant en cours de validation.</p>
            <p>Vous recevrez votre plan définitif sous <strong>48h</strong>.</p>
            <a href="https://nutridoc.calidoc-sante.fr/dashboard.html"
               style="display:inline-block;margin-top:16px;padding:12px 24px;background:#22c55e;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
              Voir mon tableau de bord →
            </a>
            <p style="margin-top:24px;color:#666;font-size:12px">
              NutriDoc by CaliDoc Santé · SIRET 939 166 690 00019
            </p>
          </div>
        `,
      }),
    });
  } catch (e) {
    console.error("[Email] Échec envoi Resend :", e);
  }
}

// ── HANDLER PRINCIPAL ─────────────────────────────────────────────────────────
serve(async (req) => {

  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ── 0. Vérification des variables d'environnement ──────────────────────────
  const supabaseUrl  = Deno.env.get("SUPABASE_URL");
  const supabaseKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const openaiKey    = Deno.env.get("OPENAI_API_KEY");
  const resendKey    = Deno.env.get("RESEND_API_KEY") ?? "";

  if (!supabaseUrl || !supabaseKey || !openaiKey) {
    console.error("[Config] Variables d'env manquantes :", {
      SUPABASE_URL:              !!supabaseUrl,
      SUPABASE_SERVICE_ROLE_KEY: !!supabaseKey,
      OPENAI_API_KEY:            !!openaiKey,
    });
    return json({ error: "Configuration serveur incomplète" }, 500);
  }

  try {
    // ── 1. Authentification JWT → rôle dietitian obligatoire ─────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return json({ error: "Token d'authentification manquant" }, 401);
    }

    // Client avec service_role pour les opérations admin (insert plans, etc.)
    const supaAdmin = createClient(supabaseUrl, supabaseKey);

    // Client avec le JWT du diét. pour respecter la RLS sur la vérification du profil
    const supaUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authErr } = await supaUser.auth.getUser(token);
    if (authErr || !user) {
      return json({ error: "Non authentifié" }, 401);
    }

    // Vérification du rôle dietitian
    const { data: profile, error: profileErr } = await supaAdmin
      .from("profiles")
      .select("role, prenom, nom, email")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile) {
      return json({ error: "Profil introuvable" }, 403);
    }
    if (profile.role !== "dietitian") {
      return json({ error: "Accès réservé aux diététiciens" }, 403);
    }

    const dietitianId  = user.id;
    const dietitianNom = `${profile.prenom ?? ""} ${profile.nom ?? ""}`.trim() || "Votre diététicien";

    // ── 2. Lecture des paramètres ─────────────────────────────────────────────
    let bilan_id: string;
    let queue_plan_id: string | null = null;

    try {
      const body = await req.json();
      bilan_id      = body.bilan_id;
      queue_plan_id = body.queue_plan_id ?? null;
    } catch {
      return json({ error: "Corps de requête JSON invalide" }, 400);
    }

    if (!bilan_id) {
      return json({ error: "bilan_id est requis" }, 400);
    }

    // ── 3. Récupération du bilan patient ──────────────────────────────────────
    const { data: bilan, error: bilanErr } = await supaAdmin
      .from("bilans")
      .select("*")
      .eq("id", bilan_id)
      .single();

    if (bilanErr || !bilan) {
      return json({ error: "Bilan introuvable" }, 404);
    }

    // ── 4. Vérification et verrouillage de la demande queue_plans ─────────────
    if (queue_plan_id) {
      const { data: qp, error: qpErr } = await supaAdmin
        .from("queue_plans")
        .select("id, statut, dietitian_id, ville")
        .eq("id", queue_plan_id)
        .single();

      if (qpErr || !qp) {
        return json({ error: "Demande queue_plans introuvable" }, 404);
      }

      // Vérifier que la demande n'est pas déjà prise par un autre diét.
      if (qp.dietitian_id && qp.dietitian_id !== dietitianId) {
        return json({ error: "Cette demande est déjà assignée à un autre diététicien" }, 409);
      }

      // Vérifier que le statut permet encore la génération
      if (!["pending", "accepted"].includes(qp.statut)) {
        return json({ error: `Statut incompatible pour la génération : ${qp.statut}` }, 409);
      }

      // Verrouiller la demande pour ce diét.
      const { error: lockErr } = await supaAdmin
        .from("queue_plans")
        .update({
          dietitian_id: dietitianId,
          statut:       "in_progress",
          accepted_at:  new Date().toISOString(),
          tentatives:   (qp.tentatives ?? 0) + 1,
          updated_at:   new Date().toISOString(),
        })
        .eq("id", queue_plan_id);

      if (lockErr) {
        console.error("[queue_plans] Échec verrouillage :", lockErr);
        return json({ error: "Impossible de verrouiller la demande" }, 500);
      }
    }

    // ── 5. Construction du prompt ─────────────────────────────────────────────
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
      sedentaire: "Sédentaire",
      leger:      "Légèrement actif (1–2x/semaine)",
      modere:     "Modérément actif (3–4x/semaine)",
      actif:      "Très actif (5+x/semaine)",
      tres_actif: "Extrêmement actif",
    };

    const ciqualNoms = getCiqualNoms();

    const prompt = `Tu es un diététicien RPPS expert. Génère une proposition de plan alimentaire sur 7 jours pour ce patient.

═══ PROFIL PATIENT ═══
Prénom / Nom : ${bilan.prenom || "?"} ${bilan.nom || ""}
Âge : ${bilan.age || "?"} ans | Sexe : ${bilan.sexe || "?"}
Ville : ${bilan.ville || "?"}

═══ MORPHOLOGIE ═══
Taille : ${bilan.taille || "?"}cm | Poids : ${bilan.poids || "?"}kg
Poids objectif : ${bilan.poids_objectif ? bilan.poids_objectif + "kg" : "non précisé"}
IMC calculé : ${IMC ?? "inconnu"}

═══ OBJECTIF & ACTIVITÉ ═══
Objectif : ${OBJECTIF_LABELS[bilan.objectif] || bilan.objectif || "équilibre"}
Niveau d'activité : ${ACTIVITE_LABELS[bilan.activite] || bilan.activite || "non précisé"}
Sport pratiqué : ${bilan.sport || "non précisé"}
Fréquence : ${bilan.sport_freq ? bilan.sport_freq + "x/semaine" : "—"} | Durée : ${bilan.sport_duree ? bilan.sport_duree + " min" : "—"}

═══ MODE DE VIE ═══
Travail : ${bilan.travail || "non précisé"} | Sommeil : ${bilan.sommeil || "non précisé"}
Hydratation : ${bilan.hydratation || "non précisé"} | Tabagisme : ${bilan.tabagisme || "non précisé"}
Fringales : ${bilan.fringales || "non précisé"}

═══ HABITUDES ALIMENTAIRES ACTUELLES ═══
Repas/jour : ${bilan.temps_repas || "3"}
Matin : ${bilan.repas_matin || "non précisé"}
Midi  : ${bilan.repas_midi  || "non précisé"}
Soir  : ${bilan.repas_soir  || "non précisé"}
Budget : ${bilan.budget || "non précisé"}

═══ RESTRICTIONS & ALERTES (OBLIGATOIRE à respecter) ═══
Régime : ${bilan.regime || "aucun"}
Allergies : ${bilan.allergies || "aucune"}
Aversions : ${bilan.aversions || "aucune"}
Alertes santé : ${bilan.alertes_sante?.length ? bilan.alertes_sante.join(", ") : "aucune"}

═══ ALIMENTS AUTORISÉS — TABLE CIQUAL 2020 (UTILISE UNIQUEMENT CES NOMS EXACTS) ═══
Tu dois impérativement utiliser les noms d'aliments tels qu'ils apparaissent ci-dessous.
N'invente aucun aliment qui ne figure pas dans cette liste.

${ciqualNoms}

═══ FORMAT DE RÉPONSE (JSON strict, aucun texte autour) ═══
{
  "resume": "Résumé du profil et de la stratégie nutritionnelle (2-3 phrases)",
  "apports_cibles": {
    "calories": 2000,
    "proteines_g": 120,
    "glucides_g": 220,
    "lipides_g": 65,
    "note": "explication courte des choix"
  },
  "semaine": [
    {
      "jour": "Lundi",
      "matin":           { "description": "50g de Flocons d'avoine avec 150ml de Lait demi-écrémé", "grammages": "50g flocons, 150ml lait" },
      "collation_matin": { "description": "1 Pomme (150g)", "grammages": "150g pomme" },
      "midi":            { "description": "150g de Riz complet cuit + 120g de Blanc de poulet cuit + 100g de Haricots verts cuits", "grammages": "150g riz, 120g poulet, 100g haricots verts" },
      "collation_soir":  { "description": "30g d'Amandes", "grammages": "30g amandes" },
      "soir":            { "description": "200g de Lentilles cuites + 150g de Poivron rouge cuit", "grammages": "200g lentilles, 150g poivron" }
    }
  ],
  "conseils": ["conseil 1", "conseil 2", "conseil 3"],
  "aliments_privilegier": ["aliment 1", "aliment 2"],
  "aliments_limiter": ["aliment 1", "aliment 2"],
  "suivi_recommande": "fréquence de suivi recommandée"
}

RÈGLES :
- Génère exactement 7 jours (Lundi à Dimanche)
- Utilise UNIQUEMENT les noms exacts de la liste CIQUAL ci-dessus
- Respecte strictement les allergies et aversions
- Adapte les quantités à l'objectif et au poids du patient
- Réponds UNIQUEMENT avec le JSON, aucun texte autour`;

    // ── 6. Appel OpenAI ───────────────────────────────────────────────────────
    let planIA: any;

    try {
      const openai = new OpenAI({ apiKey: openaiKey });

      const completion = await openai.chat.completions.create({
        model:           "gpt-4o-mini",
        messages:        [{ role: "user", content: prompt }],
        temperature:     0.6,           // légèrement moins créatif pour plus de cohérence
        response_format: { type: "json_object" },
        max_tokens:      4000,
      });

      let rawText = completion.choices[0].message.content ?? "{}";
      rawText = rawText.replace(/```json|```/g, "").trim();

      try {
        planIA = JSON.parse(rawText);
      } catch {
        // Cas rare où GPT retourne du JSON mal formé malgré response_format
        console.error("[OpenAI] JSON.parse échoué, rawText :", rawText.slice(0, 200));
        // Marquer la tentative comme échouée dans queue_plans
        if (queue_plan_id) {
          await supaAdmin.from("queue_plans")
            .update({ statut: "pending", dietitian_id: null, updated_at: new Date().toISOString() })
            .eq("id", queue_plan_id);
        }
        return json({ error: "Format JSON invalide retourné par l'IA" }, 502);
      }
    } catch (openaiErr) {
      console.error("[OpenAI] Erreur API :", openaiErr);
      // Libérer la demande pour qu'un autre diét. puisse réessayer
      if (queue_plan_id) {
        await supaAdmin.from("queue_plans")
          .update({ statut: "pending", dietitian_id: null, updated_at: new Date().toISOString() })
          .eq("id", queue_plan_id);
      }
      return json({ error: "Erreur lors de la génération IA, veuillez réessayer" }, 502);
    }

    // ── 7. Validation de la structure du plan ────────────────────────────────
    const validation = validerPlan(planIA);
    if (!validation.ok) {
      console.warn("[Validation] Plan invalide :", validation.errors);
      // On ne bloque pas la sauvegarde mais on ajoute les erreurs dans le plan
      // pour que le diét. puisse les voir et corriger manuellement
      planIA._validation_warnings = validation.errors;
    }

    // Enrichissement CIQUAL (ajoute kcal estimé + refs officielles)
    planIA = enrichirAvecCiqual(planIA);

    // Métadonnées de génération
    planIA._generated_at      = new Date().toISOString();
    planIA._generated_by_diet = dietitianId;
    planIA._model             = "gpt-4o-mini";

    // ── 8. Sauvegarde dans Supabase ──────────────────────────────────────────

    // 8a. Mise à jour du bilan
    const { error: bilanUpdateErr } = await supaAdmin
      .from("bilans")
      .update({
        plan_ia_propose:   planIA,
        plan_ia_genere_at: new Date().toISOString(),
      })
      .eq("id", bilan_id);

    if (bilanUpdateErr) {
      console.error("[Supabase] Échec update bilans :", bilanUpdateErr);
    }

    // 8b. Insertion dans la table plans
    const { data: planRecord, error: planInsertErr } = await supaAdmin
      .from("plans")
      .insert({
        patient_id:   bilan.patient_id,
        dietitian_id: dietitianId,
        bilan_id:     bilan_id,
        contenu:      planIA,
        statut:       "in_progress",  // le diét. devra valider puis livrer
      })
      .select("id")
      .single();

    if (planInsertErr) {
      console.error("[Supabase] Échec insert plans :", planInsertErr);
      // On continue : le plan est quand même dans bilans
    }

    const planRecordId = planRecord?.id ?? null;

    // 8c. Mise à jour queue_plans (si fourni)
    if (queue_plan_id) {
      const { error: qpUpdateErr } = await supaAdmin
        .from("queue_plans")
        .update({
          dietitian_id: dietitianId,
          statut:       "in_progress",
          updated_at:   new Date().toISOString(),
          // On ne passe pas en 'delivered' ici : le diét. doit encore
          // valider et signer avant la livraison au patient
        })
        .eq("id", queue_plan_id);

      if (qpUpdateErr) {
        console.error("[Supabase] Échec update queue_plans :", qpUpdateErr);
      }
    }

    // ── 9. Email de notification au patient ──────────────────────────────────
    // Récupérer l'email du patient (via auth.users → non accessible directement)
    // On passe par profiles si l'email y est stocké
    const { data: patientProfile } = await supaAdmin
      .from("profiles")
      .select("email, prenom")
      .eq("id", bilan.patient_id)
      .single();

    if (patientProfile?.email) {
      await envoyerEmailPatient(
        resendKey,
        patientProfile.email,
        patientProfile.prenom ?? bilan.prenom ?? "Patient",
        dietitianNom,
      );
    }

    // ── 10. Réponse ───────────────────────────────────────────────────────────
    return json({
      success:        true,
      plan:           planIA,
      plan_record_id: planRecordId,
      validation:     validation,
      message:        "Plan IA généré. Vous pouvez maintenant le modifier et le valider.",
    });

  } catch (err) {
    console.error("[generate-plan] Erreur inattendue :", err);
    return json({ error: String(err) }, 500);
  }
});
