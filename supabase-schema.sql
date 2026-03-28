-- ============================================================
-- NutriDoc — Schéma v31 FINAL
-- Les DROP POLICY sont dans des blocs DO pour éviter l'erreur
-- si la table n'existe pas encore
-- ============================================================

-- Suppression sécurisée des policies existantes
DO $$ BEGIN
  -- profiles
  DROP POLICY IF EXISTS "user voit son profil" ON profiles;
  DROP POLICY IF EXISTS "diet voit tous les profils patients" ON profiles;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "patient voit son bilan" ON bilans;
  DROP POLICY IF EXISTS "diet voit tous les bilans" ON bilans;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "patient voit son plan" ON plans;
  DROP POLICY IF EXISTS "diet gère ses plans" ON plans;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "patient voit ses visios" ON visios;
  DROP POLICY IF EXISTS "diet gère ses visios" ON visios;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "diet voit les alertes" ON alertes;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "patient voit sa demande" ON queue_plans;
  DROP POLICY IF EXISTS "patient crée une demande" ON queue_plans;
  DROP POLICY IF EXISTS "diet voit les demandes" ON queue_plans;
  DROP POLICY IF EXISTS "diet accepte une demande" ON queue_plans;
  DROP POLICY IF EXISTS "diet met à jour demande" ON queue_plans;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "prescripteur voit ses clients" ON clients_prescripteur;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "prescripteur voit ses demandes" ON demandes_plans;
  DROP POLICY IF EXISTS "diet voit les demandes pro" ON demandes_plans;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "prescripteur voit ses factures" ON factures_prescripteur;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "user voit ses tickets" ON support_tickets;
  DROP POLICY IF EXISTS "user crée un ticket" ON support_tickets;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "user gère son consentement" ON cookie_consents;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ── 1. PROFILES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                  uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  role                text NOT NULL CHECK (role IN ('patient','dietitian','prescriber')),
  prenom              text,
  nom                 text,
  email               text,
  tel                 text,
  ville               text,
  site_web            text,
  cabinet             text,
  rpps                text,
  specialite          text,
  adeli               text,
  iban                text,
  bic                 text,
  titulaire_compte    text,
  formule             text DEFAULT 'essentiel',
  statut_rpps         text DEFAULT 'en_attente',
  commission_plan     int  DEFAULT 16,
  commission_visio    int  DEFAULT 4900,
  profession          text,
  siret               text,
  credits             int  DEFAULT 0,
  credits_parrainage  int  DEFAULT 0,
  code_parrainage     text UNIQUE,
  parrain_id          uuid REFERENCES auth.users,
  pack                text,
  mode_pilote         boolean DEFAULT false,
  objectifs_autorises text[],
  statut              text DEFAULT 'actif',
  avatar_url          text,
  notes               text,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user voit son profil" ON profiles
  FOR ALL USING (auth.uid() = id);

-- ── 2. BILANS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bilans (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id     uuid REFERENCES auth.users ON DELETE CASCADE,
  prenom         text, nom text, age int, sexe text, ville text,
  poids          numeric, taille numeric, poids_objectif numeric,
  objectif       text, activite text, regime text,
  allergies      text, aversions text, budget text,
  alertes_sante  text[] DEFAULT '{}',
  travail        text, sport text, sport_freq int, sport_duree int,
  sommeil        text, tabagisme text, hydratation text,
  fringales      text, temps_repas text,
  repas_matin    text, repas_midi text, repas_soir text,
  statut         text DEFAULT 'en_attente',
  paiement       text DEFAULT 'gratuit',
  paid_at        timestamptz, stripe_id text, montant int,
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE bilans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patient voit son bilan" ON bilans
  FOR ALL USING (auth.uid() = patient_id);
CREATE POLICY "diet voit tous les bilans" ON bilans
  FOR SELECT USING (auth.uid() = patient_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'dietitian'));

