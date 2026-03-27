# Configuration Stripe — NutriDoc

## 1. Créer le compte Stripe
→ https://dashboard.stripe.com/register
Utiliser : contact@calidoc-sante.fr

## 2. Récupérer les clés (mode TEST d'abord)
Dashboard Stripe → Développeurs → Clés API

| Clé | Où la mettre |
|-----|-------------|
| `pk_test_xxx` | `js/stripe.js` → STRIPE_CONFIG.publishableKey |
| `sk_test_xxx` | Supabase Secrets → STRIPE_SECRET_KEY |

## 3. Déployer les Edge Functions

```bash
supabase functions deploy create-checkout --project-ref phgjpwaptrrjonoimmne
supabase functions deploy stripe-webhook   --project-ref phgjpwaptrrjonoimmne

supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx     --project-ref phgjpwaptrrjonoimmne
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx   --project-ref phgjpwaptrrjonoimmne
```

## 4. Configurer le Webhook dans Stripe
Dashboard Stripe → Développeurs → Webhooks → Ajouter un endpoint

URL : https://phgjpwaptrrjonoimmne.supabase.co/functions/v1/stripe-webhook

Événements à sélectionner :
- checkout.session.completed ✓
- payment_intent.payment_failed ✓

Copier le "Signing secret" (whsec_xxx) → Supabase Secrets → STRIPE_WEBHOOK_SECRET

## 5. Tester en mode TEST
Carte de test Stripe : 4242 4242 4242 4242 · Date : n'importe quelle date future · CVC : 3 chiffres

## 6. Passer en PRODUCTION
- Remplacer pk_test_ par pk_live_ dans js/stripe.js
- Remplacer sk_test_ par sk_live_ dans Supabase Secrets
- Créer un nouveau webhook avec les clés live
- Activer votre compte Stripe (KYC, informations bancaires)

## 3 flux configurés

| Flux | Montant TTC | Produit Stripe |
|------|-------------|----------------|
| Plan patient | 24,90 € | Paiement unique |
| Visio patient | 55,00 € | Paiement unique |
| Pack Découverte (pro) | 58,80 € | Paiement unique |
| Pack Pro (pro) | 106,80 € | Paiement unique |
| Pack Volume (pro) | 262,80 € | Paiement unique |

## Note TVA
Les montants TTC incluent la TVA 20%. Vous devrez configurer Stripe Tax
ou gérer la TVA manuellement une fois soumise au régime réel.
