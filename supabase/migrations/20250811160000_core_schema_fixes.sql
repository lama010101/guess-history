-- Core schema fixes for Guess History
-- Ensure required tables/columns and RLS policies exist for auth, profiles, avatars, metrics, and settings

-- Extensions (uuid_generate_v4 used in several places)
create extension if not exists "uuid-ossp";

-- PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Columns used by the app
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists avatar_name text;
alter table public.profiles add column if not exists avatar_image_url text;
alter table public.profiles add column if not exists avatar_id uuid;
alter table public.profiles add column if not exists is_guest boolean default false not null;
alter table public.profiles add column if not exists earned_badges uuid[] default '{}';

-- RLS
alter table public.profiles enable row level security;

-- Policies (id-bound)
-- Select own profile
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_select_own'
  ) then
    create policy profiles_select_own on public.profiles
      for select to authenticated
      using (auth.uid() = id);
  end if;
end $$;

-- Insert own profile
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_insert_own'
  ) then
    create policy profiles_insert_own on public.profiles
      for insert to authenticated
      with check (auth.uid() = id);
  end if;
end $$;

-- Update own profile
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_update_own'
  ) then
    create policy profiles_update_own on public.profiles
      for update to authenticated
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;
end $$;

-- AVATARS TABLE
create table if not exists public.avatars (
  id uuid primary key default uuid_generate_v4(),
  first_name text not null,
  last_name text not null,
  description text,
  birth_day text,
  birth_city text,
  birth_country text,
  death_day text,
  death_city text,
  death_country text,
  firebase_url text not null,
  ready boolean default true,
  created_at timestamptz default now()
);

alter table public.avatars enable row level security;

-- Allow reading by both anon and authenticated (catalog data)
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'avatars' and policyname = 'avatars_select_anon'
  ) then
    create policy avatars_select_anon on public.avatars
      for select to anon using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'avatars' and policyname = 'avatars_select_auth'
  ) then
    create policy avatars_select_auth on public.avatars
      for select to authenticated using (true);
  end if;
end $$;

-- USER METRICS TABLE
create table if not exists public.user_metrics (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  xp_total integer not null default 0,
  overall_accuracy numeric(5,2) not null default 0,
  games_played integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  best_accuracy numeric(5,2),
  perfect_games integer default 0,
  global_rank integer,
  time_accuracy numeric(5,2) default 0,
  location_accuracy numeric(5,2) default 0,
  challenge_accuracy numeric(5,2) default 0,
  year_bullseye integer default 0,
  location_bullseye integer default 0
);

create unique index if not exists user_metrics_user_id_idx on public.user_metrics(user_id);

alter table public.user_metrics enable row level security;

-- Policies (user_id-bound)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_metrics' AND policyname = 'user_metrics_select_own'
  ) THEN
    CREATE POLICY user_metrics_select_own ON public.user_metrics
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_metrics' AND policyname = 'user_metrics_insert_own'
  ) THEN
    CREATE POLICY user_metrics_insert_own ON public.user_metrics
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_metrics' AND policyname = 'user_metrics_update_own'
  ) THEN
    CREATE POLICY user_metrics_update_own ON public.user_metrics
      FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- SETTINGS TABLE (JSONB keyed by user id)
create table if not exists public.settings (
  id uuid primary key references auth.users(id) on delete cascade,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table public.settings enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'settings' AND policyname = 'settings_select_own'
  ) THEN
    CREATE POLICY settings_select_own ON public.settings
      FOR SELECT TO authenticated
      USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'settings' AND policyname = 'settings_insert_own'
  ) THEN
    CREATE POLICY settings_insert_own ON public.settings
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'settings' AND policyname = 'settings_update_own'
  ) THEN
    CREATE POLICY settings_update_own ON public.settings
      FOR UPDATE TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;
