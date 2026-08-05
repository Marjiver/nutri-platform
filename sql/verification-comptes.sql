-- ═══════════════════════════════════════════════════════════════
--  NutriDoc — Vérification des comptes professionnels
--  À exécuter une fois dans Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════

-- Diététiciens : résultat de la vérification RPPS automatique
alter table profiles add column if not exists rpps_nom_officiel text;
-- valeurs de statut_rpps : 'en_attente' | 'verifie_auto' | 'verifie_manuel' | 'refuse'

-- Prescripteurs : résultat de la vérification SIRET automatique
alter table profiles add column if not exists siret_verifie boolean default false;
alter table profiles add column if not exists entreprise_officielle text;

-- Contrôle Stripe : le nom du compte Stripe / RIB doit correspondre
-- au nom officiel RPPS avant tout versement (activé au branchement Stripe)
alter table profiles add column if not exists stripe_nom_match boolean;
alter table profiles add column if not exists stripe_account_id text;

comment on column profiles.rpps_nom_officiel is 'Nom officiel retourné par l''Annuaire Santé ANS';
comment on column profiles.stripe_nom_match is 'true si nom Stripe/RIB = nom RPPS officiel — requis avant versements';
