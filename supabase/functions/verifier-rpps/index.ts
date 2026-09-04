// ═══════════════════════════════════════════════════════════════
//  NutriDoc — Edge Function : verifier-rpps
//  Vérifie un diététicien dans l'Annuaire Santé officiel (ANS).
//  Bloque l'inscription si : RPPS introuvable, praticien inactif,
//  profession ≠ diététicien, ou nom/prénom saisis ≠ nom officiel.
//
//  SECRET REQUIS (Supabase → Edge Functions → Secrets) :
//    ESANTE_API_KEY = clé obtenue sur https://portal.api.esante.gouv.fr
//    (Gravitee : créer un compte → créer une application → souscrire à
//     « API Annuaire Santé en libre accès ». Gratuit, immédiat.)
//
//  API v2 — https://gateway.api.esante.gouv.fr/fhir/v2/
//  La v1 est dépréciée (« sera prochainement décommissionnée », ANS) et
//  ses dates d'arrêt annoncées, mars puis juillet 2026, sont passées.
//  Le changement de version n'est pas cosmétique : en v1 la profession
//  était portée par PractitionerRole, pas par Practitioner. Ce code lit
//  practitioner.qualification, qui n'existe que depuis la v2 — sur la v1
//  il aurait rejeté tous les dietéticiens, y compris les vrais.
// ═══════════════════════════════════════════════════════════════

const API_BASE = "https://gateway.api.esante.gouv.fr/fhir/v2";

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

type Nom = { family?: string; given?: string[] };

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

    // Interrogation de l'Annuaire Santé (FHIR R4).
    // `identifier` sans préfixe de système : la recherche porte alors sur la
    // valeur seule, ce qui evite de dépendre de l'OID exact du référentiel.
    const url = `${API_BASE}/Practitioner?identifier=${encodeURIComponent(rpps)}&_count=1`;

    // L'annuaire répond parfois lentement ; sans borne, la fonction resterait
    // suspendue et l'inscription figée sur son écran de chargement.
    const stop = AbortSignal.timeout(12_000);
    const res = await fetch(url, {
      headers: { "ESANTE-API-KEY": cle, "Accept": "application/fhir+json" },
      signal: stop,
    });

    if (!res.ok) {
      // 401/403 = clé refusée : à distinguer d'une panne de l'annuaire, sinon
      // on cherche un incident chez l'ANS alors que c'est la clé qui est morte.
      const raison = (res.status === 401 || res.status === 403)
        ? `Clé API ANS refusée (code ${res.status}). Vérifiez la souscription sur portal.api.esante.gouv.fr.`
        : `Annuaire injoignable (code ${res.status}).`;
      return reponse({ statut: "indisponible", raison });
    }

    const data = await res.json();
    const prat = data?.entry?.[0]?.resource;
    if (!prat) return reponse({ statut: "introuvable" });

    // Noms : la v2 expose le nom d'exercice ET le nom de naissance. On compare
    // la saisie a TOUS les noms retournes — sinon un nom d'épouse déclaré au
    // site mais absent du premier enregistrement ferait échouer un vrai
    // praticien.
    const noms: Nom[] = Array.isArray(prat.name) ? prat.name : [];
    const n0 = noms[0] || {};
    const nomOfficiel = `${(n0.given || []).join(" ")} ${n0.family || ""}`.trim();

    // Profession(s) déclarée(s). En v2, `qualification` porte la catégorie
    // professionnelle, la profession et les savoir-faire : plusieurs entrées.
    const professions = (prat.qualification || [])
      .flatMap((q: { code?: { coding?: { display?: string }[] } }) =>
        (q.code?.coding || []).map((c) => c.display || ""))
      .filter(Boolean)
      .join(" · ");

    // 1. Un praticien radié ou sans activité ne doit pas passer. `active`
    //    absent n'est pas un refus : on ne bloque que sur un faux explicite.
    if (prat.active === false) {
      return reponse({
        statut: "inactif",
        nomOfficiel,
        profession: professions,
      });
    }

    // 2. La profession doit être diététicien
    if (!norm(professions).includes("dietet")) {
      return reponse({
        statut: "profession_incorrecte",
        nomOfficiel,
        profession: professions || "profession non renseignée dans l'annuaire",
      });
    }

    // 3. Le nom et le prénom saisis doivent correspondre à l'un des noms officiels
    const concorde = noms.some((n) =>
      motCommun(nom, n.family || "") && motCommun(prenom, (n.given || []).join(" "))
    );
    if (!concorde) {
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
    // Timeout compris : tout échec inattendu bascule en contrôle humain,
    // jamais en « vérifié ».
    return reponse({ statut: "indisponible", raison: String(e) });
  }
});
