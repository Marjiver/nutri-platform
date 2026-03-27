/**
 * email.js — NutriDoc · Client Resend via Supabase Edge Function
 *
 * Tous les appels email passent par l'Edge Function "send-email"
 * qui détient la clé Resend côté serveur.
 *
 * Usage :
 *   await Email.send('confirmation_bilan', 'patient@mail.fr', { prenom:'Marie', ... })
 *   await Email.planLivre(patientEmail, { diet_nom, kcal, ... })
 */

const SUPABASE_URL = window._supabaseUrl
  || (typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : 'https://phgjpwaptrrjonoimmne.supabase.co');
const SUPABASE_KEY = window._supabaseKey
  || (typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '');

const Email = {

  // ── Méthode générique ─────────────────────────────────────
  async send(type, to, data = {}) {
    if (!to || !to.includes('@')) {
      console.warn('[Email] Adresse invalide, email non envoyé :', to);
      return { skipped: true };
    }

    // En mode démo (pas de Supabase configuré) → juste log
    if (!SUPABASE_KEY || SUPABASE_URL.includes('VOTRE-ID')) {
      console.info(`[Email DEMO] Type: ${type} | To: ${to}`, data);
      return { demo: true };
    }

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ type, to, data }),
      });

      const result = await res.json();
      if (!res.ok) {
        console.error('[Email] Erreur Resend :', result);
        return { error: result };
      }
      console.info(`[Email] ✓ ${type} → ${to} (id: ${result.id})`);
      return { success: true, id: result.id };

    } catch (err) {
      console.error('[Email] Erreur réseau :', err.message);
      return { error: err.message };
    }
  },

  // ── Raccourcis sémantiques ────────────────────────────────

  /** Patient vient de soumettre son bilan */
  async confirmationBilan(email, { prenom, objectif, ville }) {
    return this.send('confirmation_bilan', email, { prenom, objectif, ville });
  },

  /** Diét vient de valider le plan → notifier le patient */
  async planLivre(email, { prenom, diet_nom, diet_rpps, kcal, proteines, visio_dispo }) {
    return this.send('plan_livre', email, { prenom, diet_nom, diet_rpps, kcal, proteines, visio_dispo });
  },

  /** Nouvelle demande de plan → notifier le(s) diét. */
  async nouvelleDemandeD(dietEmail, { patient_prenom, age, objectif, ville, remuneration, has_redflag, redflag_label }) {
    return this.send('nouvelle_demande_diet', dietEmail, {
      patient_prenom, age, objectif, ville, remuneration, has_redflag, redflag_label
    });
  },

  /** Après une visio → attestation mutuelle au patient */
  async attestationMutuelle(email, { patient_prenom, patient_nom, diet_nom, diet_rpps, date }) {
    return this.send('attestation_mutuelle', email, { patient_prenom, patient_nom, diet_nom, diet_rpps, date });
  },

  /** Visio réservée → confirmation patient + diét */
  async confirmationVisio(email, { diet_nom, date, heure, lien_visio }) {
    return this.send('confirmation_visio', email, { diet_nom, date, heure, lien_visio });
  },

  /** Nouveau compte créé */
  async bienvenue(email, { prenom, role, credits }) {
    return this.send('bienvenue', email, { prenom, role, credits });
  },

  /** Red flag détecté → rassurer le patient */
  async redFlagPatient(email, { prenom, flags_label }) {
    return this.send('redflag_patient', email, { prenom, flags_label });
  },

  /** Ticket support soumis */
  async ticketSupport(email, { ticket_id, titre, categorie, priorite }) {
    return this.send('ticket_support', email, { ticket_id, titre, categorie, priorite });
  },
};
