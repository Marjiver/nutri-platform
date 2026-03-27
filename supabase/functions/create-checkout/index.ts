/**
 * Supabase Edge Function : create-checkout
 * Crée une session Stripe Checkout et retourne l'URL de paiement
 *
 * supabase functions deploy create-checkout
 * supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_API    = "https://api.stripe.com/v1";

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const { product_key, product, metadata, success_url, cancel_url } = await req.json();

  // Construire les line_items Stripe
  const body = new URLSearchParams({
    "mode":                                   "payment",
    "payment_method_types[]":                 "card",
    "line_items[0][price_data][currency]":    product.currency,
    "line_items[0][price_data][unit_amount]": String(product.amount),
    "line_items[0][price_data][product_data][name]":        product.name,
    "line_items[0][price_data][product_data][description]": product.description,
    "line_items[0][quantity]":                "1",
    "success_url": success_url,
    "cancel_url":  cancel_url,
    // Options de confort
    "billing_address_collection": "auto",
    "locale": "fr",
    // Permettre la sauvegarde de la carte (optionnel)
    "payment_intent_data[description]": `NutriDoc — ${product.name}`,
  });

  // Ajouter les métadonnées (transmises au webhook)
  Object.entries(metadata || {}).forEach(([k, v]) => {
    body.append(`metadata[${k}]`, String(v));
  });

  // Appel API Stripe
  const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${STRIPE_SECRET}`,
      "Content-Type":  "application/x-www-form-urlencoded",
    },
    body,
  });

  const session = await res.json();

  if (!res.ok) {
    return new Response(JSON.stringify({ error: session.error?.message ?? "Erreur Stripe" }), {
      status: 400, headers: { ...cors, "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ url: session.url, id: session.id }), {
    headers: { ...cors, "Content-Type": "application/json" }
  });
});
