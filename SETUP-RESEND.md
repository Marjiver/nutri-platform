# Configuration Resend — NutriDoc

## 1. Créer un compte Resend
→ https://resend.com (gratuit jusqu'à 100 emails/jour, 3 000/mois)

## 2. Obtenir la clé API
Dashboard Resend → API Keys → Create API Key
Nom : "NutriDoc Production"
Permission : "Sending access"
Copier la clé : `re_xxxxxxxxxxxxxxxx`

## 3. Vérifier votre domaine
Dashboard Resend → Domains → Add Domain
Ajouter : `calidocsante.fr`
Ajouter les enregistrements DNS indiqués (SPF, DKIM, DMARC)

## 4. Déployer l'Edge Function Supabase

```bash
# Installer Supabase CLI
npm install -g supabase

# Se connecter
supabase login

# Lier au projet
supabase link --project-ref phgjpwaptrrjonoimmne

# Déployer la fonction
supabase functions deploy send-email

# Définir les variables d'environnement
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
supabase secrets set FROM_EMAIL="NutriDoc <noreply@calidocsante.fr>"
```

## 5. Tester

```bash
curl -X POST https://phgjpwaptrrjonoimmne.supabase.co/functions/v1/send-email \
  -H "Authorization: Bearer VOTRE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "bienvenue",
    "to": "votre@email.fr",
    "data": { "prenom": "Test", "role": "patient" }
  }'
```

## Types d'emails disponibles

| Type | Déclencheur |
|------|-------------|
| `confirmation_bilan` | Patient soumet le bilan |
| `plan_livre` | Diét valide le plan |
| `nouvelle_demande_diet` | Nouvelle demande dans la file |
| `attestation_mutuelle` | Après une visio |
| `confirmation_visio` | Réservation de visio |
| `bienvenue` | Inscription (tout profil) |
| `redflag_patient` | Red flag détecté dans le bilan |
| `ticket_support` | Ticket support soumis |
