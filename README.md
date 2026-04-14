# NutriDoc — Plateforme de plans alimentaires légaux

> Générez et validez des plans alimentaires personnalisés en 48h, signés par un diététicien certifié RPPS.  
> Produit de **CaliDoc Santé** · Déployé sur `nutridoc.calidoc-sante.fr`

---

## Concept

En France, seul le diététicien peut légalement prescrire des plans alimentaires. NutriDoc connecte n'importe quel professionnel (coach, kiné, infirmier…) à un réseau de diététiciens RPPS vérifiés pour que chaque plan soit produit et signé légalement — en moins de 48h.

### Les 4 profils

| Profil | Rôle |
|---|---|
| **Patient** | Commande un plan alimentaire personnalisé (24,90€) |
| **Diététicien** | Valide et signe les plans · Abonnement 0 à 59€/mois |
| **Prescripteur** | Coach, kiné, infirmier… revend des plans via CRM · Packs crédits |
| **Partenaire** | Maison de santé, salle de sport · Multi-praticien *(coming soon)* |

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | HTML5 · CSS3 · Vanilla JS · PWA |
| Auth & BDD | Supabase (PostgreSQL + RLS) |
| Paiements | Stripe Connect (Checkout + Edge Functions) |
| Hébergement | GitHub Pages → OVH (prod) |
| Emails | Resend |
| Polices | Google Fonts — Playfair Display + Outfit |

---

## Structure des fichiers

```
nutri-platform/
│
├── index.html                        ← Page d'accueil
│
├── css/
│   ├── style.css                     ← Styles globaux
│   ├── home.css                      ← Styles pages marketing
│   ├── dark-mode.css                 ← Thème sombre
│   ├── dark-mode-variables.css       ← Variables dark mode
│   ├── admin.css                     ← Styles admin
│   └── partenaires.css               ← Styles partenaires
│
├── js/
│   ├── core/
│   │   ├── auth.js                   ← Authentification Supabase
│   │   ├── constants.js              ← Constantes globales & tarifs
│   │   ├── validation.js             ← Validation formulaires
│   │   └── ciqual-data.js            ← Base données CIQUAL (aliments)
│   ├── features/
│   │   ├── bilan.js                  ← Formulaire bilan patient
│   │   ├── dashboard.js              ← Dashboard patient
│   │   ├── dietitian.js              ← Espace diététicien
│   │   ├── prescripteur-crm.js       ← CRM prescripteur
│   │   └── prescripteur-dashboard.js ← Dashboard prescripteur
│   ├── forms/
│   │   ├── inscription-dieteticien.js
│   │   └── inscription-prescripteur.js
│   ├── payments/
│   │   └── stripe.js                 ← Client Stripe Checkout
│   ├── ui/
│   │   ├── cookies.js                ← Bandeau RGPD
│   │   ├── nav.js                    ← Navigation
│   │   ├── dark-mode.js              ← Toggle dark mode
│   │   ├── home.js                   ← Scripts page d'accueil
│   │   ├── chatbot-widget.js         ← Widget chatbot
│   │   ├── theme-selector.js         ← Sélecteur de thème
│   │   ├── support.js                ← Support client
│   │   └── quiz.js                   ← Quiz nutrition
│   ├── utils/
│   │   ├── auto-save.js              ← Sauvegarde automatique
│   │   ├── backup.js                 ← Backup données
│   │   ├── email.js                  ← Envoi emails (Resend)
│   │   ├── error-handler.js          ← Gestion erreurs globale
│   │   ├── export-csv.js             ← Export CSV
│   │   ├── pdf-plan.js               ← Génération PDF plans
│   │   ├── performance.js            ← Optimisations perf
│   │   ├── pwa.js                    ← Service Worker & PWA
│   │   ├── queue.js                  ← File d'attente plans
│   │   ├── seo-manager.js            ← Gestion SEO dynamique
│   │   ├── version-manager.js        ← Gestion versions
│   │   └── webhook-handler.js        ← Webhooks Stripe/Supabase
│   ├── admin/
│   │   ├── admin.js                  ← Interface admin
│   │   └── admin-auth.js             ← Auth admin
│   ├── legacy/
│   │   ├── main.js                   ← Point d'entrée (legacy)
│   │   └── dossier-patient.js        ← Gestion dossiers (legacy)
│   ├── modules/
│   │   └── partenaires.js            ← Module partenaires
│   └── sw.js                         ← Service Worker PWA
│
├── assets/                           ← Images, icônes, logos
│
├── supabase-schema.sql               ← Schéma base de données (v31)
├── manifest.json                     ← Manifest PWA
├── robots.txt                        ← Instructions crawlers
├── sitemap.xml                       ← Plan du site (SEO)
│
└── README.md
```

---

## Pages

### 🌐 Pages publiques (indexées)

| Fichier | Description |
|---|---|
| `index.html` | Page d'accueil — présentation générale |
| `accueil-dieteticien.html` | Landing page diététiciens |
| `accueil-prescripteur.html` | Landing page prescripteurs |
| `partenariats.html` | Offre partenaires B2B |
| `bilan.html` | Formulaire bilan nutritionnel (étape 1) |
| `inscription-dieteticien.html` | Inscription diététicien (RPPS requis) |
| `inscription-prescripteur.html` | Inscription prescripteur (SIRET requis) |
| `faq.html` | Questions fréquentes |
| `contact.html` | Formulaire de contact |
| `login.html` | Connexion tous profils |
| `mentions-legales.html` | Mentions légales |
| `politique-confidentialite.html` | Politique de confidentialité |
| `cgu-patient.html` | CGU patients |
| `cgu-dieteticien.html` | CGU diététiciens |
| `cgu-prescripteur.html` | CGU prescripteurs |
| `cgu-partenaires.html` | CGU partenaires |

