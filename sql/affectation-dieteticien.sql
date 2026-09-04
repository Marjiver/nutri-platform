-- ==========================================================================
--  NutriDoc — Affectation des demandes de plan à un diététicien
--  Script idempotent : relançable sans risque.
-- ==========================================================================
--
--  LE PROBLÈME
--  Les politiques de sécurité sur 'bilans' étaient correctement écrites :
--      est_diet_verifie() AND (dietitian_id = auth.uid() OR dietitian_id IS NULL)
--  Mais rien n'écrivait jamais 'dietitian_id'. Tous les bilans restaient donc
--  à NULL et la clause se réduisait à « tout diététicien vérifié lit tous les
--  dossiers » — allergies, pathologies, TCA, grossesse comprises.
--  Le cadrage existait ; l'étape d'affectation manquait.
--
--  LA RÈGLE
--    1. À la création du bilan, la demande part vers un diététicien du
--       département du patient, choisi équitablement.
--    2. S'il ne l'a pas prise en charge dans les 24 h, elle devient visible
--       nationalement — ce qui laisse 24 h pour tenir la promesse des 48 h.
--    3. Aucun diététicien dans le département : bascule nationale immédiate,
--       inutile de faire attendre le patient pour rien.
--
--  PAS DE PLANIFICATEUR
--  La bascule nationale n'est pas un travail périodique : elle est calculée
--  à la lecture, dans la politique elle-même. Rien à ordonnancer, rien qui
--  puisse tomber en panne silencieusement, et la règle reste vraie même
--  après une mise en veille du projet.
-- ==========================================================================


-- -- 1. Code postal et département ------------------------------------------
-- 'ville' est du texte libre : « Angoulême » ne rencontrera jamais
-- « Saint-Yrieix-sur-Charente », commune voisine à cinq kilomètres. Le
-- département est la granularité usuelle en santé et resiste aux fautes
-- de frappe.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS code_postal text;
ALTER TABLE public.bilans   ADD COLUMN IF NOT EXISTS code_postal text;

