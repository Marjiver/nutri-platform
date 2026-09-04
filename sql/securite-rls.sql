-- ═══════════════════════════════════════════════════════════════════════════
--  NutriDoc — Durcissement de sécurité (RLS + élévation de privilèges)
--  Script idempotent : relançable sans risque.
--
--  ⚠ À exécuter dans le SQL Editor Supabase du projet phgjpwaptrrjonoimmne.
--    Lire chaque section avant de lancer : les blocs 3 et 4 resserrent des
--    accès dont dépend peut-être l'espace diététicien.
--
--  ─────────────────────────────────────────────────────────────────────────
--  POURQUOI
--  Le site est 100 % statique : aucun serveur applicatif ne s'interpose entre
--  le navigateur et la base. Tout ce que fait le JavaScript, un visiteur peut
--  le refaire à la main depuis la console de son navigateur, avec la clé anon
--  publiée dans js/core/auth.js. La sécurité ne repose donc PAS sur le code
--  des pages : elle repose entièrement sur les règles ci-dessous.
--
--  Corollaire : masquer un bouton, rediriger vers login.html ou vérifier un
--  rôle en JavaScript ne protège rien. Ce sont des choix d'affichage.
--  ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
--  1. FAILLE CRITIQUE — N'IMPORTE QUI POUVAIT DEVENIR ADMINISTRATEUR
-- ═══════════════════════════════════════════════════════════════════════════
--
--  Deux chemins, indépendants l'un de l'autre :
--
--  (a) À l'inscription. handle_new_user() recopie sans filtre
--      raw_user_meta_data->>'role' dans profiles.role. Or ces métadonnées
--      viennent du client, dans options.data de auth.signUp(). Il suffisait
--      d'une ligne dans la console d'un navigateur :
--
--        await sb.auth.signUp({ email, password,
--                               options:{ data:{ role:'admin' } } })
--
--      Le compte créé arrivait directement avec role='admin', et
--      admin-auth.js — qui teste exactement profil.role === 'admin' —
--      ouvrait le back-office.
--
--  (b) Après coup. La politique « user voit son profil » est en FOR ALL
--      USING (auth.uid() = id), sans WITH CHECK restreignant les colonnes.
--      Elle autorise donc l'UPDATE de sa PROPRE ligne, colonne role incluse :
--
--        await sb.from('profiles').update({ role:'admin' }).eq('id', monId)
--
--      Le même mécanisme permettait de s'attribuer des crédits
--      (credits = 99999), de faire passer statut_rpps à 'valide' — ce qui
--      contourne la validation manuelle RPPS mise en place au commit
--      308d5b1 — ou de changer de formule sans payer.
--
--  Correctif : les colonnes de privilège deviennent non modifiables par leur
--  propriétaire. Seul un administrateur, ou un traitement hors session
--  (service_role / SQL Editor, où auth.uid() est NULL), peut les écrire.

-- Colonnes possiblement absentes selon l'ancienneté du schéma déployé.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS niveau_abo text DEFAULT 'gratuit';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS abo_debut  timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS abo_fin    timestamptz;