### 🔒 Espace patient (authentifié)

| Fichier | Description |
|---|---|
| `dashboard.html` | Tableau de bord patient |
| `profil-patient.html` | Profil & paramètres |

### 🥗 Espace diététicien (authentifié)

| Fichier | Description |
|---|---|
| `dashboard-dieteticien.html` | Tableau de bord & file d'attente |
| `dietitian.html` | Validation des plans |
| `profil-dieteticien.html` | Profil & paramètres |
| `agenda-dieteticien.html` | Agenda visios |
| `compta-dieteticien.html` | Comptabilité & revenus |
| `gestion-forfait-dieteticien.html` | Gestion abonnement |

### 💼 Espace prescripteur (authentifié)

| Fichier | Description |
|---|---|
| `prescripteur-dashboard.html` | Tableau de bord |
| `prescripteur-crm.html` | CRM clients |
| `profil-prescripteur.html` | Profil & paramètres |
| `compta-prescripteur.html` | Comptabilité |
| `gestion-credits-prescripteur.html` | Achat & suivi crédits |

### 🏢 Espace partenaire *(coming soon)*

| Fichier | Description |
|---|---|
| `partenaire-crm.html` | CRM partenaire multi-praticien |
| `compta-partenaire.html` | Comptabilité partenaire |

### ⚙️ Administration

| Fichier | Description |
|---|---|
| `admin.html` | Back-office CaliDoc Santé |
| `statistiques-admin.html` | Statistiques plateforme |
| `api-documentation.html` | Documentation API interne |
| `backup-restore.html` | Sauvegarde & restauration |
| `webhooks.html` | Gestion webhooks Stripe |

### 🔧 Système

| Fichier | Description |
|---|---|
| `offline.html` | Page hors connexion (PWA) |
| `chatbot.html` | Interface chatbot support |
| `seo.html` | Outils SEO internes |

---

## Modèle tarifaire

### Plan alimentaire patient
| | Prix |
|---|---|
| Plan complet validé par un diét. RPPS | **24,90€ TTC** |
| Consultation visio (45 min) | **55€ TTC** (47€ reversés au diét.) |

### Abonnements patient
| Niveau | Prix | Avantages |
|---|---|---|
| Découverte | Gratuit | Bilan + conseils de base |
| Essentiel | 5€/mois | Dashboard, diét. attitré |
| Premium | 9€/mois ou 99€/an | 1 plan offert/3 mois, -20% visios |

### Packs prescripteur
| Pack | Crédits | Prix TTC | Par plan |
|---|---|---|---|
| Solo | 1 | 24,90€ | 24,90€ |
| Standard | 10 | 130€ | 13€ |
| Expert | 50 | 500€ | 10€ |
| Volume | 100 | 900€ | 9€ |

### Abonnements diététicien
| Formule | Prix | Plans inclus | Commission hors quota |
|---|---|---|---|
| Essentiel | Gratuit | 0 | 5€/plan |
| Starter | 9€/mois | 10 | 2,50€/plan |
| Pro | 29€/mois | 30 | 2€/plan |
| Expert | 59€/mois | 100 | 1,50€/plan |

*+ 1 plan gratuit/mois reversé intégralement au diét. sur tous les forfaits.*

---

## Installation locale

```bash
# Cloner le dépôt
git clone https://github.com/Marjiver/nutri-platform.git
cd nutri-platform

# Lancer avec Live Server (VS Code) ou :
npx serve .
```

Ouvre `http://localhost:3000` dans ton navigateur.

---

## Configuration

### 1. Supabase
- Crée un projet sur [supabase.com](https://supabase.com)
- Exécute `supabase-schema.sql` dans l'éditeur SQL
- Remplis tes clés dans `js/core/auth.js`

### 2. Stripe
Voir [`SETUP-STRIPE.md`](SETUP-STRIPE.md) pour la configuration complète.  
Produits à créer : `credits_solo`, `credits_standard`, `credits_expert`, `credits_volume`, `plan`, `visio`, `abo_essentiel`, `abo_premium`, `abo_premium_an`.

### 3. Resend (emails)
Voir [`SETUP-RESEND.md`](SETUP-RESEND.md).

### 4. Déploiement GitHub Pages
1. `Settings → Pages → Source : branch main`
2. Ton site sera sur `https://marjiver.github.io/nutri-platform`
3. Configure un domaine custom OVH dans `Settings → Pages → Custom domain`

---

## Roadmap

- [x] Authentification multi-rôles (Supabase)
- [x] Formulaire bilan patient (4 étapes)
- [x] Paiement Stripe (plans, visios, packs, abonnements)
- [x] Dashboard patient, diét., prescripteur
- [x] CRM prescripteur
- [x] Agenda visios diététicien
- [x] Comptabilité diététicien
- [x] Génération PDF plans
- [x] File d'attente géolocalisée (80km → national)
- [x] PWA (offline, manifest, Service Worker)
- [ ] Profil partenaire multi-praticien
- [ ] Intégration IA génération de plans (nutridoc_v1.py)
- [ ] Application mobile native

---

## Entité juridique

**CaliDoc Santé** — Éditeur de NutriDoc  
Contact : [contact via le site](https://nutridoc.calidoc-sante.fr/contact.html)
