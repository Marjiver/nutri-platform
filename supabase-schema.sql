-- ============================================================
-- NutriPlan — Schema Supabase
-- Copiez ce fichier dans l'éditeur SQL de votre projet Supabase
-- ============================================================

-- 1. TABLE PROFILES (étend auth.users)
create table if not exists profiles (
  id           uuid references auth.users on delete cascade primary key,
  role         text not null check (role in ('patient','dietitian','prescriber')),
  prenom       text,
  nom          text,
  tel          text,
  site_web     text,
  cabinet      text,
  rpps         text,
  specialite   text,
  adeli        text,
  formule      text,
  profession   text,
  credits      int default 0,
  objectifs_autorises text[],
  statut_rpps  text default 'en_attente',
  created_at   timestamptz default now()
);
alter table profiles enable row level security;
create policy "user voit son profil" on profiles
  for all using (auth.uid() = id);

-- 2. TABLE BILANS
create table if not exists bilans (
  id          uuid default gen_random_uuid() primary key,
  patient_id  uuid references auth.users on delete cascade,
  prenom      text, age int, poids numeric, taille numeric,
  objectif    text, activite text, regime text,
  allergies   text, redflags text[] default '{}',
  statut      text default 'en_attente',
  paiement    text,
  created_at  timestamptz default now()
);
alter table bilans enable row level security;
create policy "patient voit son bilan" on bilans
  for all using (auth.uid() = patient_id);
create policy "diet voit tous les bilans" on bilans
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'dietitian')
  );

-- 3. TABLE PLANS
create table if not exists plans (
  id            uuid default gen_random_uuid() primary key,
  patient_id    uuid references auth.users,
  dietitian_id  uuid references auth.users,
  contenu       jsonb,
  statut        text default 'en_attente',
  valide_at     timestamptz,
  created_at    timestamptz default now()
);
alter table plans enable row level security;
create policy "patient voit son plan" on plans
  for select using (auth.uid() = patient_id);
create policy "diet gère ses plans" on plans
  for all using (auth.uid() = dietitian_id);

-- 4. TABLE ALERTES (red flags)
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
create policy "diet voit les alertes" on alertes
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'dietitian')
  );

-- 5. TABLE CLIENTS PRESCRIPTEUR (CRM)
create table if not exists clients_prescripteur (
  id                uuid default gen_random_uuid() primary key,
  prescripteur_id   uuid references auth.users on delete cascade,
  prenom            text, nom text, age int,
  poids_initial     numeric, taille numeric,
  objectif          text,
  statut            text default 'en_cours',
  notes             text,
  photo_face        text,
  photo_gauche      text,
  photo_droit       text,
  photo_dos         text,
  mesures           jsonb default '[]',
  plans             jsonb default '[]',
  rappel_date       timestamptz,
  rappel_delai      int default 30,
  created_at        timestamptz default now()
);
alter table clients_prescripteur enable row level security;
create policy "prescripteur voit ses clients" on clients_prescripteur
  for all using (auth.uid() = prescripteur_id);

-- 6. TABLE DEMANDES DE PLANS (prescripteur → diét)
create table if not exists demandes_plans (
  id                uuid default gen_random_uuid() primary key,
  client_id         uuid references clients_prescripteur,
  prescripteur_id   uuid references auth.users,
  objectif          text,
  notes             text,
  statut            text default 'en_attente',
  created_at        timestamptz default now()
);
alter table demandes_plans enable row level security;
create policy "prescripteur voit ses demandes" on demandes_plans
  for all using (auth.uid() = prescripteur_id);
create policy "diet voit les demandes" on demandes_plans
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'dietitian')
  );

-- 7. TRIGGER auto-profil à l'inscription
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, role, prenom, nom)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'patient'),
    new.raw_user_meta_data->>'prenom',
    new.raw_user_meta_data->>'nom'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
