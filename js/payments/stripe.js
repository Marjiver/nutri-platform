/**
 * stripe.js — NutriDoc · Client Stripe Checkout
 *
 * Usage :
 *   StripeCheckout.payerPlan(bilanData)      → redirige vers Stripe Checkout 24,90€
 *   StripeCheckout.payerVisio(slotData)      → redirige vers Stripe Checkout 55€
 *   StripeCheckout.acheterPack(pack)         → redirige vers Stripe Checkout (prescripteur)
 *
 * Packs prescripteur disponibles :
 *   'credits_solo'     → 1 plan    — 24,90€ TTC
 *   'credits_standard' → 10 plans  — 130€ TTC  (13€/plan)
 *   'credits_expert'   → 50 plans  — 500€ TTC  (10€/plan)
 *   'credits_volume'   → 100 plans — 900€ TTC  (9€/plan)
 *
 * Version: 1.1.0 — 2026-04-14 — harmonisation modèle tarifaire
 */

// ── Config ────────────────────────────────────────────────────
const STRIPE_CONFIG = {
  // ⚠ TODO avant mise en ligne : remplacer par votre clé Stripe Live
  publishableKey: 'pk_live_REMPLACER_ICI',

  // URL de votre Edge Function create-checkout
  checkoutFnUrl: 'https://phgjpwaptrrjonoimmne.supabase.co/functions/v1/create-checkout',

  // Clé anon Supabase (pour autoriser l'appel)
  supabaseAnonKey: 'sb_publishable_1qUFDTMK8V0YQ19kHywSig_I4XBpZa2',

  // URLs de redirection après paiement
  successUrl: window.location.origin + '/dashboard.html?paiement=ok',
  cancelUrl:  window.location.origin + '/dashboard.html?paiement=annule',
};

// ── Produits ──────────────────────────────────────────────────
const STRIPE_PRODUCTS = {

  // ── Abonnements patient ──────────────────────────────────────
  abo_essentiel: {
    name:        'NutriDoc Essentiel',
    description: 'Tableau de bord complet · Conseils personnalisés illimités · Menus · Diét. assigné',
    amount:      500,    // 5€/mois TTC
    currency:    'eur',
  },
  abo_premium: {
    name:        'NutriDoc Premium',
    description: '1 plan offert / 3 mois · Accès prioritaire diét. · -20% visios',
    amount:      900,    // 9€/mois TTC
    currency:    'eur',
  },
  abo_premium_an: {
    name:        'NutriDoc Premium — Annuel',
    description: '99€/an · Économisez 9€ vs mensuel · 1 plan offert / 3 mois',
    amount:      9900,   // 99€/an TTC
    currency:    'eur',
  },

  // ── Plan alimentaire patient ─────────────────────────────────
  plan: {
    name:        'Plan alimentaire personnalisé — NutriDoc',
    description: 'Plan validé et signé par un diététicien certifié RPPS · Livré sous 48h',
    amount:      2490,   // 24,90€ TTC
    currency:    'eur',
  },

  // ── Consultation visio ───────────────────────────────────────
  visio: {
    name:        'Consultation visio diététicien — NutriDoc',
    description: 'Consultation de 45 min avec votre diététicien · Remboursable mutuelle',
    amount:      5500,   // 55€ TTC (47€ reversés au diét., 8€ commission NutriDoc)
    currency:    'eur',
  },

  // ── Packs crédits prescripteur ───────────────────────────────
  credits_solo: {
    name:        'Pack Solo — 1 plan NutriDoc',
    description: '1 plan alimentaire validé par un diét. RPPS · Livraison sous 48h',
    amount:      2490,   // 24,90€ TTC
    currency:    'eur',
  },
  credits_standard: {
    name:        'Pack Standard — 10 plans NutriDoc',
    description: '10 plans alimentaires validés par un diét. RPPS · 13€/plan',
    amount:      13000,  // 130€ TTC
    currency:    'eur',
  },
  credits_expert: {
    name:        'Pack Expert — 50 plans NutriDoc',
    description: '50 plans alimentaires validés par un diét. RPPS · 10€/plan',
    amount:      50000,  // 500€ TTC
    currency:    'eur',
  },
  credits_volume: {
    name:        'Pack Volume — 100 plans NutriDoc',
    description: '100 plans alimentaires validés par un diét. RPPS · 9€/plan',
    amount:      90000,  // 900€ TTC
    currency:    'eur',
  },
};

