// ═══════════════════════════════════════════════════════════════
//  NutriDoc — Edge Function : verifier-rpps
//  Vérifie un diététicien dans l'Annuaire Santé officiel (ANS).
//  Bloque l'inscription si : RPPS introuvable, profession ≠ diététicien,
//  ou nom/prénom saisis ≠ nom officiel de l'annuaire.
//
//  SECRET REQUIS (Supabase → Edge Functions → Secrets) :
//    ESANTE_API_KEY = clé obtenue sur le portail développeur ANS
//    (https://industriels.esante.gouv.fr — API Annuaire Santé)
// ═══════════════════════════════════════════════════════════════

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// normalise : minuscules, sans accents, lettres uniquement
function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]+/g, " ")
    .trim();
}

// au moins un mot en commun entre deux noms (gère noms composés, épouse, etc.)
function motCommun(a: string, b: string): boolean {
  const A = norm(a).split(" ").filter((t) => t.length > 1);
  const B = norm(b).split(" ").filter((t) => t.length > 1);
  return A.some((t) => B.includes(t));
}

function reponse(obj: unknown): Response {
  return new Response(JSON.stringify(obj), {
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { rpps, nom, prenom } = await req.json();

    if (!/^\d{11}$/.test(rpps || "")) {
      return reponse({ statut: "introuvable", raison: "Le numéro RPPS doit comporter 11 chiffres." });
    }
    if (!nom || !prenom) {
      return reponse({ statut: "nom_different", raison: "Nom et prénom requis pour la vérification." });
    }

    const cle = Deno.env.get("ESANTE_API_KEY");
    if (!cle) {
      return reponse({ statut: "indisponible", raison: "Clé API ANS non configurée côté serveur." });
    }

    // Interrogation de l'Annuaire Santé (FHIR)
    const url =
      `https://gateway.api.esante.gouv.fr/fhir/v1/Practitioner?identifier=${rpps}&_format=json`;
    const res = await fetch(url, {
      headers: { "ESANTE-API-KEY": cle, "Accept": "application/fhir+json" },
    });
    if (!res.ok) {
      return reponse({ statut: "indisponible", raison: `Annuaire injoignable (code ${res.status}).` });
    }

    const data = await res.json();
    const prat = data?.entry?.[0]?.resource;
    if (!prat) return reponse({ statut: "introuvable" });

    // Nom officiel
    const n = prat.name?.[0] || {};
    const famille = n.family || "";
    const prenoms = (n.given || []).join(" ");
    const nomOfficiel = `${prenoms} ${famille}`.trim();

    // Profession(s) déclarée(s)
    const professions = (prat.qualification || [])
      .flatMap((q: { code?: { coding?: { display?: string }[] } }) =>
        (q.code?.coding || []).map((c) => c.display || ""))
      .filter(Boolean)
      .join(" · ");

    // 1. La profession doit être diététicien
    if (!norm(professions).includes("dietet")) {
      return reponse({
        statut: "profession_incorrecte",
        nomOfficiel,
        profession: professions || "profession non renseignée dans l'annuaire",
      });
    }

    // 2. Le nom et le prénom saisis doivent correspondre au nom officiel
    if (!motCommun(nom, famille) || !motCommun(prenom, prenoms)) {
      return reponse({ statut: "nom_different", nomOfficiel, profession: professions });
    }

    // ✓ Vérifié
    return reponse({
      statut: "verifie",
      nomOfficiel,
      profession: professions,
      ville: prat.address?.[0]?.city || "",
    });
  } catch (e) {
    return reponse({ statut: "indisponible", raison: String(e) });
  }
});
