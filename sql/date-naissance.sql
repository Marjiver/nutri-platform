-- ═══════════════════════════════════════════════════════════════════════════
--  NutriDoc — Stockage de la date de naissance
--  Script idempotent : relançable sans risque.
-- ═══════════════════════════════════════════════════════════════════════════
--
--  POURQUOI
--  Le bilan ne stockait qu'un âge en entier. Un âge est un instantané : il
--  devient faux dès l'anniversaire suivant, et un dossier relu six mois plus
--  tard affiche une valeur périmée — ce qui fausse le calcul du métabolisme
--  de base, qui dépend de l'âge.
--
--  La date de naissance, elle, ne vieillit pas. On la conserve donc, et l'âge
--  reste disponible en colonne calculée pour tout le code existant.
--
--  Le formulaire refuse déjà les moins de 16 ans ; la contrainte ci-dessous
--  fait respecter la même règle côté base, où elle ne se contourne pas.
-- ═══════════════════════════════════════════════════════════════════════════


-- ── 1. La colonne ──────────────────────────────────────────────────────────
ALTER TABLE public.bilans
  ADD COLUMN IF NOT EXISTS date_naissance date;

COMMENT ON COLUMN public.bilans.date_naissance IS
  'Date de naissance du patient. Source de vérité pour l''âge, qui en est dérivé.';


-- ── 2. Garde-fou : 16 ans minimum, date plausible ──────────────────────────
-- NULL reste accepté : les bilans enregistrés avant cette migration n'ont
-- pas de date, et on ne veut pas rendre les anciennes lignes invalides.
ALTER TABLE public.bilans DROP CONSTRAINT IF EXISTS bilans_date_naissance_check;
ALTER TABLE public.bilans ADD CONSTRAINT bilans_date_naissance_check
  CHECK (
    date_naissance IS NULL
    OR (
      date_naissance <= (CURRENT_DATE - INTERVAL '16 years')
      AND date_naissance >= (CURRENT_DATE - INTERVAL '120 years')
    )
  );


-- ── 3. Âge courant, via une vue ────────────────────────────────────────────
-- Une colonne générée était le premier réflexe, mais Postgres la refuse :
-- « generation expression is not immutable ». L'âge dépend de la date du
-- jour, donc d'une valeur qui change — une colonne stockée ne peut pas s'y
-- fier. Une vue, elle, est évaluée à chaque lecture : c'est l'outil correct.
--
-- La colonne `age` existante reste l'âge AU MOMENT DU BILAN, ce qui est
-- l'information juste pour un bilan daté. La vue donne l'âge d'aujourd'hui.
CREATE OR REPLACE VIEW public.v_bilans_age AS
SELECT
  b.*,
  CASE
    WHEN b.date_naissance IS NULL THEN b.age
    ELSE date_part('year', age(b.date_naissance))::int
  END AS age_courant
FROM public.bilans b;

COMMENT ON VIEW public.v_bilans_age IS
  'Bilans avec age_courant recalcule a la lecture depuis date_naissance.';


-- ── 4. Vérification ────────────────────────────────────────────────────────
SELECT column_name, data_type, is_generated
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'bilans'
  AND column_name IN ('age', 'date_naissance')
ORDER BY column_name;
