/**
 * stripe.js — NutriDoc · Client Stripe Checkout
 *
 * Usage :
 *   Stripe.payerPlan(bilanData)      → redirige vers Stripe Checkout 24,90€
 *   Stripe.payerVisio(slotData)      → redirige vers Stripe Checkout 55€
 *   Stripe.acheterCredits(pack)      → redirige vers Stripe Checkout (pro)
 *
 * La clé publishable est publique (côté client).
 * La création de session Checkout se fait via une Edge Function
 * qui détient la clé secrète.
 */

// ── Config ────────────────────────────────────────────────────
const STRIPE_CONFIG = {
  // Remplacer par vos vraies clés Stripe
  publishableKey: 'pk_test_VOTRE_CLE_PUBLISHABLE',

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
  plan: {
    name:        'Plan alimentaire personnalisé — NutriDoc',
    description: 'Plan validé et signé par un diététicien certifié RPPS · Livré sous 48h',
    amount:      2490,   // centimes TTC
    currency:    'eur',
  },
  visio: {
    name:        'Consultation visio diététicien — NutriDoc',
    description: 'Consultation de 45 min avec votre diététicien · Remboursable mutuelle',
    amount:      5500,
    currency:    'eur',
  },
  credits_decouverte: {
    name:        'Pack Solo — 1 plan NutriDoc Pro',
    description: '10 plans alimentaires validés · 20 € / plan',
    amount:      2400,   // 49€ HT × 1,20 TVA = 58,80€ TTC
    currency:    'eur',
  },
  credits_pro: {
    name:        'Pack Équipe — 10 plans NutriDoc Pro',
    description: '20 plans alimentaires validés · 18 € / plan',
    amount:      21600,  // 89€ HT × 1,20 = 106,80€ TTC
    currency:    'eur',
  },
  credits_volume: {
    name:        'Pack Clinique — 20 plans NutriDoc Pro',
    description: '50 plans alimentaires validés · 17 € / plan',
    amount:      40800,  // 219€ HT × 1,20 = 262,80€ TTC
    currency:    'eur',
  },
};

// ── API publique ──────────────────────────────────────────────
const StripeCheckout = {

  /**
   * Patient — payer le plan alimentaire (24,90€)
   * @param {Object} bilanData - données du bilan patient
   */
  async payerPlan(bilanData = {}) {
    const user = getCurrentUser();
    return this._checkout('plan', {
      type:            'plan',
      patient_id:      user?.id      ?? 'demo',
      patient_email:   user?.email   ?? bilanData.email ?? '',
      patient_prenom:  bilanData.prenom   ?? '',
      bilan_id:        bilanData.id       ?? '',
      objectif:        bilanData.objectif ?? '',
      ville:           bilanData.ville    ?? '',
      age:             String(bilanData.age ?? ''),
    });
  },

  /**
   * Patient — réserver une visio (55€)
   * @param {Object} slotData - { slot_key, diet_id, diet_nom, diet_email }
   */
  async payerVisio(slotData = {}) {
    const user = getCurrentUser();
    return this._checkout('visio', {
      type:            'visio',
      patient_id:      user?.id    ?? 'demo',
      patient_email:   user?.email ?? '',
      patient_prenom:  user?.prenom ?? '',
      diet_id:         slotData.diet_id   ?? '',
      diet_nom:        slotData.diet_nom  ?? '',
      diet_email:      slotData.diet_email ?? '',
      slot_key:        slotData.slot_key  ?? '',
    });
  },

  /**
   * Prescripteur — acheter un pack de crédits
   * @param {'decouverte'|'pro'|'volume'} pack
   */
  async acheterPack(pack = 'pack_dix') {
    const user = getCurrentUser();
    const PLANS_MAP = { pack_solo: 1, pack_dix: 10, pack_vingt: 20, pack_cinquante: 50 };
    return this._checkout(pack, {
      type:               'pack_plans',
      prescriber_id:      user?.id     ?? 'demo',
      prescriber_email:   user?.email  ?? '',
      prescriber_prenom:  user?.prenom ?? '',
      pack,
      nb_plans:           String(PLANS_MAP[pack] ?? 1),
    });
  },

  // ── Interne : créer la session et rediriger ──────────────────
  async _checkout(productKey, metadata) {
    const product = STRIPE_PRODUCTS[productKey];
    if (!product) { alert('Produit introuvable : ' + productKey); return; }

    // Afficher un état de chargement
    const btn = document.activeElement;
    const originalText = btn?.textContent;
    if (btn) { btn.disabled = true; btn.textContent = 'Redirection…'; }

    try {
      // Mode démo : pas de vraie session Stripe
      if (STRIPE_CONFIG.publishableKey.includes('VOTRE_CLE')) {
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

      // Rediriger vers Stripe Checkout
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
      plan:               '✓ Plan alimentaire commandé (24,90€) — démo',
      visio:              '✓ Visio réservée (55€) — démo',
      pack_solo:          '✓ 1 plan commandé (20€) — démo',
      pack_dix:           '✓ 10 plans commandés (180€) — démo',
      pack_vingt:         '✓ 20 plans commandés (340€) — démo',
      pack_cinquante:     '✓ 50 plans commandés (840€) — démo',
    };

    // Sauvegarder en local pour la démo
    if (productKey === 'plan') {
      const bilan = JSON.parse(localStorage.getItem('nutridoc_bilan') || '{}');
      bilan.plan_paye = true;
      bilan.plan_paid_at = new Date().toISOString();
      localStorage.setItem('nutridoc_bilan', JSON.stringify(bilan));
    }
    if (productKey.startsWith('credits_')) {
      const map = { credits_decouverte:10, credits_pro:20, credits_volume:50 };
      const presc = JSON.parse(localStorage.getItem('nutridoc_prescripteur') || '{}');
      presc.credits = (presc.credits || 0) + (map[productKey] || 10);
      localStorage.setItem('nutridoc_prescripteur', JSON.stringify(presc));
    }

    // Toast de confirmation
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);background:#0d2018;color:#fff;padding:.75rem 1.5rem;border-radius:999px;font-size:.875rem;z-index:9999;box-shadow:0 8px 32px rgba(0,0,0,.2);';
    toast.innerHTML = LABELS[productKey] || '✓ Paiement simulé';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  },
};

// ── Récupérer l'utilisateur courant ──────────────────────────
function getCurrentUser() {
  try {
    const bilan = JSON.parse(localStorage.getItem('nutridoc_bilan') || '{}');
    const presc = JSON.parse(localStorage.getItem('nutridoc_prescripteur') || '{}');
    return bilan.email ? { ...bilan, role:'patient' } :
           presc.email ? { ...presc, role:'prescriber' } : null;
  } catch { return null; }
}

// ── Gérer le retour depuis Stripe ─────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('paiement') === 'ok') {
    // Afficher un message de succès
    const banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);background:#1D9E75;color:#fff;padding:.65rem 1.5rem;border-radius:999px;font-size:.875rem;z-index:500;box-shadow:0 4px 20px rgba(29,158,117,.35);';
    banner.textContent = '✓ Paiement confirmé ! Votre demande est en cours de traitement.';
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 5000);
    // Nettoyer l'URL
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
