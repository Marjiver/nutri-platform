-- ============================================================
-- NutriDoc — Schéma Supabase COMPLET v31
-- VERSION IDEMPOTENTE — peut être exécuté plusieurs fois
-- ============================================================

-- ── 1. PROFILES ─────────────────────────────────────────────
create table if not exists profiles (
  id                  uuid references auth.users on delete cascade primary key,
  role                text not null check (role in ('patient','dietitian','prescriber')),
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
  formule             text default 'essentiel',
  statut_rpps         text default 'en_attente',
  profession          text,
  siret               text,
  credits             int  default 0,
  pack                text,
  objectifs_autorises text[],
  statut              text default 'actif',
  avatar_url          text,
  notes               text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);
alter table profiles enable row level security;
drop policy if exists "user voit son profil" on profiles;
create policy "user voit son profil" on profiles
  for all using (auth.uid() = id);
drop policy if exists "diet voit tous les profils patients" on profiles;
create policy "diet voit tous les profils patients" on profiles
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'dietitian')
  );

-- ── 2. BILANS ────────────────────────────────────────────────
create table if not exists bilans (
  id             uuid default gen_random_uuid() primary key,
  patient_id     uuid references auth.users on delete cascade,
  prenom         text, nom text, age int, sexe text, ville text,
  poids          numeric, taille numeric, poids_objectif numeric,
  objectif       text, activite text, regime text,
  allergies      text, aversions text, budget text,
  redflags       text[] default '{}',
  travail        text, sport text, sport_freq int, sport_duree int,
  sommeil        text, tabagisme text, hydratation text,
  fringales      text, temps_repas text,
  repas_matin    text, repas_midi text, repas_soir text,
  statut         text default 'en_attente',
  paiement       text default 'gratuit',
  paid_at        timestamptz,
  stripe_id      text,
  montant        int,
  created_at     timestamptz default now()
);
alter table bilans enable row level security;
drop policy if exists "patient voit son bilan" on bilans;
create policy "patient voit son bilan" on bilans
  for all using (auth.uid() = patient_id);
drop policy if exists "diet voit tous les bilans" on bilans;
create policy "diet voit tous les bilans" on bilans
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'dietitian')
  );

-- ── 3. PLANS ─────────────────────────────────────────────────
create table if not exists plans (
  id            uuid default gen_random_uuid() primary key,
  patient_id    uuid references auth.users,
  dietitian_id  uuid references auth.users,
  bilan_id      uuid references bilans(id),
  contenu       jsonb default '{}',
  statut        text default 'en_attente'
                check (statut in ('en_attente','paid','in_progress','valide','livre','expire')),
  paid_at       timestamptz,
  valide_at     timestamptz,
  livre_at      timestamptz,
  stripe_id     text,
  montant       int default 2490,
  pdf_url       text,
  created_at    timestamptz default now()
);
alter table plans enable row level security;
drop policy if exists "patient voit son plan" on plans;
create policy "patient voit son plan" on plans
  for select using (auth.uid() = patient_id);
drop policy if exists "diet gère ses plans" on plans;
create policy "diet gère ses plans" on plans
  for all using (auth.uid() = dietitian_id);

-- ── 4. VISIOS ────────────────────────────────────────────────
create table if not exists visios (
  id              uuid default gen_random_uuid() primary key,
  patient_id      uuid references auth.users,
  dietitian_id    uuid references auth.users,
  slot_key        text,
  statut          text default 'en_attente'
                  check (statut in ('en_attente','confirmee','annulee','terminee')),
  montant         int default 5500,
  reversement     int default 4900,
  stripe_id       text,
  confirmed_at    timestamptz,
  lien_visio      text,
  attestation_url text,
  created_at      timestamptz default now()
);
alter table visios enable row level security;
drop policy if exists "patient voit ses visios" on visios;
create policy "patient voit ses visios" on visios
  for select using (auth.uid() = patient_id);
drop policy if exists "diet gère ses visios" on visios;
create policy "diet gère ses visios" on visios
  for all using (auth.uid() = dietitian_id);

-- ── 5. ALERTES ───────────────────────────────────────────────
create table if not exists alertes (
  id              uuid default gen_random_uuid() primary key,
  type            text default 'redflag',
  patient_id      uuid references auth.users,
  patient_prenom  text,
  flags           text[],
  lu              boolean default false,
  created_at      timestamptz default now()
);
alter table alertes enable row level security;
drop policy if exists "diet voit les alertes" on alertes;
create policy "diet voit les alertes" on alertes
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'dietitian')
  );

