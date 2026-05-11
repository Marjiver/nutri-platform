// ============================================================
//  Supabase Edge Function : stripe-webhook
//  Chemin : supabase/functions/stripe-webhook/index.ts
//
//  Reçoit les événements Stripe et déclenche les actions
//  métier correspondantes.
//
//  Événements gérés :
//    • checkout.session.completed  → plan payé, visio payée, crédits achetés
//    • payment_intent.payment_failed → notification échec paiement
//
//  IMPORTANT : cette fonction n'utilise PAS de JWT patient.
//  Elle est appelée directement par Stripe. La sécurité repose
//  sur la vérification de la signature Stripe (HMAC-SHA256).
//
//  Variables d'env requises :
//    STRIPE_WEBHOOK_SECRET     → whsec_xxxx (depuis Stripe Dashboard > Webhooks)
//    RESEND_API_KEY            → clé Resend (optionnelle)
//    SUPABASE_URL              → fournie automatiquement
//    SUPABASE_SERVICE_ROLE_KEY → fournie automatiquement
// ============================================================

import { serve }        from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe           from "https://esm.sh/stripe@14.21.0?target=deno";

// ── CORS (minimal — Stripe ne préflighte pas) ──────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── EMAIL PATIENT (Resend) ─────────────────────────────────────────────────────
async function sendEmail(
  resendKey: string,
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  if (!resendKey || !to) return;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method:  "POST",
      headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "NutriDoc <noreply@nutridoc.calidoc-sante.fr>",
        to:   [to],
        subject,
        html,
      }),
    });
    if (!res.ok) console.error("[Resend] Échec :", await res.text());
  } catch (e) {
    console.error("[Resend] Exception :", e);
  }
}

// ── TEMPLATES EMAILS ──────────────────────────────────────────────────────────
function emailPlanConfirmation(prenom: string): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;color:#0d2018">
      <h2>Bonjour ${prenom} 👋</h2>
      <p>Votre paiement de <strong>24,90 €</strong> a bien été reçu.</p>
      <p>Votre demande de plan alimentaire est maintenant dans la file d'attente.
         Un diététicien certifié RPPS, proche de chez vous, va prendre en charge
         votre dossier dans les prochaines heures.</p>
      <p><strong>Délai de livraison : 48h maximum.</strong></p>
      <a href="https://nutridoc.calidoc-sante.fr/dashboard.html"
         style="display:inline-block;margin-top:16px;padding:12px 24px;
                background:#1D9E75;color:#fff;border-radius:8px;
                text-decoration:none;font-weight:700">
        Suivre mon dossier →
      </a>
      <p style="margin-top:32px;font-size:12px;color:#888">
        NutriDoc by CaliDoc Santé · SIRET 939 166 690 00019<br>
        Une question ? <a href="mailto:contact@nutridoc.calidoc-sante.fr">contact@nutridoc.calidoc-sante.fr</a>
      </p>
    </div>`;
}

function emailVisioConfirmation(prenom: string, lienVisio: string): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;color:#0d2018">
      <h2>Votre visio est confirmée, ${prenom} ! 📹</h2>
      <p>Votre paiement de <strong>55,00 €</strong> a bien été reçu.</p>
      <p>Votre diététicien va vous confirmer le créneau sous peu.</p>
      ${lienVisio ? `<a href="${lienVisio}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#1D9E75;color:#fff;border-radius:8px;text-decoration:none;font-weight:700">Rejoindre la visio →</a>` : ""}
      <p style="margin-top:32px;font-size:12px;color:#888">
        NutriDoc by CaliDoc Santé · SIRET 939 166 690 00019
      </p>
    </div>`;
}

function emailCreditsConfirmation(prenom: string, credits: number, pack: string): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;color:#0d2018">
      <h2>Vos crédits sont disponibles, ${prenom} ! 🎉</h2>
      <p>Pack <strong>${pack}</strong> : <strong>${credits} crédits</strong> ajoutés à votre compte.</p>
      <p>Vous pouvez dès maintenant commander des plans alimentaires pour vos clients.</p>
      <a href="https://nutridoc.calidoc-sante.fr/prescripteur-dashboard.html"
         style="display:inline-block;margin-top:16px;padding:12px 24px;
                background:#1D9E75;color:#fff;border-radius:8px;
                text-decoration:none;font-weight:700">
        Mon espace prescripteur →
      </a>
      <p style="margin-top:32px;font-size:12px;color:#888">
        NutriDoc by CaliDoc Santé · SIRET 939 166 690 00019
      </p>
    </div>`;
}

function emailEchecPaiement(prenom: string): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;color:#0d2018">
      <h2>Problème de paiement, ${prenom}</h2>
      <p>Votre paiement n'a pas pu aboutir.</p>
      <p>Votre dossier n'a pas été débité. Réessayez depuis votre tableau de bord.</p>
      <a href="https://nutridoc.calidoc-sante.fr/dashboard.html"
         style="display:inline-block;margin-top:16px;padding:12px 24px;
                background:#ef4444;color:#fff;border-radius:8px;
                text-decoration:none;font-weight:700">
        Réessayer →
      </a>
    </div>`;
}

