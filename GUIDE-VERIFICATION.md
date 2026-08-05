# Guide — Vérification des comptes professionnels

*NutriDoc · août 2026 · rédigé pour Marjiver (aucune compétence technique requise)*

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

### Action 2 — Déployer la fonction de vérification (10 min)
1. Va sur **supabase.com** → ton projet NutriDoc
2. Menu gauche → **Edge Functions** → **Deploy a new function** → nomme-la exactement `verifier-rpps`
3. Efface le code d'exemple et colle le contenu du fichier `supabase/functions/verifier-rpps/index.ts` de ton dossier
4. Clique **Deploy**
5. Toujours dans Edge Functions → **Secrets** (ou Settings) → ajoute :
   - Nom : `ESANTE_API_KEY` · Valeur : ta clé de l'Action 1

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

## Limites honnêtes (pour plus tard)
- La vérification empêche les imposteurs de s'inscrire ; le verrou financier complet (nom Stripe/RIB) s'activera avec Stripe Connect.
- L'upload de pièce d'identité (étape « vérification identité ») n'envoie encore le fichier nulle part — à brancher avec le moteur (V2).
- Publie ces changements sur GitHub pour qu'ils soient en ligne (GitHub Desktop → Commit → Push).