-- ── 6. FILE D'ATTENTE ────────────────────────────────────────
create table if not exists queue_plans (
  id              uuid default gen_random_uuid() primary key,
  patient_id      uuid references auth.users,
  patient_prenom  text,
  ville           text,
  objectif        text,
  bilan_id        uuid references bilans(id),
  type            text default 'plan',
  statut          text default 'pending'
                  check (statut in ('pending','accepted','in_progress','delivered','expired','cancelled')),
  priorite        int  default 1,
  tentatives      int  default 0,
  dietitian_id    uuid references auth.users,
  accepted_at     timestamptz,
  delivered_at    timestamptz,
  expires_at      timestamptz default (now() + interval '48 hours'),
  created_at      timestamptz default now()
);
create index if not exists idx_queue_statut  on queue_plans(statut);
create index if not exists idx_queue_ville   on queue_plans(ville);
create index if not exists idx_queue_created on queue_plans(created_at);
alter table queue_plans enable row level security;
drop policy if exists "patient voit sa demande"  on queue_plans;
drop policy if exists "patient crée une demande" on queue_plans;
drop policy if exists "diet voit les demandes"   on queue_plans;
drop policy if exists "diet met à jour demande"  on queue_plans;
create policy "patient voit sa demande"  on queue_plans for select using (auth.uid() = patient_id);
create policy "patient crée une demande" on queue_plans for insert with check (auth.uid() = patient_id);
create policy "diet voit les demandes"   on queue_plans for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'dietitian'));
create policy "diet met à jour demande"  on queue_plans for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'dietitian'));

create or replace view queue_metrics as
select
  count(*) filter (where statut = 'pending')    as pending_count,
  count(*) filter (where statut = 'accepted')   as accepted_count,
  count(*) filter (where statut = 'delivered')  as delivered_count,
  count(*) filter (where statut = 'expired')    as expired_count,
  round(avg(extract(epoch from (delivered_at - created_at))/3600)
    filter (where statut = 'delivered'), 1)     as avg_delay_hours,
  count(*) filter (where statut = 'pending'
    and created_at < now() - interval '4 hours') as overdue_count
from queue_plans
where created_at > now() - interval '7 days';

-- ── 7. CRM PRESCRIPTEURS ─────────────────────────────────────
create table if not exists clients_prescripteur (
  id                uuid default gen_random_uuid() primary key,
  prescripteur_id   uuid references auth.users on delete cascade,
  prenom text, nom text, age int,
  poids_initial numeric, taille numeric,
  objectif text, statut text default 'en_cours',
  notes text, mesures jsonb default '[]', plans jsonb default '[]',
  rappel_date timestamptz,
  created_at timestamptz default now()
);
alter table clients_prescripteur enable row level security;
drop policy if exists "prescripteur voit ses clients" on clients_prescripteur;
create policy "prescripteur voit ses clients" on clients_prescripteur
  for all using (auth.uid() = prescripteur_id);

-- ── 8. DEMANDES PLANS ────────────────────────────────────────
create table if not exists demandes_plans (
  id                uuid default gen_random_uuid() primary key,
  client_id         uuid references clients_prescripteur,
  prescripteur_id   uuid references auth.users,
  objectif text, notes text,
  credits_utilises  int default 1,
  statut            text default 'en_attente',
  created_at        timestamptz default now()
);
alter table demandes_plans enable row level security;
drop policy if exists "prescripteur voit ses demandes" on demandes_plans;
drop policy if exists "diet voit les demandes pro"     on demandes_plans;
create policy "prescripteur voit ses demandes" on demandes_plans
  for all using (auth.uid() = prescripteur_id);
create policy "diet voit les demandes pro" on demandes_plans
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'dietitian')
  );

-- ── 9. FACTURES PRESCRIPTEUR ─────────────────────────────────
create table if not exists factures_prescripteur (
  id              uuid default gen_random_uuid() primary key,
  prescriber_id   uuid references auth.users,
  numero          text unique,
  pack            text,
  credits         int,
  montant_ht      int,
  montant_ttc     int,
  stripe_id       text,
  created_at      timestamptz default now()
);
alter table factures_prescripteur enable row level security;
drop policy if exists "prescripteur voit ses factures" on factures_prescripteur;
create policy "prescripteur voit ses factures" on factures_prescripteur
  for select using (auth.uid() = prescriber_id);

-- ── 10. TICKETS SUPPORT ──────────────────────────────────────
create table if not exists support_tickets (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users,
  user_role   text, user_nom text, user_email text,
  categorie   text not null,
  titre       text not null,
  description text not null,
  priorite    text default 'normale' check (priorite in ('basse','normale','haute','urgente')),
  statut      text default 'ouvert'  check (statut  in ('ouvert','en_cours','resolu','ferme')),
  reponse     text,
  repondu_at  timestamptz,
  created_at  timestamptz default now()
);
alter table support_tickets enable row level security;
drop policy if exists "user voit ses tickets" on support_tickets;
create policy "user voit ses tickets" on support_tickets
  for all using (auth.uid() = user_id);

-- ── 11. COOKIE CONSENTS ──────────────────────────────────────
create table if not exists cookie_consents (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users,
  essential   boolean default true,
  analytics   boolean default false,
  version     text default '1.0',
  created_at  timestamptz default now()
);
alter table cookie_consents enable row level security;
drop policy if exists "user gère son consentement" on cookie_consents;
create policy "user gère son consentement" on cookie_consents
  for all using (auth.uid() = user_id);

-- ── 12. TRIGGER auto-profil ──────────────────────────────────
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, role, prenom, nom, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'patient'),
    new.raw_user_meta_data->>'prenom',
    new.raw_user_meta_data->>'nom',
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ── 13. TRIGGER updated_at ───────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists profiles_updated_at on profiles;
create trigger profiles_updated_at
  before update on profiles
  for each row execute procedure update_updated_at();

-- Fin — 11 tables · RLS activé · triggers actifs
