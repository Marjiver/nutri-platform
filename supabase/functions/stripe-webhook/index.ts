/**
 * Supabase Edge Function : stripe-webhook
 * Reçoit et traite les événements Stripe
 *
 * Déploiement :
 *   supabase functions deploy stripe-webhook
 *   supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
 *   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
 *
 * Dans Stripe Dashboard → Webhooks → ajouter :
 *   https://phgjpwaptrrjonoimmne.supabase.co/functions/v1/stripe-webhook
 * Événements :
 *   checkout.session.completed
 *   payment_intent.payment_failed
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const SUPABASE_URL          = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "stripe-signature, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const sig  = req.headers.get("stripe-signature") ?? "";
  const body = await req.text();

  let event: any;
  try {
    event = await verifyStripe(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return new Response(JSON.stringify({ error: "Signature invalide" }), {
      status: 400, headers: { ...cors, "Content-Type": "application/json" }
    });
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const meta    = session.metadata ?? {};

      switch (meta.type) {
        case "plan":    await planPaid(db, session, meta);    break;
        case "visio":   await visioPaid(db, session, meta);   break;
        case "credits": await creditsPaid(db, session, meta); break;
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      console.warn("Paiement échoué :", event.data.object.id);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, "Content-Type": "application/json" }
    });

  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" }
    });
  }
});

// ── PLAN PREMIUM (24,90€) ─────────────────────────────────────
async function planPaid(db: any, session: any, meta: any) {
  // 1. Enregistrer le paiement
  await db.from("plans").upsert({
    patient_id: meta.patient_id,
    bilan_id:   meta.bilan_id,
    statut:     "paid",
    paid_at:    new Date().toISOString(),
    stripe_id:  session.id,
    montant:    2490,
  });

  // 2. Ajouter à la file d'attente
  await db.from("queue_plans").insert({
    patient_id: meta.patient_id,
    bilan_id:   meta.bilan_id,
    statut:     "pending",
    ville:      meta.ville ?? "",
    objectif:   meta.objectif ?? "",
    type:       "plan",
    expires_at: new Date(Date.now() + 48 * 3_600_000).toISOString(),
  });

  // 3. Email patient
  await email("confirmation_bilan", meta.patient_email, {
    prenom:   meta.patient_prenom,
    objectif: meta.objectif,
    ville:    meta.ville,
  });

  // 4. Notifier les diét. proches
  const { data: diets } = await db.from("profiles")
    .select("email, prenom, nom")
    .eq("role", "dietitian").eq("statut", "actif").limit(5);

  for (const d of diets ?? []) {
    await email("nouvelle_demande_diet", d.email, {
      patient_prenom: meta.patient_prenom,
      objectif:       meta.objectif,
      ville:          meta.ville,
      remuneration:   "18",
    });
  }
}

// ── VISIO (55€) ───────────────────────────────────────────────
async function visioPaid(db: any, session: any, meta: any) {
  const [date, heure] = (meta.slot_key ?? "_").split("_");

  await db.from("visios").upsert({
    patient_id:  meta.patient_id,
    diet_id:     meta.diet_id,
    slot_key:    meta.slot_key,
    statut:      "confirmee",
    montant:     5500,
    reversement: 4900,
    stripe_id:   session.id,
    confirmed_at: new Date().toISOString(),
  });

  // Patient
  await email("confirmation_visio", meta.patient_email, {
    diet_nom:   meta.diet_nom,
    date, heure,
    lien_visio: `https://meet.nutridoc.fr/${meta.diet_id}`,
  });

  // Diét
  await email("nouvelle_visio_diet", meta.diet_email, {
    patient_prenom: meta.patient_prenom,
    date, heure,
  });
}

// ── CRÉDITS PRESCRIPTEUR (49/89/219€ HT) ─────────────────────
async function creditsPaid(db: any, session: any, meta: any) {
  const credits = parseInt(meta.credits ?? "10");

  // Lire crédits actuels
  const { data: profile } = await db.from("profiles")
    .select("credits").eq("id", meta.prescriber_id).single();

  // Créditer
  await db.from("profiles").update({
    credits:    (profile?.credits ?? 0) + credits,
    updated_at: new Date().toISOString(),
  }).eq("id", meta.prescriber_id);

  // Facture
  const num = `PRO-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
  await db.from("factures_prescripteur").insert({
    prescriber_id: meta.prescriber_id,
    numero:        num,
    pack:          meta.pack,
    credits,
    montant_ht:    session.amount_subtotal,  // en centimes
    montant_ttc:   session.amount_total,
    stripe_id:     session.id,
  });

  // Email
  await email("bienvenue", meta.prescriber_email, {
    prenom:  meta.prescriber_prenom,
    role:    "prescriber",
    credits,
  });
}

// ── Email helper ──────────────────────────────────────────────
async function email(type: string, to: string, data: any) {
  if (!to) return;
  await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}` },
    body:    JSON.stringify({ type, to, data }),
  }).catch(e => console.error("email err:", e));
}

// ── Vérification signature Stripe (sans npm) ──────────────────
async function verifyStripe(payload: string, sig: string, secret: string) {
  const t  = sig.match(/t=(\d+)/)?.[1];
  const v1 = sig.match(/v1=([a-f0-9]+)/)?.[1];
  if (!t || !v1) throw new Error("Sig malformée");
  if (Math.abs(Date.now() / 1000 - +t) > 300) throw new Error("Timestamp expiré");

  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`));
  const hex = [...new Uint8Array(mac)].map(b => b.toString(16).padStart(2,"0")).join("");
  if (hex !== v1) throw new Error("Signature invalide");

  return JSON.parse(payload);
}
