-- ═══════════════════════════════════════════════════════════════════════════
--  NutriDoc — Accès à l'espace d'administration
--  Appliqué sur le projet phgjpwaptrrjonoimmne le 3 septembre 2026.
--  Script idempotent : peut être relancé sans risque.
-- ═══════════════════════════════════════════════════════════════════════════
--
--  ÉTAT CONSTATÉ EN BASE (et non dans supabase-schema.sql, qui était en retard)
--
--  Déjà en place, à ne PAS recréer :
--    · profiles.role accepte 'admin' (la contrainte déployée est plus large
--      que celle du fichier de schéma du dépôt) ;
--    · la fonction public.est_admin(), en SECURITY DEFINER — c'est elle qui
--      évite la récursion infinie d'une politique sur profiles qui interroge
--      profiles ;
--    · les politiques admin_lit_profils (SELECT) et admin_maj_profils (UPDATE)
--      sur profiles ;
--    · le compte marjiver@hotmail.fr a déjà le rôle 'admin'.
--
--  CE QUI MANQUAIT RÉELLEMENT
--    Aucune politique ne donnait à l'administrateur la lecture de plans,
--    bilans, visios, queue_plans, support_tickets ni alertes. admin.html
--    interroge plans : le tableau de bord serait resté vide même avec des
--    données. C'est ce que ce script corrige.
--
--  ⚠ CAUSE PRINCIPALE DU BLOCAGE, SANS RAPPORT AVEC LE SQL
--    Le projet Supabase était en pause (offre gratuite : mise en veille après
--    inactivité). Base injoignable ⇒ getProfile() échouait ⇒ l'écran
--    « Connexion requise » s'affichait et l'espace diététicien renvoyait au
--    login. Relancer le projet a rétabli l'accès.
-- ═══════════════════════════════════════════════════════════════════════════


-- ── Lecture administrateur sur les tables métier ───────────────────────────
-- On réutilise est_admin() : créer une seconde fonction équivalente
-- (is_admin) ne ferait que dupliquer la même règle à deux endroits.
-- La boucle ignore silencieusement une table absente du schéma.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['plans','bilans','visios','queue_plans','support_tickets','alertes']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'admin_lit_' || t, t);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT USING (public.est_admin())',
        'admin_lit_' || t, t);
      RAISE NOTICE 'Policy admin_lit_% créée', t;
    END IF;
  END LOOP;
END $$;


-- ── Promotion d'un compte administrateur ───────────────────────────────────
-- À décommenter uniquement pour promouvoir un NOUVEAU compte.
-- marjiver@hotmail.fr est déjà administrateur.
--
-- DO $$
-- DECLARE
--   v_email text := 'adresse@exemple.fr';
--   v_uid   uuid;
-- BEGIN
--   SELECT id INTO v_uid FROM auth.users WHERE lower(email) = lower(v_email);
--   IF v_uid IS NULL THEN
--     RAISE EXCEPTION 'Aucun compte Supabase pour %. Créez-le via la page de connexion du site, puis relancez.', v_email;
--   END IF;
--   INSERT INTO public.profiles (id, role, email, statut, created_at)
--   VALUES (v_uid, 'admin', v_email, 'actif', now())
--   ON CONFLICT (id) DO UPDATE SET role = 'admin';
-- END $$;


-- ── Vérification ───────────────────────────────────────────────────────────
-- 1. Les politiques attendues (8 lignes : 6 tables métier + profiles ×2).
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual ILIKE '%est_admin%' OR with_check ILIKE '%est_admin%')
ORDER BY tablename, policyname;

-- 2. Ce que voit réellement le compte admin à travers l'API (RLS appliqué).
--    À exécuter séparément du bloc ci-dessus.
--
-- DO $$
-- DECLARE uid uuid;
-- BEGIN
--   SELECT id INTO uid FROM auth.users WHERE lower(email) = 'marjiver@hotmail.fr';
--   PERFORM set_config('request.jwt.claims',
--     json_build_object('sub', uid, 'role', 'authenticated')::text, true);
-- END $$;
-- SET LOCAL ROLE authenticated;
-- SELECT 'est_admin()' AS test, public.est_admin()::text AS resultat
-- UNION ALL SELECT 'profiles visibles', count(*)::text FROM public.profiles
-- UNION ALL SELECT 'plans visibles',    count(*)::text FROM public.plans;