-- ── 3. PLANS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plans (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id    uuid REFERENCES auth.users,
  dietitian_id  uuid REFERENCES auth.users,
  bilan_id      uuid REFERENCES bilans(id),
  contenu       jsonb DEFAULT '{}',
  statut        text DEFAULT 'en_attente'
                CHECK (statut IN ('en_attente','paid','in_progress','valide','livre','expire')),
  paid_at       timestamptz, valide_at timestamptz, livre_at timestamptz,
  stripe_id     text, montant int DEFAULT 2490, pdf_url text,
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patient voit son plan" ON plans
  FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "diet gère ses plans" ON plans
  FOR ALL USING (auth.uid() = dietitian_id);

-- ── 4. VISIOS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visios (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id      uuid REFERENCES auth.users,
  dietitian_id    uuid REFERENCES auth.users,
  slot_key        text,
  statut          text DEFAULT 'en_attente'
                  CHECK (statut IN ('en_attente','confirmee','annulee','terminee')),
  montant         int DEFAULT 5500,
  reversement     int DEFAULT 4900,
  stripe_id       text, confirmed_at timestamptz,
  lien_visio      text, attestation_url text,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE visios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patient voit ses visios" ON visios
  FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "diet gère ses visios" ON visios
  FOR ALL USING (auth.uid() = dietitian_id);

-- ── 5. ALERTES SANTÉ (ex red flags) ─────────────────────────
CREATE TABLE IF NOT EXISTS alertes (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type            text DEFAULT 'alerte_sante',
  patient_id      uuid REFERENCES auth.users,
  patient_prenom  text,
  flags           text[],
  lu              boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE alertes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "diet voit les alertes" ON alertes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'dietitian')
  );

-- ── 6. FILE D'ATTENTE ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS queue_plans (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id      uuid REFERENCES auth.users,
  patient_prenom  text, ville text, objectif text,
  bilan_id        uuid REFERENCES bilans(id),
  type            text DEFAULT 'plan',
  statut          text DEFAULT 'pending'
                  CHECK (statut IN ('pending','accepted','in_progress','delivered','expired','cancelled')),
  priorite        int DEFAULT 1, tentatives int DEFAULT 0,
  dietitian_id    uuid REFERENCES auth.users,
  accepted_at     timestamptz, delivered_at timestamptz,
  expires_at      timestamptz DEFAULT (now() + INTERVAL '48 hours'),
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_queue_statut  ON queue_plans(statut);
CREATE INDEX IF NOT EXISTS idx_queue_ville   ON queue_plans(ville);
CREATE INDEX IF NOT EXISTS idx_queue_created ON queue_plans(created_at);
ALTER TABLE queue_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patient voit sa demande"  ON queue_plans
  FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "patient crée une demande" ON queue_plans
  FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "diet voit les demandes"   ON queue_plans
  FOR SELECT USING (auth.uid() = dietitian_id OR dietitian_id IS NULL);
CREATE POLICY "diet met à jour demande"  ON queue_plans
  FOR UPDATE USING (auth.uid() = dietitian_id OR dietitian_id IS NULL);

CREATE OR REPLACE VIEW queue_metrics AS
SELECT
  count(*) FILTER (WHERE statut = 'pending')   AS pending_count,
  count(*) FILTER (WHERE statut = 'accepted')  AS accepted_count,
  count(*) FILTER (WHERE statut = 'delivered') AS delivered_count,
  count(*) FILTER (WHERE statut = 'expired')   AS expired_count,
  round(avg(EXTRACT(EPOCH FROM (delivered_at - created_at))/3600)
    FILTER (WHERE statut = 'delivered'), 1)    AS avg_delay_hours,
  count(*) FILTER (WHERE statut = 'pending'
    AND created_at < now() - INTERVAL '4 hours') AS overdue_count
FROM queue_plans
WHERE created_at > now() - INTERVAL '7 days';

-- ── 7. CRM PRESCRIPTEURS (sans photos) ──────────────────────
CREATE TABLE IF NOT EXISTS clients_prescripteur (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  prescripteur_id   uuid REFERENCES auth.users ON DELETE CASCADE,
  prenom text, nom text, age int,
  poids_initial numeric, taille numeric, objectif text,
  statut text DEFAULT 'en_cours', notes text,
  mesures jsonb DEFAULT '[]', plans jsonb DEFAULT '[]',
  rappel_date timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE clients_prescripteur ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prescripteur voit ses clients" ON clients_prescripteur
  FOR ALL USING (auth.uid() = prescripteur_id);

-- ── 8. DEMANDES PLANS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS demandes_plans (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id         uuid REFERENCES clients_prescripteur,
  prescripteur_id   uuid REFERENCES auth.users,
  objectif text, notes text, credits_utilises int DEFAULT 1,
  statut text DEFAULT 'en_attente',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE demandes_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prescripteur voit ses demandes" ON demandes_plans
  FOR ALL USING (auth.uid() = prescripteur_id);
CREATE POLICY "diet voit les demandes pro" ON demandes_plans
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'dietitian')
  );

-- ── 9. FACTURES PRESCRIPTEUR ─────────────────────────────────
CREATE TABLE IF NOT EXISTS factures_prescripteur (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  prescriber_id   uuid REFERENCES auth.users,
  numero text UNIQUE, pack text, credits int,
  montant_ht int, montant_ttc int, stripe_id text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE factures_prescripteur ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prescripteur voit ses factures" ON factures_prescripteur
  FOR SELECT USING (auth.uid() = prescriber_id);

-- ── 10. TICKETS SUPPORT ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  user_role text, user_nom text, user_email text,
  categorie text NOT NULL, titre text NOT NULL, description text NOT NULL,
  priorite text DEFAULT 'normale' CHECK (priorite IN ('basse','normale','haute','urgente')),
  statut   text DEFAULT 'ouvert'  CHECK (statut  IN ('ouvert','en_cours','resolu','ferme')),
  reponse text, repondu_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user voit ses tickets" ON support_tickets
  FOR ALL USING (auth.uid() = user_id);

-- ── 11. COOKIE CONSENTS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS cookie_consents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  essential boolean DEFAULT true, analytics boolean DEFAULT false,
  version text DEFAULT '1.0',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE cookie_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user gère son consentement" ON cookie_consents
  FOR ALL USING (auth.uid() = user_id);

-- ── 12. PARRAINAGES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parrainages (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  parrain_id      uuid REFERENCES auth.users,
  filleul_id      uuid REFERENCES auth.users,
  type_filleul    text CHECK (type_filleul IN ('patient','dietitian','prescriber')),
  credits_offerts int DEFAULT 5,
  statut          text DEFAULT 'en_attente' CHECK (statut IN ('en_attente','valide','expire')),
  valide_at       timestamptz,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE parrainages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user voit ses parrainages" ON parrainages
  FOR SELECT USING (auth.uid() = parrain_id OR auth.uid() = filleul_id);

-- ── 13. EMAIL TEMPLATES (admin) ──────────────────────────────
CREATE TABLE IF NOT EXISTS email_templates (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug        text UNIQUE NOT NULL,
  nom         text NOT NULL,
  sujet       text NOT NULL,
  corps_html  text NOT NULL,
  actif       boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- ── 14. TRIGGERS ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, role, prenom, nom, email, code_parrainage)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'patient'),
    NEW.raw_user_meta_data->>'prenom',
    NEW.raw_user_meta_data->>'nom',
    NEW.email,
    UPPER(SUBSTRING(MD5(NEW.id::text), 1, 8))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- ============================================================
-- FIN — 13 tables · 1 vue · 2 triggers · RLS partout
-- ============================================================

-- ── Colonnes abonnement patient (à ajouter si schéma déjà déployé) ──
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS niveau_abo  text DEFAULT 'gratuit';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS abo_debut   timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS abo_fin     timestamptz;
