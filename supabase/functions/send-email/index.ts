/**
 * Supabase Edge Function : send-email
 * Appelle l'API Resend pour envoyer les emails transactionnels NutriDoc
 *
 * Déploiement :
 *   supabase functions deploy send-email
 *
 * Variables d'environnement à définir dans Supabase Dashboard → Edge Functions :
 *   RESEND_API_KEY = re_xxxxxxxxxxxxxxxx
 *   FROM_EMAIL     = NutriDoc <noreply@calidocsante.fr>
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API = "https://api.resend.com/emails";

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL     = Deno.env.get("FROM_EMAIL") || "NutriDoc <noreply@calidocsante.fr>";

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY manquante" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { type, to, data } = await req.json();

    // Construire l'email selon le type
    const email = buildEmail(type, to, data, FROM_EMAIL);
    if (!email) {
      return new Response(JSON.stringify({ error: `Type d'email inconnu : ${type}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Envoyer via Resend
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(email),
    });

    const result = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({ error: result }), {
        status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── Routing des templates ────────────────────────────────────
function buildEmail(type: string, to: string, data: Record<string, any>, from: string) {
  const templates: Record<string, () => { from: string; to: string[]; subject: string; html: string }> = {

    // 1. Confirmation de bilan reçu
    confirmation_bilan: () => ({
      from, to: [to],
      subject: "✓ Votre bilan NutriDoc a bien été reçu",
      html: templateBilanRecu(data),
    }),

    // 2. Plan alimentaire livré au patient
    plan_livre: () => ({
      from, to: [to],
      subject: "🎉 Votre plan alimentaire NutriDoc est prêt !",
      html: templatePlanLivre(data),
    }),

    // 3. Nouvelle demande de plan → diététicien
    nouvelle_demande_diet: () => ({
      from, to: [to],
      subject: `📋 Nouvelle demande de plan — ${data.patient_prenom || "Patient"} · NutriDoc`,
      html: templateNouvelleDemandeD(data),
    }),

    // 4. Attestation mutuelle après visio
    attestation_mutuelle: () => ({
      from, to: [to],
      subject: "📄 Votre attestation de consultation diététique — NutriDoc",
      html: templateAttestationMutuelle(data),
    }),

    // 5. Confirmation de réservation visio
    confirmation_visio: () => ({
      from, to: [to],
      subject: `📅 Visio confirmée le ${data.date || ""} à ${data.heure || ""} — NutriDoc`,
      html: templateConfirmationVisio(data),
    }),

    // 6. Bienvenue nouveau compte
    bienvenue: () => ({
      from, to: [to],
      subject: "Bienvenue sur NutriDoc 👋",
      html: templateBienvenue(data),
    }),

    // 7. Red flag — renvoi vers diét spécialisé
    redflag_patient: () => ({
      from, to: [to],
      subject: "Votre dossier NutriDoc — Prise en charge spécialisée",
      html: templateRedFlagPatient(data),
    }),

    // 8. Ticket support reçu
    ticket_support: () => ({
      from, to: [to],
      subject: `[Support NutriDoc] Ticket reçu — ${data.titre || ""}`,
      html: templateTicketSupport(data),
    }),
  };

  return templates[type]?.() ?? null;
}

// ── BASE TEMPLATE ────────────────────────────────────────────
const BASE = (content: string) => `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f7f9f7;color:#0d2018}
  .wrap{max-width:560px;margin:0 auto;padding:32px 16px}
  .card{background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb}
  .header{background:#0d2018;padding:24px 28px;display:flex;align-items:center;gap:10px}
  .header-logo{font-size:22px;font-weight:700;color:#fff;font-family:Georgia,serif}
  .header-logo em{font-style:italic;color:#5DCAA5}
  .body{padding:28px}
  .title{font-size:20px;font-weight:600;color:#0d2018;margin-bottom:8px;font-family:Georgia,serif}
  .subtitle{font-size:14px;color:#6b7b74;margin-bottom:20px;line-height:1.6}
  .info-box{background:#f0f9f4;border:1px solid #9FE1CB;border-radius:8px;padding:14px 16px;margin:16px 0}
  .info-row{display:flex;justify-content:space-between;font-size:13px;padding:4px 0;border-bottom:1px solid #E1F5EE}
  .info-row:last-child{border-bottom:none}
  .info-label{color:#6b7b74}
  .info-val{font-weight:500;color:#0d2018}
  .cta{display:inline-block;background:#1D9E75;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:14px;font-weight:500;margin:16px 0}
  .badge{display:inline-block;background:#E1F5EE;color:#0f6e56;font-size:11px;font-weight:500;padding:3px 10px;border-radius:999px;margin-bottom:12px}
  .alert{background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px 14px;font-size:13px;color:#92400e;margin:12px 0}
  .footer{padding:16px 28px;background:#f7f9f7;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center;line-height:1.8}
  p{font-size:14px;line-height:1.7;color:#374151;margin-bottom:12px}
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="header">
      <div class="header-logo">Nutri<em>Doc</em></div>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      NutriDoc by CaliDoc Santé · <a href="mailto:contact@calidocsante.fr" style="color:#1D9E75">contact@calidocsante.fr</a><br>
      <a href="{{unsubscribe}}" style="color:#9ca3af">Se désinscrire des emails</a>
    </div>
  </div>
</div>
</body>
</html>`;

// ── TEMPLATES ────────────────────────────────────────────────
function templateBilanRecu(d: any) {
  return BASE(`
    <div class="badge">✓ Bilan reçu</div>
    <div class="title">Votre bilan a bien été reçu, ${d.prenom || ""}  !</div>
    <p class="subtitle">Un diététicien certifié RPPS va analyser votre dossier et valider votre plan sous 48h max jours ouvrés.</p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Objectif</span><span class="info-val">${d.objectif || "—"}</span></div>
      <div class="info-row"><span class="info-label">Ville</span><span class="info-val">${d.ville || "—"}</span></div>
      <div class="info-row"><span class="info-label">Délai estimé</span><span class="info-val">48h max jours ouvrés</span></div>
      <div class="info-row"><span class="info-label">Statut</span><span class="info-val" style="color:#1D9E75">En attente de validation</span></div>
    </div>
    <a href="https://nutridoc.fr/dashboard.html" class="cta">Voir mon tableau de bord →</a>
    <p style="font-size:12px;color:#9ca3af">Vous recevrez un email dès que votre plan sera prêt.</p>
  `);
}

function templatePlanLivre(d: any) {
  return BASE(`
    <div class="badge">🎉 Plan disponible</div>
    <div class="title">Votre plan alimentaire est prêt !</div>
    <p class="subtitle">Votre plan personnalisé avec grammages précis a été validé et signé par <strong>${d.diet_nom || "votre diététicien"}</strong>.</p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Validé par</span><span class="info-val">${d.diet_nom || "—"} · RPPS ${d.diet_rpps || "vérifié"}</span></div>
      <div class="info-row"><span class="info-label">Calories / jour</span><span class="info-val">${d.kcal || "—"} kcal</span></div>
      <div class="info-row"><span class="info-label">Protéines</span><span class="info-val">${d.proteines || "—"} g</span></div>
    </div>
    <a href="https://nutridoc.fr/dashboard.html" class="cta">Télécharger mon plan PDF →</a>
    ${d.visio_dispo ? `<div class="alert">💬 Votre diététicien propose des consultations visio (50 €) — remboursables par votre mutuelle. <a href="https://nutridoc.fr/dashboard.html" style="color:#92400e">Réserver une visio</a></div>` : ""}
  `);
}

function templateNouvelleDemandeD(d: any) {
  return BASE(`
    <div class="badge">📋 Nouvelle demande</div>
    <div class="title">Un nouveau dossier vous attend</div>
    <p class="subtitle">Un patient de votre zone géographique vient de soumettre un bilan. Vous avez <strong>4 heures</strong> pour accepter avant diffusion nationale.</p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Patient</span><span class="info-val">${d.patient_prenom || "—"} · ${d.age || "—"} ans</span></div>
      <div class="info-row"><span class="info-label">Objectif</span><span class="info-val">${d.objectif || "—"}</span></div>
      <div class="info-row"><span class="info-label">Ville</span><span class="info-val">${d.ville || "—"}</span></div>
      <div class="info-row"><span class="info-label">Votre rémunération</span><span class="info-val" style="color:#1D9E75">${d.remuneration || "18"} €</span></div>
      ${d.has_redflag ? `<div class="info-row"><span class="info-label" style="color:#ef4444">⚠ Red flag</span><span class="info-val" style="color:#ef4444">${d.redflag_label || "Dossier sensible"}</span></div>` : ""}
    </div>
    <a href="https://nutridoc.fr/dietitian.html" class="cta">Voir le dossier et accepter →</a>
    <p style="font-size:12px;color:#9ca3af">Si vous n'acceptez pas sous 4h, la demande sera transmise à d'autres diététiciens.</p>
  `);
}

function templateAttestationMutuelle(d: any) {
  return BASE(`
    <div class="badge">📄 Attestation mutuelle</div>
    <div class="title">Attestation de consultation diététique</div>
    <p class="subtitle">Voici votre attestation de consultation à transmettre à votre mutuelle pour remboursement.</p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Patient</span><span class="info-val">${d.patient_prenom || ""} ${d.patient_nom || ""}</span></div>
      <div class="info-row"><span class="info-label">Diététicien</span><span class="info-val">${d.diet_nom || "—"}</span></div>
      <div class="info-row"><span class="info-label">N° RPPS</span><span class="info-val">${d.diet_rpps || "—"}</span></div>
      <div class="info-row"><span class="info-label">Date</span><span class="info-val">${d.date || "—"}</span></div>
      <div class="info-row"><span class="info-label">Durée</span><span class="info-val">45 minutes (téléconsultation)</span></div>
      <div class="info-row"><span class="info-label">Montant réglé</span><span class="info-val">50,00 €</span></div>
    </div>
    <div class="alert">📌 Transmettez ce document à votre mutuelle rubrique <strong>"Diététique"</strong> ou <strong>"Prévention"</strong>. Remboursement moyen : 20 à 50 € selon votre contrat.</div>
    <a href="https://nutridoc.fr/dashboard.html" class="cta">Télécharger l'attestation PDF →</a>
  `);
}

function templateConfirmationVisio(d: any) {
  return BASE(`
    <div class="badge">📅 Visio confirmée</div>
    <div class="title">Votre consultation visio est confirmée</div>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Diététicien</span><span class="info-val">${d.diet_nom || "—"}</span></div>
      <div class="info-row"><span class="info-label">Date</span><span class="info-val">${d.date || "—"}</span></div>
      <div class="info-row"><span class="info-label">Heure</span><span class="info-val">${d.heure || "—"}</span></div>
      <div class="info-row"><span class="info-label">Durée</span><span class="info-val">45 minutes</span></div>
      <div class="info-row"><span class="info-label">Montant</span><span class="info-val">50 €</span></div>
    </div>
    <a href="${d.lien_visio || "https://nutridoc.fr/dashboard.html"}" class="cta">Rejoindre la visio →</a>
    <p>Préparez vos questions à l'avance. Votre diététicien aura accès à votre plan et à votre profil.</p>
    <p style="font-size:12px;color:#9ca3af">Rappel : cette consultation est remboursable par votre mutuelle. Une attestation vous sera envoyée après la séance.</p>
  `);
}

function templateBienvenue(d: any) {
  const roleLabels: Record<string, string> = {
    patient:   "patient", dietitian: "diététicien", prescriber: "prescripteur"
  };
  return BASE(`
    <div class="badge">👋 Bienvenue</div>
    <div class="title">Bienvenue sur NutriDoc, ${d.prenom || ""} !</div>
    <p class="subtitle">Votre compte ${roleLabels[d.role] || ""} a bien été créé. Vous pouvez dès maintenant accéder à votre espace.</p>
    ${d.role === "dietitian" ? `<div class="alert">⏳ Votre numéro RPPS est en cours de vérification. Votre compte sera activé sous 24h.</div>` : ""}
    ${d.role === "prescriber" ? `<div class="info-box"><div class="info-row"><span class="info-label">Crédits disponibles</span><span class="info-val" style="color:#1D9E75">${d.credits || "0"} crédits plans</span></div></div>` : ""}
    <a href="https://nutridoc.fr/${d.role === "dietitian" ? "dietitian" : d.role === "prescriber" ? "prescripteur-dashboard" : "dashboard"}.html" class="cta">Accéder à mon espace →</a>
  `);
}

function templateRedFlagPatient(d: any) {
  return BASE(`
    <div class="badge" style="background:#fff7ed;color:#92400e;">⚠ Dossier spécialisé</div>
    <div class="title">Votre dossier nécessite un suivi adapté</div>
    <p class="subtitle">En raison des informations médicales que vous avez renseignées, votre dossier a été transmis à un diététicien spécialisé qui vous contactera directement.</p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Situation détectée</span><span class="info-val">${d.flags_label || "Situation médicale particulière"}</span></div>
      <div class="info-row"><span class="info-label">Prochaine étape</span><span class="info-val">Contact par le diététicien sous 48h</span></div>
    </div>
    <p>Aucun plan automatique ne vous sera proposé sans validation médicale. C'est une mesure de sécurité pour votre santé.</p>
    <a href="https://nutridoc.fr/dashboard.html" class="cta">Voir mon tableau de bord →</a>
  `);
}

function templateTicketSupport(d: any) {
  return BASE(`
    <div class="badge">🎫 Ticket reçu</div>
    <div class="title">Votre ticket support a bien été enregistré</div>
    <div class="info-box">
      <div class="info-row"><span class="info-label">N° ticket</span><span class="info-val">${d.ticket_id || "—"}</span></div>
      <div class="info-row"><span class="info-label">Catégorie</span><span class="info-val">${d.categorie || "—"}</span></div>
      <div class="info-row"><span class="info-label">Priorité</span><span class="info-val">${d.priorite || "normale"}</span></div>
      <div class="info-row"><span class="info-label">Délai de réponse</span><span class="info-val">Sous 24h ouvrées</span></div>
    </div>
    <p>Notre équipe va analyser votre demande. Vous recevrez une réponse à cette adresse email.</p>
    <p style="font-size:12px;color:#9ca3af">Pour toute urgence : <a href="mailto:contact@calidocsante.fr" style="color:#1D9E75">contact@calidocsante.fr</a></p>
  `);
}
