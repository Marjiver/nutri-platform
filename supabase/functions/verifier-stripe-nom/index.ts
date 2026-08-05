// ═══════════════════════════════════════════════════════════════
//  NutriDoc — Edge Function : verifier-stripe-nom
//  À BRANCHER LORS DE LA MISE EN PLACE DE STRIPE CONNECT.
//
//  Règle métier (décision Marjiver, août 2026) :
//  le nom du compte Stripe ET du RIB doivent correspondre au nom
//  officiel RPPS du diététicien (profiles.rpps_nom_officiel).
//  Sinon : stripe_nom_match = false → AUCUN versement autorisé.
//
//  Brancher comme webhook Stripe sur l'événement "account.updated".
//  SECRETS REQUIS : STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY
// ═══════════════════════════════════════════════════════════════

import { createClient } from "npm:@supabase/supabase-js@2";

function norm(s: string): string {
  return (s || "").toLowerCase().normalize("NFD")
    .replace(/[̀-ͯ]/g, "").replace(/[^a-z]+/g, " ").trim();
}
function motCommun(a: string, b: string): boolean {
  const A = norm(a).split(" ").filter((t) => t.length > 1);
  const B = norm(b).split(" ").filter((t) => t.length > 1);
  return A.some((t) => B.includes(t));
}

Deno.serve(async (req: Request) => {
  try {
    const event = await req.json();
    if (event.type !== "account.updated") return new Response("ignored");

    const account = event.data.object;
    const accountId = account.id;

    // 1. Nom légal du titulaire du compte Stripe (vérifié par le KYC Stripe)
    const prenomStripe = account.individual?.first_name || "";
    const nomStripe = account.individual?.last_name || "";

    // 2. Nom du titulaire du RIB (compte bancaire externe)
    const rib = account.external_accounts?.data?.[0];
    const titulaireRib = rib?.account_holder_name || "";

    // 3. Nom officiel RPPS enregistré à l'inscription
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: profil } = await supa
      .from("profiles")
      .select("id, rpps_nom_officiel")
      .eq("stripe_account_id", accountId)
      .single();
    if (!profil) return new Response("profil inconnu");

    const nomOfficiel = profil.rpps_nom_officiel || "";

    // 4. Concordance : Stripe ET RIB doivent correspondre au nom RPPS
    const stripeOk = motCommun(nomStripe, nomOfficiel) &&
      motCommun(prenomStripe, nomOfficiel);
    const ribOk = titulaireRib === "" /* certains RIB n'exposent pas le titulaire */ ||
      motCommun(titulaireRib, nomOfficiel);

    const match = stripeOk && ribOk;

    await supa.from("profiles")
      .update({ stripe_nom_match: match })
      .eq("id", profil.id);

    // ⚠️ Côté versements : ne JAMAIS déclencher de transfert si
    // stripe_nom_match !== true (contrôle à ajouter dans create-checkout /
    // la logique de reversement quand Stripe Connect sera branché).

    return new Response(JSON.stringify({ match }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response("erreur: " + String(e), { status: 400 });
  }
});