-- IMMUTABLE : indispensable pour servir dans une colonne générée.
CREATE OR REPLACE FUNCTION public.nd_departement(cp text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN cp IS NULL THEN NULL
    WHEN length(regexp_replace(cp, '[^0-9]', '', 'g')) < 2 THEN NULL
    -- Outre-mer : 971 à 978 tiennent sur trois chiffres.
    WHEN left(regexp_replace(cp, '[^0-9]', '', 'g'), 2) IN ('97', '98')
      THEN left(regexp_replace(cp, '[^0-9]', '', 'g'), 3)
    ELSE left(regexp_replace(cp, '[^0-9]', '', 'g'), 2)
  END;
$$;

COMMENT ON FUNCTION public.nd_departement(text) IS
  'Departement a partir d''un code postal. 97x/98x sur trois chiffres.';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS departement text
  GENERATED ALWAYS AS (public.nd_departement(code_postal)) STORED;
ALTER TABLE public.bilans
  ADD COLUMN IF NOT EXISTS departement text
  GENERATED ALWAYS AS (public.nd_departement(code_postal)) STORED;


-- -- 2. Traçabilité de l'affectation ----------------------------------------
-- assigned_at date le depart du compteur des 24 h. Sans elle, on ne saurait
-- pas distinguer une demande recente d'une demande oubliee.
ALTER TABLE public.bilans ADD COLUMN IF NOT EXISTS assigned_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_bilans_departement ON public.bilans(departement);
CREATE INDEX IF NOT EXISTS idx_bilans_dietitian   ON public.bilans(dietitian_id);
CREATE INDEX IF NOT EXISTS idx_bilans_assigned    ON public.bilans(assigned_at);
CREATE INDEX IF NOT EXISTS idx_profiles_dept_role ON public.profiles(departement, role);


-- -- 3. Choix équitable du diététicien --------------------------------------
-- Critere principal : la charge reelle, pas un simple tour de role. Un
-- compteur circulaire distribue le meme nombre de demandes a chacun sans
-- voir qu'un praticien en a dix en retard et un autre aucune.
--   1. le moins de dossiers en cours
--   2. a egalite, celui qui a attendu le plus longtemps depuis sa derniere
--   3. a egalite encore, au hasard — evite qu'un meme profil soit toujours
--      privilegie par l'ordre alphabetique ou la date d'inscription
CREATE OR REPLACE FUNCTION public.nd_choisir_dieteticien(dept text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER          -- doit lire profiles et bilans en contournant RLS
SET search_path = public
STABLE
AS $$
  SELECT p.id
  FROM public.profiles p
  LEFT JOIN LATERAL (
    SELECT
      count(*) FILTER (
        WHERE b.statut IN ('en_attente', 'in_progress', 'attente_validation')
      )                AS en_cours,
      max(b.assigned_at) AS derniere
    FROM public.bilans b
    WHERE b.dietitian_id = p.id
  ) charge ON TRUE
  WHERE dept IS NOT NULL
    AND p.role = 'dietitian'
    AND p.departement = dept
    AND COALESCE(p.statut, 'actif') = 'actif'
    AND p.statut_rpps IN ('verifie_auto', 'verifie_manuel')
  ORDER BY
    COALESCE(charge.en_cours, 0)               ASC,
    COALESCE(charge.derniere, '-infinity'::timestamptz) ASC,
    random()
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.nd_choisir_dieteticien(text) IS
  'Dieteticien verifie du departement le moins charge. NULL si aucun.';


-- -- 4. Affectation à la création du bilan ----------------------------------
CREATE OR REPLACE FUNCTION public.nd_affecter_bilan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_diet uuid;
BEGIN
  IF NEW.dietitian_id IS NOT NULL THEN
    RETURN NEW;                       -- deja affecte, on ne touche pas
  END IF;

  v_diet := public.nd_choisir_dieteticien(NEW.departement);

  IF v_diet IS NOT NULL THEN
    NEW.dietitian_id := v_diet;
    NEW.assigned_at  := now();
  END IF;
  -- Aucun dieteticien dans le departement : on laisse dietitian_id a NULL.
  -- La politique de lecture traite ce cas en bascule nationale immediate.

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Ne jamais faire echouer l'enregistrement d'un bilan patient pour un
  -- probleme d'affectation : le dossier vaut mieux non affecte que perdu.
  RAISE WARNING 'nd_affecter_bilan : %', SQLERRM;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_affecter_bilan ON public.bilans;
CREATE TRIGGER trg_affecter_bilan
  BEFORE INSERT ON public.bilans
  FOR EACH ROW EXECUTE FUNCTION public.nd_affecter_bilan();


-- -- 5. Visibilité : secteur 24 h, puis national ----------------------------
DROP POLICY IF EXISTS "diet_lit_bilans_autorises" ON public.bilans;
CREATE POLICY "diet_lit_bilans_autorises" ON public.bilans
FOR SELECT USING (
  public.est_diet_verifie() AND (
    -- sa propre demande
    dietitian_id = auth.uid()
    -- personne dans le departement du patient : national tout de suite
    OR dietitian_id IS NULL
    -- affectee mais non prise en charge depuis plus de 24 h : national
    OR (statut = 'en_attente' AND assigned_at < now() - INTERVAL '24 hours')
  )
);

DROP POLICY IF EXISTS "diet_maj_bilans_autorises" ON public.bilans;
CREATE POLICY "diet_maj_bilans_autorises" ON public.bilans
FOR UPDATE USING (
  public.est_diet_verifie() AND (
    dietitian_id = auth.uid()
    OR dietitian_id IS NULL
    OR (statut = 'en_attente' AND assigned_at < now() - INTERVAL '24 hours')
  )
);


-- -- 6. Prise en charge par un diététicien ----------------------------------
-- Empeche deux dieteticiens de prendre le meme dossier : l'operation ne
-- reussit que si le dossier est encore libre ou deja le sien.
CREATE OR REPLACE FUNCTION public.nd_prendre_en_charge(p_bilan uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok int;
BEGIN
  IF NOT public.est_diet_verifie() THEN
    RAISE EXCEPTION 'Compte non autorise a prendre en charge un dossier.';
  END IF;

  UPDATE public.bilans
     SET dietitian_id = auth.uid(),
         assigned_at  = COALESCE(assigned_at, now()),
         statut       = 'in_progress'
   WHERE id = p_bilan
     AND statut = 'en_attente'
     AND (
       dietitian_id = auth.uid()
       OR dietitian_id IS NULL
       OR assigned_at < now() - INTERVAL '24 hours'
     );

  GET DIAGNOSTICS v_ok = ROW_COUNT;
  RETURN v_ok > 0;
END $$;

REVOKE ALL ON FUNCTION public.nd_prendre_en_charge(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.nd_prendre_en_charge(uuid) TO authenticated;


-- -- 7. Vue de pilotage -----------------------------------------------------
CREATE OR REPLACE VIEW public.v_affectation AS
SELECT
  b.id, b.prenom, b.nom, b.ville, b.code_postal, b.departement,
  b.statut, b.created_at, b.assigned_at, b.dietitian_id,
  CASE
    WHEN b.dietitian_id IS NULL                                    THEN 'national (aucun diet. dans le departement)'
    WHEN b.statut <> 'en_attente'                                  THEN 'pris en charge'
    WHEN b.assigned_at < now() - INTERVAL '24 hours'               THEN 'national (24 h ecoulees)'
    ELSE 'secteur'
  END AS portee,
  GREATEST(0, EXTRACT(EPOCH FROM (b.assigned_at + INTERVAL '24 hours' - now())) / 3600)::numeric(6,1)
    AS heures_avant_bascule
FROM public.bilans b;

COMMENT ON VIEW public.v_affectation IS
  'Etat d''affectation de chaque bilan et delai avant bascule nationale.';


-- -- 8. Vérification --------------------------------------------------------
SELECT
  public.nd_departement('16000')  AS angouleme,   -- 16
  public.nd_departement('75011')  AS paris,       -- 75
  public.nd_departement('20000')  AS ajaccio,     -- 20
  public.nd_departement('97400')  AS la_reunion,  -- 974
  public.nd_departement('16 000') AS avec_espace, -- 16
  public.nd_departement(NULL)     AS vide,        -- NULL
  public.nd_departement('x')      AS invalide;    -- NULL