// ── Récupérer l'utilisateur courant (synchrone pour localStorage) ──
function getCurrentUserSync() {
  try {
    const bilan = JSON.parse(localStorage.getItem('nutridoc_bilan') || '{}');
    if (bilan.email) {
      return {
        id: bilan.id || 'local_' + Date.now(),
        email: bilan.email,
        prenom: bilan.prenom || '',
        nom: bilan.nom || '',
        role: 'patient',
        niveau_abo: bilan.niveau_abo || 'gratuit'
      };
    }
    const presc = JSON.parse(localStorage.getItem('nutridoc_prescripteur') || '{}');
    if (presc.email) {
      return {
        id: presc.id || 'local_' + Date.now(),
        email: presc.email,
        prenom: presc.prenom || '',
        nom: presc.nom || '',
        role: 'prescriber',
        credits: presc.credits || 0
      };
    }
    const diet = JSON.parse(localStorage.getItem('nutridoc_dieteticien') || '{}');
    if (diet.email) {
      return {
        id: diet.id || 'local_' + Date.now(),
        email: diet.email,
        prenom: diet.prenom || '',
        nom: diet.nom || '',
        role: 'dietitian',
        rpps: diet.rpps || ''
      };
    }
  } catch (e) {
    console.warn('getCurrentUserSync:', e);
  }
  return null;
}

// ── Récupérer l'utilisateur courant (async pour Supabase) ──
async function getCurrentUserAsync() {
  if (typeof MODE_SUPA !== 'undefined' && MODE_SUPA && typeof getCurrentUser !== 'undefined') {
    try {
      const user = await getCurrentUser();
      if (user) return user;
    } catch (e) {
      console.warn('getCurrentUserAsync Supabase:', e);
    }
  }
  return getCurrentUserSync();
}