-- est_admin() existe déjà en base (SECURITY DEFINER, pour éviter la récursion
-- d'une politique sur profiles qui interroge profiles). On la recrée en
-- épinglant search_path : sans ce SET, un rôle capable de créer un schéma
-- peut détourner la résolution des noms à l'intérieur d'une fonction
-- SECURITY DEFINER et lui faire répondre ce qu'il veut.
CREATE OR REPLACE FUNCTION public.est_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$fn$;

-- Même chose pour les autres rôles : évite de recopier un EXISTS(...) dans
-- chaque politique, et fait de ce fichier l'unique endroit à corriger.
CREATE OR REPLACE FUNCTION public.a_le_role(p_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = p_role
  );
$fn$;


-- ── Verrou sur les colonnes de privilège ───────────────────────────────────
-- Un trigger plutôt qu'un WITH CHECK : le WITH CHECK ne voit que la ligne
-- APRÈS écriture, il ne peut donc pas exprimer « role n'a pas changé ». Le
-- trigger, lui, dispose de OLD et de NEW.
CREATE OR REPLACE FUNCTION public.verrou_privileges_profil()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
BEGIN
  -- auth.uid() IS NULL ⇒ appel hors session utilisateur : SQL Editor,
  -- service_role, trigger interne. Ces contextes gardent la main.
  IF auth.uid() IS NULL OR public.est_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- On restaure silencieusement l'ancienne valeur au lieu de lever une
    -- erreur : le JS du site renvoie souvent la ligne entière en UPDATE
    -- (profil, préférences). Refuser ferait échouer des enregistrements
    -- parfaitement légitimes ; ignorer laisse passer le reste.
    NEW.role                := OLD.role;
    NEW.credits             := OLD.credits;
    NEW.credits_parrainage  := OLD.credits_parrainage;
    NEW.statut_rpps         := OLD.statut_rpps;
    NEW.statut              := OLD.statut;
    NEW.formule             := OLD.formule;
    NEW.pack                := OLD.pack;
    NEW.mode_pilote         := OLD.mode_pilote;
    NEW.niveau_abo          := OLD.niveau_abo;
    NEW.abo_debut           := OLD.abo_debut;
    NEW.abo_fin             := OLD.abo_fin;
    NEW.parrain_id          := OLD.parrain_id;
    NEW.code_parrainage     := OLD.code_parrainage;
    NEW.objectifs_autorises := OLD.objectifs_autorises;

  ELSIF TG_OP = 'INSERT' THEN
    -- Chemin creerProfilManquant() de js/core/auth.js : un compte
    -- authentifié sans ligne profiles insère la sienne. Utile, mais il y
    -- passait role tel quel — donc 'admin' au choix. On borne.
    IF NEW.role IS NULL OR NEW.role NOT IN ('patient','dietitian','prescriber') THEN
      NEW.role := 'patient';
    END IF;
    NEW.credits            := 0;
    NEW.credits_parrainage := 0;
    NEW.statut_rpps        := 'en_attente';
    NEW.mode_pilote        := false;
    NEW.niveau_abo         := 'gratuit';
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS profiles_verrou_privileges ON public.profiles;
CREATE TRIGGER profiles_verrou_privileges
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.verrou_privileges_profil();


-- ── Assainissement du rôle à l'inscription ─────────────────────────────────
-- Reprise de handle_new_user() à deux différences près : le rôle issu des
-- métadonnées client est borné à trois valeurs, et formule/pack — qui
-- décident du tarif — ne sont plus pris du client.
-- 'admin' ne peut donc plus venir du navigateur ; il s'accorde à la main,
-- par le bloc de promotion de sql/acces-admin.sql.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_code text;
  v_role text;
BEGIN
  v_code := UPPER(SUBSTRING(MD5(NEW.id::text || NOW()::text), 1, 8));

  v_role := lower(COALESCE(NEW.raw_user_meta_data->>'role', 'patient'));
  IF v_role NOT IN ('patient','dietitian','prescriber') THEN
    v_role := 'patient';
  END IF;

  INSERT INTO public.profiles (
    id, role, prenom, nom, email, tel, rpps, specialite,
    cabinet, profession, siret, formule, pack,
    code_parrainage, statut, created_at
  )
  VALUES (
    NEW.id,
    v_role,
    COALESCE(NEW.raw_user_meta_data->>'prenom', ''),
    COALESCE(NEW.raw_user_meta_data->>'nom', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'tel', NULL),
    COALESCE(NEW.raw_user_meta_data->>'rpps', NULL),
    COALESCE(NEW.raw_user_meta_data->>'specialite', NULL),
    COALESCE(NEW.raw_user_meta_data->>'cabinet', NULL),
    COALESCE(NEW.raw_user_meta_data->>'profession', NULL),
    COALESCE(NEW.raw_user_meta_data->>'siret', NULL),
    'essentiel',
    NULL,
    v_code,
    'actif',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    prenom     = COALESCE(EXCLUDED.prenom, profiles.prenom),
    nom        = COALESCE(EXCLUDED.nom, profiles.nom),
    tel        = COALESCE(EXCLUDED.tel, profiles.tel),
    rpps       = COALESCE(EXCLUDED.rpps, profiles.rpps),
    specialite = COALESCE(EXCLUDED.specialite, profiles.specialite),
    cabinet    = COALESCE(EXCLUDED.cabinet, profiles.cabinet),
    profession = COALESCE(EXCLUDED.profession, profiles.profession),
    siret      = COALESCE(EXCLUDED.siret, profiles.siret);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$fn$;


-- ═══════════════════════════════════════════════════════════════════════════
--  2. TABLE email_templates — AUCUNE RLS
-- ═══════════════════════════════════════════════════════════════════════════
--  Seule table du schéma sans ENABLE ROW LEVEL SECURITY (les 13 autres l'ont).
--  Dans Supabase, une table du schéma public sans RLS est exposée en lecture
--  ET en écriture à travers PostgREST, y compris au rôle anon.
--  corps_html est le contenu des e-mails transactionnels envoyés à vos
--  utilisateurs : un tiers pouvait le réécrire et faire partir depuis votre
--  domaine des e-mails de hameçonnage vers vos diététiciens et vos patients.
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin gere les modeles email" ON public.email_templates;
CREATE POLICY "admin gere les modeles email" ON public.email_templates
  FOR ALL USING (public.est_admin()) WITH CHECK (public.est_admin());


-- ═══════════════════════════════════════════════════════════════════════════
--  3. queue_plans — FILE D'ATTENTE LISIBLE ET MODIFIABLE PAR TOUS
-- ═══════════════════════════════════════════════════════════════════════════
--  Les politiques d'origine :
--     FOR SELECT USING (auth.uid() = dietitian_id OR dietitian_id IS NULL)
--     FOR UPDATE USING (auth.uid() = dietitian_id OR dietitian_id IS NULL)
--  ne vérifient aucun rôle. « dietitian_id IS NULL » est vrai pour toute
--  demande non encore attribuée — c'est-à-dire toute la file d'attente.
--  N'importe quel compte, y compris un patient inscrit en trente secondes,
--  pouvait donc lire notes_medicales, patient_prenom, ville et objectif de
--  tous les patients en attente ; et, par l'UPDATE, s'attribuer les demandes,
--  changer leur statut ou leur tarif.
DROP POLICY IF EXISTS "diet voit les demandes"  ON public.queue_plans;
DROP POLICY IF EXISTS "diet met à jour demande" ON public.queue_plans;

CREATE POLICY "diet voit les demandes" ON public.queue_plans
  FOR SELECT USING (
    public.a_le_role('dietitian')
    AND (dietitian_id IS NULL OR dietitian_id = auth.uid())
  );

-- WITH CHECK en plus du USING : sans lui, un diététicien peut modifier une
-- demande libre et, dans le même UPDATE, l'attribuer à quelqu'un d'autre.
CREATE POLICY "diet met à jour demande" ON public.queue_plans
  FOR UPDATE USING (
    public.a_le_role('dietitian')
    AND (dietitian_id IS NULL OR dietitian_id = auth.uid())
  )
  WITH CHECK (
    public.a_le_role('dietitian')
    AND dietitian_id = auth.uid()
  );


-- ═══════════════════════════════════════════════════════════════════════════
--  4. alertes — FOR ALL AU LIEU DE SELECT
-- ═══════════════════════════════════════════════════════════════════════════
--  « diet voit les alertes » est en FOR ALL : le nom dit SELECT, la politique
--  autorise aussi DELETE. Un compte diététicien pouvait effacer toutes les
--  alertes santé de la plateforme. Ces alertes signalent des situations à
--  risque : leur suppression n'est pas un incident de données, c'est un
--  incident clinique.
DROP POLICY IF EXISTS "diet voit les alertes"  ON public.alertes;
DROP POLICY IF EXISTS "diet lit les alertes"   ON public.alertes;
DROP POLICY IF EXISTS "diet marque alerte lue" ON public.alertes;

CREATE POLICY "diet lit les alertes" ON public.alertes
  FOR SELECT USING (public.a_le_role('dietitian'));

-- Marquer « lu » reste nécessaire ; supprimer ne l'est pas.
CREATE POLICY "diet marque alerte lue" ON public.alertes
  FOR UPDATE USING (public.a_le_role('dietitian'))
  WITH CHECK (public.a_le_role('dietitian'));


-- ═══════════════════════════════════════════════════════════════════════════
--  5. Vue queue_metrics — CONTOURNEMENT DE RLS
-- ═══════════════════════════════════════════════════════════════════════════
--  Une vue s'exécute avec les droits de son propriétaire, pas de l'appelant :
--  elle traverse la RLS de queue_plans. Ici l'exposition se limite à des
--  agrégats, mais la règle vaut pour toute vue ajoutée plus tard.
--  security_invoker (PostgreSQL 15+, ce qui est le cas sur Supabase) rétablit
--  l'application de la RLS de l'appelant.
DO $blk$
BEGIN
  IF to_regclass('public.queue_metrics') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public.queue_metrics SET (security_invoker = true)';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'queue_metrics : security_invoker non appliqué (%)', SQLERRM;
END $blk$;


-- ═══════════════════════════════════════════════════════════════════════════
--  6. WITH CHECK explicites
-- ═══════════════════════════════════════════════════════════════════════════
--  Politiques en FOR ALL USING (auth.uid() = colonne_proprietaire) sans
--  WITH CHECK. PostgreSQL réutilise alors l'expression USING, ce qui couvre
--  l'essentiel — mais l'expliciter documente l'intention et protège des
--  variantes futures (ajout d'un FOR UPDATE séparé, par exemple).
DROP POLICY IF EXISTS "prescripteur voit ses clients" ON public.clients_prescripteur;
CREATE POLICY "prescripteur voit ses clients" ON public.clients_prescripteur
  FOR ALL USING (auth.uid() = prescripteur_id)
  WITH CHECK (auth.uid() = prescripteur_id);

DROP POLICY IF EXISTS "prescripteur voit ses demandes" ON public.demandes_plans;
CREATE POLICY "prescripteur voit ses demandes" ON public.demandes_plans
  FOR ALL USING (auth.uid() = prescripteur_id)
  WITH CHECK (auth.uid() = prescripteur_id);

DROP POLICY IF EXISTS "user voit ses tickets" ON public.support_tickets;
CREATE POLICY "user voit ses tickets" ON public.support_tickets
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user gère son consentement" ON public.cookie_consents;
CREATE POLICY "user gère son consentement" ON public.cookie_consents
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "diet gère ses plans" ON public.plans;
CREATE POLICY "diet gère ses plans" ON public.plans
  FOR ALL USING (auth.uid() = dietitian_id)
  WITH CHECK (auth.uid() = dietitian_id);

DROP POLICY IF EXISTS "diet gère ses visios" ON public.visios;
CREATE POLICY "diet gère ses visios" ON public.visios
  FOR ALL USING (auth.uid() = dietitian_id)
  WITH CHECK (auth.uid() = dietitian_id);


-- ═══════════════════════════════════════════════════════════════════════════
--  7. À DÉCIDER — bilans : tout diététicien lit TOUS les bilans
-- ═══════════════════════════════════════════════════════════════════════════
--  Politique actuelle, volontairement NON modifiée par ce script :
--
--    CREATE POLICY "diet voit tous les bilans" ON bilans
--      FOR SELECT USING (auth.uid() = patient_id
--        OR EXISTS (SELECT 1 FROM profiles
--                   WHERE id = auth.uid() AND role = 'dietitian'));
--
--  Un compte diététicien lit l'intégralité des bilans de la plateforme :
--  poids, pathologies, alertes_sante, habitudes. Ce sont des données de santé
--  au sens de l'article 9 du RGPD. Le principe de minimisation (art. 5.1.c)
--  veut qu'un praticien n'accède qu'aux dossiers dont il a la charge, et
--  l'article L1110-4 du code de la santé publique — que vos CGU citent déjà —
--  réserve le partage à l'équipe de soins du patient.
--
--  Je ne l'applique pas à votre place : si l'espace diététicien affiche la
--  file d'attente en lisant bilans directement, restreindre ici viderait
--  l'écran. Vérifiez d'abord js/features/dietitian.js, puis décommentez si le
--  parcours passe bien par queue_plans.
--
-- DROP POLICY IF EXISTS "diet voit tous les bilans" ON public.bilans;
-- CREATE POLICY "diet voit les bilans qui lui sont confies" ON public.bilans
--   FOR SELECT USING (
--     auth.uid() = patient_id
--     OR EXISTS (SELECT 1 FROM public.plans p
--                WHERE p.bilan_id = bilans.id AND p.dietitian_id = auth.uid())
--     OR EXISTS (SELECT 1 FROM public.queue_plans q
--                WHERE q.bilan_id = bilans.id AND q.dietitian_id = auth.uid())
--   );


-- ═══════════════════════════════════════════════════════════════════════════
--  8. VÉRIFICATION — à lancer après le reste
-- ═══════════════════════════════════════════════════════════════════════════

-- 8.1 Aucune table du schéma public ne doit rester sans RLS.
--     Résultat attendu : zéro ligne.
SELECT c.relname AS table_sans_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
ORDER BY 1;

-- 8.2 Aucun compte 'admin' inattendu (le seul prévu est marjiver@hotmail.fr).
--     Si un compte inconnu apparaît, la faille de la section 1 a déjà servi.
SELECT p.id, p.email, p.created_at
FROM public.profiles p
WHERE p.role = 'admin'
ORDER BY p.created_at;

-- 8.3 Le verrou fonctionne. Sur un compte patient connecté, dans la console
--     du navigateur, cette commande doit laisser role inchangé :
--
--       await sb.from('profiles')
--               .update({ role: 'admin' })
--               .eq('id', (await sb.auth.getUser()).data.user.id)
--               .select()
--
--     Elle renvoie la ligne avec role:'patient' — l'écriture est ignorée,
--     pas refusée.
