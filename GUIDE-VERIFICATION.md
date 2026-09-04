# Guide — Vérification des comptes professionnels

*NutriDoc · août 2026 · rédigé pour Marjiver (aucune compétence technique requise)*

> **État au 4 septembre 2026 — la vérification automatique n'est PAS active.**
> La fonction est déployée et joignable, mais la clé `ESANTE_API_KEY` n'est pas
> renseignée dans Supabase : l'Annuaire Santé n'est donc jamais interrogé et
> **chaque inscription bascule en validation manuelle** (voir plus bas).
> Testé en appelant la fonction en production :
> `{"statut":"indisponible","raison":"Clé API ANS non configurée côté serveur."}`
> Seule l'action 1 reste à faire pour l'activer.

## Ce qui a été mis en place

**Diététicien (inscription bloquante).** Au moment de l'inscription, le site interroge l'Annuaire Santé officiel de l'État (ANS) et vérifie 3 choses : le numéro RPPS existe, la profession est bien « diététicien », et le nom/prénom saisis correspondent au titulaire officiel. Si l'un des trois échoue → **l'inscription est impossible** (message clair affiché). L'ancien « mode secours » qui laissait tout le monde passer a été supprimé.

**Prescripteur (inscription bloquante).** Le SIRET est vérifié dans le répertoire officiel des entreprises (API publique de l'État, gratuite, déjà fonctionnelle sans configuration). SIRET introuvable ou établissement fermé → inscription impossible. Le nom officiel de l'entreprise est enregistré dans le dossier.

**Argent (verrou Stripe, prêt à brancher).** Règle enregistrée : le nom du compte Stripe **et** du RIB doivent correspondre au nom officiel RPPS, sinon aucun versement. Le code est prêt (`supabase/functions/verifier-stripe-nom/`) et s'activera quand Stripe Connect sera branché. Stripe vérifie de son côté l'identité légale (pièce d'identité) de celui qui reçoit l'argent : un imposteur ne peut donc pas encaisser à la place d'un vrai diététicien.

## Ce que TU dois faire (3 actions, ~30 min + délai ANS)

### Action 1 — Obtenir la clé API de l'Annuaire Santé (gratuit)
1. Va sur **industriels.esante.gouv.fr** (portail développeurs de l'Agence du Numérique en Santé)
2. Crée un compte au nom de CaliDoc Santé
3. Demande l'accès à l'**API Annuaire Santé** (parfois nommée « Annuaire Santé en libre accès »)
4. Récupère ta clé API (une longue suite de caractères)

> Sans cette clé, l'inscription diététicien affiche « service momentanément indisponible » et reste bloquée — c'est voulu : personne ne peut s'inscrire sans vérification.

### Action 2 — Déployer la fonction de vérification — **déjà FAIT**
`verifier-rpps` est déployée et répond en production. Rien à refaire.

Il ne reste qu'à y déposer la clé :
1. Supabase → **Edge Functions** → **Secrets** (ou Settings)
2. Ajoute : Nom `ESANTE_API_KEY` · Valeur : ta clé de l'Action 1
3. C'est tout — la vérification redevient automatique dès l'appel suivant,
   sans redéploiement ni modification du site.

### Action 3 — Mettre à jour la base de données (2 min)
1. Supabase → menu gauche → **SQL Editor** → **New query**
2. Colle le contenu du fichier `sql/verification-comptes.sql`
3. Clique **Run** (message « Success » attendu)

## Comment tester
1. Ouvre la page d'inscription diététicien du site
2. Étape 1 : saisis le vrai nom et prénom de Grégoire · Étape 2 : son vrai RPPS → ✓ sa fiche officielle doit s'afficher
3. Re-teste avec son RPPS mais un autre nom → ⛔ blocage « nom différent »
4. Re-teste avec un RPPS de médecin → ⛔ blocage « pas un diététicien »
5. Côté prescripteur : SIRET de CaliDoc (939 166 690 00019) → ✓ · un SIRET bidon (12345678901234) → ⛔

## Mode « validation manuelle » (actif tant que la clé ANS n'est pas arrivée)

Tant que `ESANTE_API_KEY` n'est pas configurée, le système bascule automatiquement en contrôle humain — sans jamais laisser passer un imposteur :

1. Le diététicien s'inscrit normalement. Un message lui indique que son compte sera vérifié sous 24h ouvrées.
2. Son compte est créé en statut **`en_attente`** : il peut se connecter, mais **ne voit aucun dossier patient** et **ne peut recevoir aucun paiement** (verrouillé par les règles de sécurité de la base).
3. Tu ouvres **`validation-dieteticiens.html`** (accessible avec ton compte administrateur).
4. Tu cliques « Ouvrir l'annuaire officiel » — le RPPS est copié automatiquement. Tu le colles sur annuaire.sante.fr et tu vérifies **le nom** et **la profession**.
5. Tu cliques **Valider** (accès ouvert) ou **Refuser**.

Quand la clé ANS arrivera : ajoute-la dans les Secrets Supabase et la vérification redeviendra automatique. Aucun autre changement à faire, le code est déjà déployé.

### Vocabulaire des statuts (`profiles.statut_rpps`)
| Statut | Signification |
|---|---|
| `en_attente` | Inscrit, **bloqué**, en attente de contrôle |
| `verifie_auto` | Vérifié automatiquement par l'API ANS |
| `verifie_manuel` | Vérifié à la main par l'administrateur |
| `refuse` | Refusé, accès fermé |

> ⚠️ N'utilise pas d'autres valeurs : les règles de sécurité ne reconnaissent que celles-ci.

## Limites honnêtes (pour plus tard)
- La vérification empêche les imposteurs de s'inscrire ; le verrou financier complet (nom Stripe/RIB) s'activera avec Stripe Connect.
- L'upload de pièce d'identité (étape « vérification identité ») n'envoie encore le fichier nulle part — à brancher avec le moteur (V2).
- Publie ces changements sur GitHub pour qu'ils soient en ligne (GitHub Desktop → Commit → Push).