// ═════════════════════════════════════════════════════════════════════════════
//  HANDLER PRINCIPAL
// ═════════════════════════════════════════════════════════════════════════════
serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ── Variables d'env ────────────────────────────────────────────────────────
  const supabaseUrl    = Deno.env.get("SUPABASE_URL");
  const supabaseKey    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const webhookSecret  = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const resendKey      = Deno.env.get("RESEND_API_KEY") ?? "";

  if (!supabaseUrl || !supabaseKey || !webhookSecret) {
    console.error("[Config] Variables d'env manquantes");
    return json({ error: "Configuration serveur incomplète" }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // ── Récupérer le body brut (obligatoire pour la vérification de signature) ─
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    console.warn("[Stripe] Requête sans signature rejetée");
    return json({ error: "Signature manquante" }, 400);
  }

  // ── Vérification de la signature Stripe ───────────────────────────────────
  // C'est la seule protection contre les faux appels.
  // Ne JAMAIS traiter un événement sans cette vérification.
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
    apiVersion: "2024-04-10",
    httpClient: Stripe.createFetchHttpClient(),
  });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("[Stripe] Signature invalide :", err);
    return json({ error: "Signature Stripe invalide" }, 400);
  }

  console.log(`[Stripe] Événement reçu : ${event.type} | id : ${event.id}`);

  // ═══════════════════════════════════════════════════════════════════════════
  //  ROUTAGE DES ÉVÉNEMENTS
  // ═══════════════════════════════════════════════════════════════════════════
  try {

    // ── checkout.session.completed ─────────────────────────────────────────
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Les métadonnées sont définies lors de la création de la session Stripe
      // depuis le frontend (dashboard.html ou prescripteur-dashboard.html).
      const meta = session.metadata ?? {};

      const type           = meta.type;          // "plan" | "visio" | "credits"
      const patientId      = meta.patient_id;    // UUID auth.users
      const bilanId        = meta.bilan_id;      // UUID bilans
      const planId         = meta.plan_id;       // UUID plans (pré-créé)
      const visioId        = meta.visio_id;      // UUID visios
      const prescripteurId = meta.prescripteur_id ?? null;
      const pack           = meta.pack ?? "";    // "starter" | "pro" | "premium"
      const stripeId       = session.id;
      const montant        = session.amount_total ?? 0; // en centimes

      // ── CAS 1 : Achat d'un plan (patient direct) ─────────────────────────
      if (type === "plan" && patientId && bilanId) {

        // 1a. Récupérer le profil patient pour l'email + la ville
        const { data: patient } = await supabase
          .from("profiles")
          .select("email, prenom, ville")
          .eq("id", patientId)
          .single();

        const { data: bilan } = await supabase
          .from("bilans")
          .select("objectif, repas_actifs")
          .eq("id", bilanId)
          .single();

        // 1b. Mettre à jour le bilan → payé
        await supabase.from("bilans").update({
          paiement:  "payé",
          paid_at:   new Date().toISOString(),
          stripe_id: stripeId,
          montant:   montant,
          statut:    "payé",
        }).eq("id", bilanId);

        // 1c. Créer ou mettre à jour le plan
        let planRecordId = planId;

        if (planId) {
          // Plan pré-créé → on le marque comme payé
          await supabase.from("plans").update({
            statut:    "paid",
            paid_at:   new Date().toISOString(),
            stripe_id: stripeId,
            montant:   montant,
          }).eq("id", planId);
        } else {
          // Créer le plan maintenant
          const { data: newPlan } = await supabase.from("plans").insert({
            patient_id:  patientId,
            bilan_id:    bilanId,
            statut:      "paid",
            stripe_id:   stripeId,
            montant:     montant,
            paid_at:     new Date().toISOString(),
          }).select("id").single();
          planRecordId = newPlan?.id ?? null;
        }

        // 1d. Trouver le diét. le plus proche (même ville, actif, RPPS valide)
        let dietId: string | null = null;

        if (patient?.ville) {
          const { data: dietLocal } = await supabase
            .from("profiles")
            .select("id")
            .eq("role", "dietitian")
            .eq("statut_rpps", "valide")
            .eq("statut", "actif")
            .ilike("ville", `%${patient.ville}%`)
            .limit(1)
            .single();

          dietId = dietLocal?.id ?? null;
        }

        // Fallback → n'importe quel diét. valide
        if (!dietId) {
          const { data: dietAny } = await supabase
            .from("profiles")
            .select("id")
            .eq("role", "dietitian")
            .eq("statut_rpps", "valide")
            .eq("statut", "actif")
            .limit(1)
            .single();
          dietId = dietAny?.id ?? null;
        }

        // 1e. Créer l'entrée dans queue_plans
        await supabase.from("queue_plans").insert({
          patient_id:     patientId,
          patient_prenom: patient?.prenom ?? "",
          ville:          patient?.ville  ?? "",
          objectif:       bilan?.objectif ?? "",
          bilan_id:       bilanId,
          source:         prescripteurId ? "prescripteur" : "patient",
          prescripteur_id:prescripteurId,
          dietitian_id:   dietId,
          statut:         dietId ? "accepted" : "pending",
          priorite:       prescripteurId ? 1 : 0,
          expires_at:     new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        });

        // 1f. Email de confirmation patient
        if (patient?.email) {
          await sendEmail(
            resendKey,
            patient.email,
            "✅ Paiement reçu — Votre plan est en cours de préparation",
            emailPlanConfirmation(patient.prenom ?? ""),
          );
        }

        console.log(`✅ Plan payé | patient:${patientId} | bilan:${bilanId} | plan:${planRecordId} | diét:${dietId}`);
      }

      // ── CAS 2 : Achat d'une visio ─────────────────────────────────────────
      else if (type === "visio" && visioId) {

        // 2a. Mettre à jour la visio
        await supabase.from("visios").update({
          stripe_id:    stripeId,
          statut:       "confirmee",
          confirmed_at: new Date().toISOString(),
        }).eq("id", visioId);

        // 2b. Récupérer les infos pour l'email
        const { data: visio } = await supabase
          .from("visios")
          .select("patient_id, lien_visio")
          .eq("id", visioId)
          .single();

        if (visio?.patient_id) {
          const { data: patient } = await supabase
            .from("profiles")
            .select("email, prenom")
            .eq("id", visio.patient_id)
            .single();

          if (patient?.email) {
            await sendEmail(
              resendKey,
              patient.email,
              "📹 Votre visio est confirmée — NutriDoc",
              emailVisioConfirmation(patient.prenom ?? "", visio.lien_visio ?? ""),
            );
          }
        }

        console.log(`✅ Visio payée | visio:${visioId}`);
      }

      // ── CAS 3 : Achat de crédits prescripteur ────────────────────────────
      else if (type === "credits" && patientId) {

        // Crédits selon le pack
        const PACKS: Record<string, number> = {
          starter:  5,
          pro:      15,
          premium:  40,
          illimite: 999, // cas particulier, géré manuellement
        };
        const creditsAjoutes = PACKS[pack] ?? 5;

        // 3a. Incrémenter les crédits du prescripteur
        const { data: current } = await supabase
          .from("profiles")
          .select("credits")
          .eq("id", patientId)
          .single();

        await supabase.from("profiles").update({
          credits: (current?.credits ?? 0) + creditsAjoutes,
          pack:    pack,
        }).eq("id", patientId);

        // 3b. Email de confirmation prescripteur
        const { data: prescripteur } = await supabase
          .from("profiles")
          .select("email, prenom")
          .eq("id", patientId)
          .single();

        if (prescripteur?.email) {
          await sendEmail(
            resendKey,
            prescripteur.email,
            `🎉 ${creditsAjoutes} crédits ajoutés à votre compte — NutriDoc`,
            emailCreditsConfirmation(prescripteur.prenom ?? "", creditsAjoutes, pack),
          );
        }

        console.log(`✅ Crédits ajoutés | prescripteur:${patientId} | pack:${pack} | crédits:${creditsAjoutes}`);
      }

      else {
        // Type de paiement non reconnu → on log mais on renvoie 200
        // pour que Stripe ne retente pas l'envoi
        console.warn(`[Stripe] type de checkout non géré : "${type}" | session:${session.id}`);
      }
    }

    // ── payment_intent.payment_failed ──────────────────────────────────────
    else if (event.type === "payment_intent.payment_failed") {
      const pi   = event.data.object as Stripe.PaymentIntent;
      const meta = pi.metadata ?? {};
      const patientId = meta.patient_id;

      console.warn(`[Stripe] Paiement échoué | patient:${patientId} | raison:${pi.last_payment_error?.message}`);

      if (patientId) {
        const { data: patient } = await supabase
          .from("profiles")
          .select("email, prenom")
          .eq("id", patientId)
          .single();

        if (patient?.email) {
          await sendEmail(
            resendKey,
            patient.email,
            "⚠️ Problème de paiement — NutriDoc",
            emailEchecPaiement(patient.prenom ?? ""),
          );
        }
      }
    }

    // ── Autres événements → on accuse réception sans traitement ───────────
    else {
      console.log(`[Stripe] Événement ignoré : ${event.type}`);
    }

    // Toujours renvoyer 200 à Stripe pour accuser réception
    return json({ received: true, type: event.type });

  } catch (err) {
    // En cas d'erreur métier → on log mais on renvoie 200 quand même.
    // Sinon Stripe retentera indéfiniment et doublonnera les actions.
    console.error("[stripe-webhook] Erreur métier :", err);
    return json({ received: true, error: String(err) });
  }
});
