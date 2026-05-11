// ============================================================
//  supabase/functions/create-checkout/index.ts
//
//  Crée une session Stripe Checkout pour l'achat d'un plan.
//  Appelée depuis le dashboard.html du patient.
//
//  Variables d'env requises :
//    STRIPE_SECRET_KEY         → sk_test_xxxx ou sk_live_xxxx
//    SUPABASE_URL              → auto
//    SUPABASE_SERVICE_ROLE_KEY → auto
// ============================================================

import { serve }        from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe           from "https://esm.sh/stripe@14.21.0?target=deno";

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const stripeKey   = Deno.env.get("STRIPE_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!stripeKey || !supabaseUrl || !supabaseKey) {
    return json({ error: "Configuration incomplète" }, 500);
  }

  // ── Auth JWT patient ────────────────────────────────────────────────────
  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  if (!token) return json({ error: "Non authentifié" }, 401);

  const sb = createClient(supabaseUrl, supabaseKey);
  const supaUser = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_ANON_KEY") ?? supabaseKey,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error: authErr } = await supaUser.auth.getUser(token);
  if (authErr || !user) return json({ error: "Non authentifié" }, 401);

  // ── Lire le body ────────────────────────────────────────────────────────
  const { bilan_id, success_url, cancel_url } = await req.json();
  if (!bilan_id) return json({ error: "bilan_id requis" }, 400);

  // ── Récupérer le profil patient ─────────────────────────────────────────
  const { data: profile } = await sb
    .from("profiles")
    .select("email, prenom, nom")
    .eq("id", user.id)
    .single();

  // ── Pré-créer le plan en base ───────────────────────────────────────────
  const { data: plan } = await sb
    .from("plans")
    .insert({
      patient_id: user.id,
      bilan_id,
      statut:  "en_attente",
      montant: 2490,
    })
    .select("id")
    .single();

  // ── Créer la session Stripe ─────────────────────────────────────────────
  const stripe = new Stripe(stripeKey, {
    apiVersion: "2024-04-10",
    httpClient: Stripe.createFetchHttpClient(),
  });

  const baseUrl = success_url?.split("?")[0] ?? "https://nutridoc.calidoc-sante.fr/dashboard.html";

  const session = await stripe.checkout.sessions.create({
    mode:                 "payment",
    payment_method_types: ["card"],
    customer_email:       profile?.email ?? undefined,
    line_items: [{
      quantity: 1,
      price_data: {
        currency:     "eur",
        unit_amount:  2490,           // 24,90 €
        product_data: {
          name:        "Plan alimentaire NutriDoc — 4 semaines",
          description: "Plan personnalisé validé par un diététicien RPPS sous 48h",
          images:      ["https://nutridoc.calidoc-sante.fr/assets/og-image.png"],
        },
      },
    }],
    metadata: {
      type:       "plan",
      patient_id: user.id,
      bilan_id,
      plan_id:    plan?.id ?? "",
    },
    success_url: `${baseUrl}?payment=success&plan_id=${plan?.id ?? ""}`,
    cancel_url:  cancel_url ?? `${baseUrl}?payment=cancelled`,
  });

  return json({ url: session.url, session_id: session.id });
});