// ── API publique ──────────────────────────────────────────────
const StripeCheckout = {

  /**
   * Patient — s'abonner (5€ ou 9€/mois)
   * @param {'essentiel'|'premium'|'premium_an'} niveau
   */
  async abonnerPatient(niveau = 'essentiel') {
    const user = await getCurrentUserAsync();
    const key  = 'abo_' + niveau;
    return this._checkout(key, {
      type:           'abonnement_patient',
      patient_id:     user?.id     ?? 'demo',
      patient_email:  user?.email  ?? '',
      patient_prenom: user?.prenom ?? '',
      niveau,
    });
  },

  /**
   * Patient — payer son plan (24,90€)
   */
  async payerPlan(bilanData = {}) {
    const user = await getCurrentUserAsync();
    return this._checkout('plan', {
      type:           'plan',
      patient_id:     user?.id          ?? 'demo',
      patient_email:  user?.email       ?? bilanData.email ?? '',
      patient_prenom: bilanData.prenom  ?? user?.prenom ?? '',
      bilan_id:       bilanData.id      ?? '',
      objectif:       bilanData.objectif ?? '',
      ville:          bilanData.ville   ?? '',
      age:            String(bilanData.age ?? ''),
    });
  },

  /**
   * Patient — réserver une visio (55€)
   * @param {Object} slotData - { slot_key, diet_id, diet_nom, diet_email }
   */
  async payerVisio(slotData = {}) {
    const user = await getCurrentUserAsync();
    return this._checkout('visio', {
      type:           'visio',
      patient_id:     user?.id     ?? 'demo',
      patient_email:  user?.email  ?? '',
      patient_prenom: user?.prenom ?? '',
      diet_id:        slotData.diet_id    ?? '',
      diet_nom:       slotData.diet_nom   ?? '',
      diet_email:     slotData.diet_email ?? '',
      slot_key:       slotData.slot_key   ?? '',
    });
  },

  /**
   * Prescripteur — acheter un pack de crédits
   * @param {'credits_solo'|'credits_standard'|'credits_expert'|'credits_volume'} pack
   */
  async acheterPack(pack = 'credits_standard') {
    const user = await getCurrentUserAsync();
    const PLANS_MAP = {
      credits_solo:     1,
      credits_standard: 10,
      credits_expert:   50,
      credits_volume:   100,
    };
    return this._checkout(pack, {
      type:               'pack_plans',
      prescriber_id:      user?.id     ?? 'demo',
      prescriber_email:   user?.email  ?? '',
      prescriber_prenom:  user?.prenom ?? '',
      pack,
      nb_plans: String(PLANS_MAP[pack] ?? 1),
    });
  },

  // ── Interne : créer la session et rediriger ──────────────────
  async _checkout(productKey, metadata) {
    const product = STRIPE_PRODUCTS[productKey];
    if (!product) {
      console.error('Produit introuvable :', productKey);
      alert('Produit introuvable : ' + productKey);
      return;
    }

    const btn = document.activeElement;
    const originalText = btn?.textContent;
    if (btn) { btn.disabled = true; btn.textContent = 'Redirection…'; }

    try {
      // Mode démo
      if (STRIPE_CONFIG.publishableKey === 'pk_live_REMPLACER_ICI') {
        console.info('[Stripe DEMO] Checkout simulé :', productKey, metadata);
        this._simulerPaiement(productKey, metadata);
        if (btn) { btn.disabled = false; btn.textContent = originalText; }
        return;
      }

      // Production : appel Edge Function create-checkout
      const res = await fetch(STRIPE_CONFIG.checkoutFnUrl, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${STRIPE_CONFIG.supabaseAnonKey}`,
        },
        body: JSON.stringify({
          product_key: productKey,
          product,
          metadata,
          success_url: STRIPE_CONFIG.successUrl,
          cancel_url:  STRIPE_CONFIG.cancelUrl,
        }),
      });

      const { url, error } = await res.json();
      if (error) throw new Error(error);
      window.location.href = url;

    } catch (err) {
      console.error('[Stripe] Erreur :', err);
      alert('Erreur lors de la création du paiement. Veuillez réessayer.');
      if (btn) { btn.disabled = false; btn.textContent = originalText; }
    }
  },

  // ── Simulateur paiement (mode démo) ─────────────────────────
  _simulerPaiement(productKey, metadata) {
    const LABELS = {
      abo_essentiel:    '✓ Abonnement Essentiel activé (5€/mois) — démo',
      abo_premium:      '✓ Abonnement Premium activé (9€/mois) — démo',
      abo_premium_an:   '✓ Abonnement Premium annuel activé (99€/an) — démo',
      plan:             '✓ Plan alimentaire commandé (24,90€) — démo',
      visio:            '✓ Visio réservée (55€) — démo',
      credits_solo:     '✓ Pack Solo — 1 plan (24,90€) — démo',
      credits_standard: '✓ Pack Standard — 10 plans (130€ — 13€/plan) — démo',
      credits_expert:   '✓ Pack Expert — 50 plans (500€ — 10€/plan) — démo',
      credits_volume:   '✓ Pack Volume — 100 plans (900€ — 9€/plan) — démo',
    };

    if (productKey === 'plan') {
      const bilan = JSON.parse(localStorage.getItem('nutridoc_bilan') || '{}');
      bilan.plan_paye   = true;
      bilan.plan_paid_at = new Date().toISOString();
      localStorage.setItem('nutridoc_bilan', JSON.stringify(bilan));
    }

    if (productKey === 'abo_essentiel') {
      const bilan = JSON.parse(localStorage.getItem('nutridoc_bilan') || '{}');
      bilan.niveau_abo = 'essentiel';
      localStorage.setItem('nutridoc_bilan', JSON.stringify(bilan));
    }

    if (productKey === 'abo_premium' || productKey === 'abo_premium_an') {
      const bilan = JSON.parse(localStorage.getItem('nutridoc_bilan') || '{}');
      bilan.niveau_abo = 'premium';
      localStorage.setItem('nutridoc_bilan', JSON.stringify(bilan));
    }

    if (productKey.startsWith('credits_')) {
      const map = { credits_solo: 1, credits_standard: 10, credits_expert: 50, credits_volume: 100 };
      const presc = JSON.parse(localStorage.getItem('nutridoc_prescripteur') || '{}');
      presc.credits = (presc.credits || 0) + (map[productKey] || 1);
      localStorage.setItem('nutridoc_prescripteur', JSON.stringify(presc));
    }

    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);background:#0d2018;color:#fff;padding:.75rem 1.5rem;border-radius:999px;font-size:.875rem;z-index:9999;box-shadow:0 8px 32px rgba(0,0,0,.2);';
    toast.innerHTML = LABELS[productKey] || '✓ Paiement simulé';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);

    if (productKey.startsWith('abo_') && window.location.pathname.includes('dashboard.html')) {
      setTimeout(() => window.location.reload(), 2000);
    }
  },
};

// ── Gérer le retour depuis Stripe ─────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('paiement') === 'ok') {
    const banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);background:#1D9E75;color:#fff;padding:.65rem 1.5rem;border-radius:999px;font-size:.875rem;z-index:500;box-shadow:0 4px 20px rgba(29,158,117,.35);';
    banner.textContent = '✓ Paiement confirmé ! Votre demande est en cours de traitement.';
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 5000);
    window.history.replaceState({}, '', window.location.pathname);
  }
  if (params.get('paiement') === 'annule') {
    const banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);background:#f59e0b;color:#fff;padding:.65rem 1.5rem;border-radius:999px;font-size:.875rem;z-index:500;';
    banner.textContent = 'Paiement annulé. Vous pouvez réessayer.';
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 4000);
    window.history.replaceState({}, '', window.location.pathname);
  }
});

window.StripeCheckout = StripeCheckout;
